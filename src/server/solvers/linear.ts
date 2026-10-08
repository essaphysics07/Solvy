import { affineBindings } from "../computation/affine-equation.ts";
import type { LinearProblem, LinearResult } from "./contracts.ts";
export function solveLinear(problem: LinearProblem): LinearResult {
  // Understanding owns semantic extraction; solving only classifies and isolates.
  const { coefficient, constant, rhs: rightConstant } = affineBindings(problem);
  const rhs = rightConstant.sub(constant);
  if (coefficient.zero) return { kind: "linear", classification: rhs.zero ? "infinite" : "none", coefficient, rhs };
  return { kind: "linear", classification: "unique", value: rhs.div(coefficient), coefficient, rhs };
}
