import test from "node:test";
import assert from "node:assert/strict";
import { solve } from "../src/server/solving/orchestrator.ts";
import { BundledKnowledgeRepository } from "../src/server/knowledge/repository.ts";
import type { AIProvider } from "../src/server/ai/provider.ts";
import type { SaveSolution, SolutionRepository } from "../src/server/persistence/solutions.ts";
import type { Subject, ExplanationLevel } from "../src/shared/contracts/solution.ts";
import { understand } from "../src/server/solving/understand.ts";
const knowledge = new BundledKnowledgeRepository();
const noProvider: AIProvider = { id: "test", capabilities: { text: true, vision: true, audio: false, structuredOutput: true }, generate: async () => { throw new Error("Provider must not be called"); } };
const persistence: SolutionRepository = { save: async () => "saved" };
for (const [text, subject, answer] of [
  ["A 5 kg object accelerates at 4 m/s². Find the force.", "physics", "20 N"],
  ["2x+6=14", "mathematics", "x = 4"],
  ["0x=5", "mathematics", "No solution"],
] as const) test(`complete deterministic vertical slice: ${text}`, async () => {
  let saved: SaveSolution | undefined;
  const result = await solve({ problem: text, subject, explanationLevel: "step-by-step" }, { provider: noProvider, knowledge, persistence: { save: async value => { saved = value; return "saved"; } } });
  assert.equal(result.answer, answer);
  assert.equal(result.verification?.status, "VERIFIED_WITHIN_SCOPE");
  assert.equal(result.provenance?.engine, "deterministic");
  assert.equal(saved?.solution.id, result.id);
});
for (const level of ["simple", "step-by-step", "deep-dive"] as ExplanationLevel[]) test(`explanation level ${level} cannot change result`, async () => {
  const result = await solve({ problem: "A 500 g object accelerates at 200 cm/s². Find the force.", subject: "physics", explanationLevel: level }, { provider: noProvider, knowledge, persistence });
  assert.equal(result.answer, "1 N");
  assert.equal(result.verification?.checks.find(c => c.checkerId === "explanation-consistency")?.status, "PASS");
});
test("unsupported math uses provider and is not marked verified", async () => {
  let called = false;
  const result = await solve({ problem: "Differentiate x^3", subject: "mathematics", explanationLevel: "simple" }, {
    knowledge, persistence, provider: { ...noProvider, generate: async request => {
      called = true; assert.equal(request.text, "Differentiate x^3");
      return { content: { title: "Derivative", steps: [{ title: "Power rule", explanation: "Differentiate." }], answer: "3x²" }, provider: "test", model: "test" };
    } },
  });
  assert.ok(called); assert.equal(result.verification?.status, "UNVERIFIED");
  assert.equal(result.provenance?.engine, "ai");
});
test("image is never silently discarded by deterministic routing", async () => {
  let image: unknown;
  await solve({ problem: "2x+6=14", subject: "mathematics", explanationLevel: "simple", image: { mimeType: "image/png", data: "abc" } }, {
    knowledge, persistence, provider: { ...noProvider, generate: async request => {
      image = request.image; return { content: { title: "Image", answer: "x=4", steps: [{ title: "Read", explanation: "Image context retained." }] }, provider: "test", model: "test" };
    } },
  });
  assert.deepEqual(image, { mimeType: "image/png", data: "abc" });
});
test("missing vision capability reports unsupported", async () => {
  await assert.rejects(solve({ problem: "2x=4", subject: "mathematics", explanationLevel: "simple", image: { mimeType: "image/png", data: "a" } }, {
    knowledge, persistence, provider: { ...noProvider, capabilities: { ...noProvider.capabilities, vision: false } },
  }), { code: "UNSUPPORTED" });
});
test("invalid deterministic input requests clarification without an AI call", async () => {
  await assert.rejects(solve({ problem: "x/0=1", subject: "mathematics", explanationLevel: "simple" }, { knowledge, persistence, provider: noProvider }), { code: "CLARIFICATION_REQUIRED" });
});
test("storage exception does not discard verified solution", async () => {
  let observed = "";
  const result = await solve({ problem: "2x=4", subject: "mathematics", explanationLevel: "simple" }, {
    knowledge, provider: noProvider, persistence: { save: async () => { throw new Error("Database offline"); } }, onPersistence: outcome => { observed = outcome; },
  });
  assert.equal(result.answer, "x = 2"); assert.equal(observed, "failed");
});
test("unsupported interpretation cannot ignore requested variable or ambiguous denominator", () => {
  for (const text of ["Solve for y: 2x=4", "x/2x=1", "x/2(3)=1"]) {
    assert.equal(understand({ problem: text, subject: "mathematics" as Subject, explanationLevel: "simple" }).status, "unsupported", text);
  }
});
