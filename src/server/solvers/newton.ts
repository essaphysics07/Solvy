import { Rational } from "../computation/rational.ts";
import { evaluate } from "../computation/expression.ts";
import type { KnowledgeBundle, Dimension } from "../knowledge/schema.ts";
import { MASS, ACCELERATION } from "../knowledge/foundation.ts";
import type { NewtonProblem, NewtonResult } from "./contracts.ts";
export function sameDimension(a: Dimension, b: Dimension) { return a.every((power, index) => power === b[index]); }
export function solveNewton(problem: NewtonProblem, knowledge: KnowledgeBundle): NewtonResult {
  const massUnit = knowledge.units.find(u => u.id === problem.mass.unit);
  const accelerationUnit = knowledge.units.find(u => u.id === problem.acceleration.unit);
  if (!massUnit || !accelerationUnit || !sameDimension(massUnit.dimension, MASS) || !sameDimension(accelerationUnit.dimension, ACCELERATION)) throw new Error("Incompatible quantity dimensions");
  if (massUnit.offset !== "0" || accelerationUnit.offset !== "0") throw new Error("Offset units unsupported by this solver");
  const massSI = Rational.parse(problem.mass.value).mul(Rational.parse(massUnit.scale));
  const accelerationSI = Rational.parse(problem.acceleration.value).mul(Rational.parse(accelerationUnit.scale));
  if (massSI.n <= 0n) throw new Error("Mass must be positive");
  const formula = knowledge.formulas.find(f => f.id === "newton-F-ma");
  if (!formula) throw new Error("Formula unavailable");
  const value = evaluate(formula.expression, { m: massSI, a: accelerationSI });
  const dimension = massUnit.dimension.map((v, i) => v + accelerationUnit.dimension[i]) as unknown as Dimension;
  return { kind: "newton", value, massSI, accelerationSI, unit: "N", dimension };
}
