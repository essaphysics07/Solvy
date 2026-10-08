import type { ProblemRepresentation } from "./problem.ts";

export interface RouteDecision {
  status: "matched" | "unsupported";
  pattern?: string;
  reason?: string;
}

export function routeProblem(
  problem: ProblemRepresentation,
): RouteDecision {
  if (!problem.pattern) {
    return {
      status: "unsupported",
      reason: "The problem does not contain a recognized solving pattern.",
    };
  }

  return {
    status: "matched",
    pattern: problem.pattern,
  };
}