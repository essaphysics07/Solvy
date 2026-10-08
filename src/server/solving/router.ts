import type { KnowledgeBundle } from "../knowledge/schema.ts";
import { executablePattern } from "../knowledge/repository.ts";
import type { ProblemRepresentation } from "./problem.ts";
import { isConsistentAlgebraRepresentation } from "./algebra.ts";

export interface RouteDecision {
  status: "matched" | "unsupported";
  pattern?: string;
  reason?: string;
}

export function routeProblem(problem: ProblemRepresentation, knowledge: KnowledgeBundle): RouteDecision {
  const unsupported = (reason: string): RouteDecision => ({ status: "unsupported", reason });
  // A proposed label is never sufficient, nor is a sole unrelated candidate.
  const pattern = executablePattern(knowledge, problem.pattern);
  if (!pattern || pattern.concept !== problem.concept) return unsupported("No trusted executable pattern matches this representation.");

  const formula = knowledge.formulas.find(item => item.id === pattern.formula && item.concept === pattern.concept);
  const method = knowledge.methods.find(item => item.id === pattern.method);
  const checks = knowledge.verificationRules.filter(item => item.appliesTo === pattern.id);
  if (!formula || !method || checks.length === 0) return unsupported("The knowledge pattern has incomplete solving or verification relationships.");

  if (method.executor === "linear-affine-v1") {
    if (!isConsistentAlgebraRepresentation(problem)) return unsupported("The algebra structure, evidence, or derived quantities are inconsistent.");
    if (!pattern.constraints.every(constraint => problem.constraints.includes(constraint))) return unsupported("The algebra pattern constraints are not satisfied.");
    const known = new Set(problem.known.map(item => item.quantity));
    const quantityIds = new Set(knowledge.quantities.map(item => item.id));
    const target = formula.bindings[formula.target];
    // The existing formula binds the semantic target 'unknown' to the input symbol x/y.
    if (target !== "unknown" || pattern.unknown.length !== 1 || pattern.unknown[0] !== target ||
        !quantityIds.has(target) || !pattern.known.every(id => known.has(id)) ||
        !problem.known.every(item => quantityIds.has(item.quantity) && knowledge.units.some(unit => unit.id === item.unit))) {
      return unsupported("Algebra quantities do not satisfy the knowledge pattern.");
    }
  } else if (problem.algebra || problem.domain === "mathematics") {
    return unsupported("This executor does not support the supplied algebra structure.");
  }
  return { status: "matched", pattern: pattern.id };
}
