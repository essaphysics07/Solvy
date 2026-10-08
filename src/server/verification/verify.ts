import type { ExplanationLevel, SolutionContent, VerificationCheck, VerificationReport } from "../../shared/contracts/solution.ts";
import type { UnderstoodProblem, ComputedResult, NewtonProblem, NewtonResult, LinearProblem, LinearResult } from "../solvers/contracts.ts";
import type { KnowledgeBundle } from "../knowledge/schema.ts";
import { Rational, ZERO } from "../computation/rational.ts";
import { evaluate, polynomial } from "../computation/expression.ts";
import { explain } from "../solving/explain.ts";
function check(id: string, claim: string, expected: string, observed: string, pass: boolean, evidence: string): VerificationCheck {
  return { checkerId: id, checkerVersion: "1.0.0", claim, expected, observed, tolerance: "exact", status: pass ? "PASS" : "FAIL", evidence };
}
const equalDimensions = (a: readonly number[], b: readonly number[]) => a.length === b.length && a.every((v, i) => v === b[i]);
function newtonChecks(problem: NewtonProblem, result: NewtonResult, knowledge: KnowledgeBundle): VerificationCheck[] {
  const mu = knowledge.units.find(u => u.id === problem.mass.unit), au = knowledge.units.find(u => u.id === problem.acceleration.unit);
  if (!mu || !au) return [check("units", "Known input units", "Supported mass and acceleration units", "Unknown unit", false, "Cannot normalize unknown units")];
  // Independent conversion and cross-product calculation: do not call solver or evaluate its formula.
  const m = Rational.parse(problem.mass.value).mul(Rational.parse(mu.scale)).add(Rational.parse(mu.offset));
  const a = Rational.parse(problem.acceleration.value).mul(Rational.parse(au.scale)).add(Rational.parse(au.offset));
  const expectedNumerator = m.n * a.n, expectedDenominator = m.d * a.d;
  const arithmeticOK = result.value.n * expectedDenominator === expectedNumerator * result.value.d;
  const forceDimension = [1,1,-2,0,0,0,0];
  const inferred = mu.dimension.map((v, i) => v + au.dimension[i]);
  const unitsOK = result.unit === "N" && mu.offset === "0" && au.offset === "0" && m.equals(result.massSI) && a.equals(result.accelerationSI);
  const dimensionOK = equalDimensions(mu.dimension, [1,0,0,0,0,0,0]) && equalDimensions(au.dimension, [0,1,-2,0,0,0,0]) &&
    equalDimensions(inferred, forceDimension) && equalDimensions(result.dimension, forceDimension);
  const conditions = ["Constant mass", "Inertial frame", "Classical mechanics", "Signed values refer to the same axis"];
  const applicable = problem.unknown === "net-force" && conditions.every(item => problem.assumptions.includes(item));
  return [
    check("arithmetic", "F_net = mass × acceleration", new Rational(expectedNumerator, expectedDenominator).toString(), result.value.toString(), arithmeticOK, "Recomputed from original values and unit scales using exact integer cross-products."),
    check("units", "SI normalization and force unit", `${m} kg; ${a} m/s²; N`, `${result.massSI} kg; ${result.accelerationSI} m/s²; ${result.unit}`, unitsOK, "Input conversions independently repeated; output must be newtons."),
    check("dimensions", "Mass × acceleration has force dimensions", "M L T^-2", result.dimension.join(","), dimensionOK, "Input dimension vectors and output dimension checked separately."),
    check("applicability", "Net-force model under stated assumptions", conditions.join("; "), problem.assumptions.join("; "), applicable, "Conditional on the stated model assumptions; not an experimental verification of the physical system."),
    check("physical-constraints", "Positive mass and force/acceleration sign", "m > 0; force sign follows acceleration", `m=${m}; a=${a}; F=${result.value}`, m.n > 0n && (a.zero ? result.value.zero : (a.n > 0n) === (result.value.n > 0n)), "Zero acceleration is allowed; negative acceleration is a signed one-axis component."),
  ];
}
function linearChecks(problem: LinearProblem, result: LinearResult): VerificationCheck[] {
  // Independent polynomial expansion checks classification without using affine() or solveLinear().
  const l = polynomial(problem.left), r = polynomial(problem.right);
  const difference = Array.from({ length: Math.max(l.length, r.length) }, (_, i) => (l[i] ?? ZERO).sub(r[i] ?? ZERO));
  const constant = difference[0] ?? ZERO, coefficient = difference[1] ?? ZERO;
  const linear = difference.slice(2).every(v => v.zero);
  const expectedClassification = coefficient.zero ? constant.zero ? "infinite" : "none" : "unique";
  const classification = linear && expectedClassification === result.classification;
  const checks: VerificationCheck[] = [
    check("applicability", "Affine real equation and solution-set classification", expectedClassification, result.classification, classification, "Original syntax was restricted; an independent polynomial expansion determines identity, contradiction, or unique solution."),
    check("arithmetic", "Collected coefficients preserve the equation", `${coefficient}x = ${constant.neg()}`, `${result.coefficient}x = ${result.rhs}`, coefficient.equals(result.coefficient) && constant.neg().equals(result.rhs), "Independent polynomial expansion checked the solver's collected coefficients."),
  ];
  if (result.classification === "unique") {
    const leftValue = evaluate(problem.left, { [problem.variable]: result.value });
    const rightValue = evaluate(problem.right, { [problem.variable]: result.value });
    checks.push(check("algebra-substitution", "Solution satisfies original equation", rightValue.toString(), leftValue.toString(), classification && leftValue.equals(rightValue), `Exact substitution of ${problem.variable}=${result.value} into the original left and right expression trees.`));
  } else {
    checks.push(check("algebra-substitution", "Original equation is an identity or contradiction", expectedClassification, result.classification, classification,
      "For a solution set rather than a single value, independent polynomial identity checking replaces numerical substitution."));
  }
  return checks;
}
export function verify(problem: UnderstoodProblem, result: ComputedResult, knowledge: KnowledgeBundle,
  content?: SolutionContent, level: ExplanationLevel = "step-by-step"): VerificationReport {
  let checks: VerificationCheck[];
  try {
    if (problem.kind === "newton" && result.kind === "newton") checks = newtonChecks(problem, result, knowledge);
    else if (problem.kind === "linear" && result.kind === "linear") checks = linearChecks(problem, result);
    else throw new Error("Mismatched computation");
    if (content) {
      const expected = explain(problem, result, level);
      checks.push(check("explanation-consistency", "Displayed answer and expressions equal authoritative result", expected.answer, content.answer,
        JSON.stringify(expected) === JSON.stringify(content), "All explanation fields match the deterministic template; provider text cannot overwrite them."));
    }
  } catch {
    checks = [{ checkerId: "verification-input", checkerVersion: "1.0.0", claim: "Result can be independently checked", expected: "Well-formed supported computation", observed: "Check could not complete", status: "INCONCLUSIVE", evidence: "Unverifiable results are not promoted to verified." }];
  }
  const status = checks.some(c => c.status === "FAIL") ? "FAILED" : checks.some(c => c.status === "INCONCLUSIVE") ? "PARTIAL" : "VERIFIED_WITHIN_SCOPE";
  return { status, scope: problem.kind === "newton" ? "Exact net-force calculation, units, dimensions, and applicability under the stated one-axis assumptions. Input interpretation is not independently verified." :
    "Exact real linear-equation solution set checked against the parsed original equation. Input transcription is outside this scope.", checks };
}
