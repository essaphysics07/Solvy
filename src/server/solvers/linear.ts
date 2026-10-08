import { affine } from "../computation/expression.ts";
import type { LinearProblem, LinearResult } from "./contracts.ts";
export function solveLinear(problem: LinearProblem): LinearResult {
  const left = affine(problem.left), right = affine(problem.right);
  const coefficient = left.a.sub(right.a), rhs = right.b.sub(left.b);
  if (coefficient.zero) return { kind: "linear", classification: rhs.zero ? "infinite" : "none", coefficient, rhs };
  return { kind: "linear", classification: "unique", value: rhs.div(coefficient), coefficient, rhs };
}
