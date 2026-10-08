import "server-only";
import { GeminiProvider } from "../ai/gemini-provider.ts";
import { BundledKnowledgeRepository } from "../knowledge/repository.ts";
import { SupabaseSolutionRepository } from "../persistence/solutions.ts";
import { solve } from "./orchestrator.ts";
import type { SolveInput } from "./input.ts";
/** Composition root: swap adapters here without changing orchestration, UI, or computation. */
export function solveProblem(input: SolveInput, signal?: AbortSignal) {
  return solve(input, {
    provider: new GeminiProvider(), knowledge: new BundledKnowledgeRepository(), persistence: new SupabaseSolutionRepository(),
    onPersistence: outcome => { if (outcome === "failed") console.warn("solvy.persistence.failed"); },
  }, signal);
}
