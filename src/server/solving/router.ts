import type { KnowledgeBundle } from "../knowledge/schema.ts";
import type { ProblemRepresentation } from "./problem.ts";

export interface RouteDecision {
  status: "matched" | "unsupported";
  pattern?: string;
  reason?: string;
}

export function routeProblem(
  problem: ProblemRepresentation,
  knowledge: KnowledgeBundle,
): RouteDecision {
  const candidates = knowledge.patterns.filter(
    pattern => pattern.concept === problem.concept,
  );

  if (candidates.length === 0) {
    return {
      status: "unsupported",
      reason: `No knowledge pattern exists for concept "${problem.concept}".`,
    };
  }

  /*
   * The understanding layer currently produces a concrete pattern
   * for the deterministic grammar. The router validates that proposed
   * pattern against the trusted knowledge bundle instead of duplicating
   * the parser's semantic analysis.
   *
   * Quantity-level matching will become stricter once the generic
   * ProblemRepresentation contains normalized quantities for all
   * supported mathematical structures.
   */
  const proposed = candidates.find(
    pattern => pattern.id === problem.pattern,
  );

  if (proposed) {
    return {
      status: "matched",
      pattern: proposed.id,
    };
  }

  if (candidates.length === 1) {
    return {
      status: "matched",
      pattern: candidates[0].id,
    };
  }

  return {
    status: "unsupported",
    reason:
      "Multiple knowledge patterns exist for this concept and the problem could not be uniquely routed.",
  };
}