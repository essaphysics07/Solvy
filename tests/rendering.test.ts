import test from "node:test";
import assert from "node:assert/strict";
import katex from "katex";
import { solve } from "../src/server/solving/orchestrator.ts";
import { BundledKnowledgeRepository } from "../src/server/knowledge/repository.ts";
import type { AIProvider } from "../src/server/ai/provider.ts";
const provider: AIProvider = { id: "none", capabilities: { text: true, vision: true, audio: false, structuredOutput: true }, generate: async () => { throw new Error("No provider expected"); } };
for (const [text, subject] of [
  ["A 500 g object accelerates at 200 cm/s². Find the force.", "physics"],
  ["A 5 kg object accelerates at -4 m/s². Find the force.", "physics"],
  ["3x+1=2", "mathematics"], ["0x=5", "mathematics"], ["0x=0", "mathematics"],
] as const) test(`KaTeX strictly renders deterministic expressions: ${text}`, async () => {
  const solution = await solve({ problem: text, subject, explanationLevel: "deep-dive" }, { provider, knowledge: new BundledKnowledgeRepository(), persistence: { save: async () => "skipped" } });
  for (const step of solution.steps) if (step.expression) {
    assert.match(katex.renderToString(step.expression, { throwOnError: true, trust: false }), /class="katex"/);
  }
});
