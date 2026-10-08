import test from "node:test";
import assert from "node:assert/strict";
import { GeminiProvider } from "../src/server/ai/gemini-provider.ts";
import { parseSolutionContent, parseSolveResponse } from "../src/shared/contracts/solution.ts";
import { SupabaseSolutionRepository } from "../src/server/persistence/solutions.ts";
import { readInput } from "../src/server/solving/input.ts";
const content = { title: "Solve", steps: [{ title: "Calculate", explanation: "Multiply.", expression: "5 \\times 4 = 20" }], answer: "20 N", note: "Net force" };
const request = { task: "solve" as const, instructions: "Explain", text: "Problem" };
test("Gemini sends structured text/image request and returns usage", async () => {
  const provider = new GeminiProvider({ transport: async parameters => {
    assert.equal(parameters.model, "primary");
    assert.equal(parameters.config?.responseMimeType, "application/json");
    assert.equal(parameters.config?.systemInstruction, "Explain");
    assert.ok(JSON.stringify(parameters.contents).includes("inlineData"));
    return { text: JSON.stringify(content), usageMetadata: { totalTokenCount: 42 } };
  }, models: ["primary"] });
  const result = await provider.generate({ ...request, image: { mimeType: "image/png", data: "abc" } });
  assert.deepEqual(result.content, content);
  assert.equal(result.usage?.totalTokens, 42);
});
test("retryable failure retries then uses fallback model", async () => {
  const calls: string[] = [];
  const provider = new GeminiProvider({ models: ["primary", "fallback"], retryDelayMs: 0, transport: async p => {
    calls.push(p.model);
    if (p.model === "primary") throw Object.assign(new Error("private error"), { status: 503 });
    return { text: JSON.stringify(content) };
  } });
  assert.equal((await provider.generate(request)).model, "fallback");
  assert.deepEqual(calls, ["primary", "primary", "fallback"]);
});
test("permanent auth error is sanitized and not retried", async () => {
  let count = 0;
  const provider = new GeminiProvider({ transport: async () => { count++; throw Object.assign(new Error("SECRET"), { status: 403 }); } });
  await assert.rejects(provider.generate(request), (error: unknown) => {
    assert.equal((error as {code: string}).code, "AI_AUTH");
    assert.ok(!(error as Error).message.includes("SECRET")); return true;
  });
  assert.equal(count, 1);
});
test("global deadline stops an unresponsive provider", async () => {
  const provider = new GeminiProvider({ totalTimeoutMs: 15, attemptTimeoutMs: 1000, transport: () => new Promise(() => {}) });
  await assert.rejects(provider.generate(request), { code: "SOLVE_TIMEOUT" });
});
test("parent cancellation is propagated", async () => {
  const controller = new AbortController(); controller.abort();
  const provider = new GeminiProvider({ transport: () => new Promise(() => {}) });
  await assert.rejects(provider.generate({ ...request, signal: controller.signal }), { code: "CANCELLED" });
});
for (const value of ["not JSON", JSON.stringify({ ...content, steps: [null] }), JSON.stringify({ ...content, note: 1 }), JSON.stringify({ ...content, steps: [] })]) {
  test(`malformed AI output fails safely: ${value.slice(0,35)}`, async () => {
    const provider = new GeminiProvider({ transport: async () => ({ text: value }) });
    await assert.rejects(provider.generate(request), { code: "AI_INVALID_OUTPUT" });
  });
}
test("unknown provider failure is sanitized", async () => {
  const provider = new GeminiProvider({ transport: async () => { throw new Error("private details"); } });
  await assert.rejects(provider.generate(request), { code: "AI_ERROR" });
});
test("model cannot inject verification or provenance", () => {
  const parsed = parseSolutionContent({ ...content, verification: { status: "VERIFIED_WITHIN_SCOPE" }, provenance: {} });
  assert.equal("verification" in parsed, false);
  assert.equal("provenance" in parsed, false);
  assert.equal(parseSolveResponse({ ok: true, solution: content }).ok, true);
  assert.throws(() => parseSolveResponse({ ok: true, solution: { ...content, verification: {} } }));
});
test("Supabase preserves existing column payload and string solution", async () => {
  const repository = new SupabaseSolutionRepository({ url: "https://example.invalid", key: "test", request: async (url, init) => {
    assert.equal(url, "https://example.invalid/rest/v1/solutions");
    const body = JSON.parse(String(init?.body));
    assert.deepEqual(Object.keys(body).sort(), ["problem", "solution", "subject"]);
    assert.equal(JSON.parse(body.solution).id, "id");
    return new Response(null, { status: 201 });
  } });
  assert.equal(await repository.save({ problem: "test", subject: "physics", solution: { id: "id", ...content } }), "saved");
});
test("Supabase failures do not throw", async () => {
  const repository = new SupabaseSolutionRepository({ url: "https://example.invalid", key: "test", request: async () => { throw new Error("offline"); } });
  assert.equal(await repository.save({ problem: "test", subject: "physics", solution: { id: "id", ...content } }), "failed");
});
test("multipart input preserves image and options; rejects forged MIME", async () => {
  const form = new FormData(); form.set("problem", ""); form.set("subject", "physics");
  form.set("image", new File([new Uint8Array([137,80,78,71,13,10,26,10])], "test.png", { type: "image/png" }));
  const result = await readInput(new Request("http://localhost/api/solve", { method: "POST", body: form }));
  assert.equal(result.image?.mimeType, "image/png");
  form.set("image", new File(["not image"], "test.png", { type: "image/png" }));
  await assert.rejects(readInput(new Request("http://localhost/api/solve", { method: "POST", body: form })), { code: "INVALID_IMAGE" });
});
test("attempt deadline aborts primary calls and preserves fallback", async () => {
  const calls: string[] = [];
  const provider = new GeminiProvider({ models: ["primary", "fallback"], attemptTimeoutMs: 5, totalTimeoutMs: 1000, retryDelayMs: 0,
    transport: async parameters => {
      calls.push(parameters.model);
      if (parameters.model === "fallback") return { text: JSON.stringify(content) };
      return new Promise((_, reject) => parameters.config?.abortSignal?.addEventListener("abort", () => reject(parameters.config?.abortSignal?.reason), { once: true }));
    },
  });
  assert.equal((await provider.generate(request)).model, "fallback");
  assert.deepEqual(calls, ["primary", "primary", "fallback"]);
});
test("all retryable failures are bounded to four calls", async () => {
  let count = 0;
  const provider = new GeminiProvider({ retryDelayMs: 0, transport: async () => { count++; throw Object.assign(new Error("busy"), { status: 429 }); } });
  await assert.rejects(provider.generate(request), { code: "AI_RATE_LIMIT" });
  assert.equal(count, 4);
});
