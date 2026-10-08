import type { ExplanationLevel, SolutionContent } from "../../shared/contracts/solution.ts";
import type { UnderstoodProblem, ComputedResult } from "../solvers/contracts.ts";
/** Deterministic explanations lock ALL numerical expressions. No AI call can replace these results. */
export function explain(problem: UnderstoodProblem, result: ComputedResult, level: ExplanationLevel): SolutionContent {
  if (problem.kind === "newton" && result.kind === "newton") {
    const steps = [
      { title: "Identify the quantities", explanation: `Mass is ${problem.mass.value} ${problem.mass.unit}; acceleration is ${problem.acceleration.evidence}. Convert to SI units.`,
        expression: `m = ${result.massSI.latex()}\\,\\mathrm{kg},\\quad a = ${result.accelerationSI.latex()}\\,\\mathrm{m/s^2}` },
      { title: "Use Newton's second law", explanation: "For constant mass in an inertial frame, multiply mass by acceleration to obtain net external force.", expression: "F_{\\mathrm{net}} = ma" },
      { title: "Substitute and calculate", explanation: "The result is net force, with its sign referring to the same axis as acceleration.",
        expression: `F_{\\mathrm{net}} = (${result.massSI.latex()})(${result.accelerationSI.latex()}) = ${result.value.latex()}\\,\\mathrm{N}` },
    ];
    if (level === "deep-dive") steps.push({ title: "Check dimensions", explanation: "A newton has dimensions of mass times length divided by time squared. A single applied force may differ from net force.", expression: "[F]=[M][L][T]^{-2},\\quad 1\\,\\mathrm{N}=1\\,\\mathrm{kg\\,m/s^2}" });
    return { title: "Find the net force", steps: level === "simple" ? [steps[1], steps[2]] : steps,
      answer: `${result.value} N`, note: "Net external force. Assumes constant positive mass, an inertial frame, and a single axis. Verification covers the parsed model, not independent confirmation of the input." };
  }
  if (problem.kind === "linear" && result.kind === "linear") {
    const steps = [{ title: "Collect like terms", explanation: "Apply the same operations to both sides and collect the variable terms on the left.",
      expression: `(${result.coefficient.latex()})${problem.variable} = ${result.rhs.latex()}` }];
    if (result.classification === "unique") {
      steps.push({ title: "Isolate the variable", explanation: "The coefficient is nonzero, so division is valid.",
        expression: `${problem.variable} = \\frac{${result.rhs.latex()}}{${result.coefficient.latex()}} = ${result.value.latex()}` });
      if (level === "deep-dive") steps.push({ title: "Verify the original equation", explanation: "The verifier substitutes this exact rational value into both original expression trees and compares both sides.", expression: `${problem.variable} = ${result.value.latex()}` });
      return { title: `Solve for ${problem.variable}`, steps, answer: `${problem.variable} = ${result.value}`,
        note: "Checked by exact substitution into the original equation over the real numbers." };
    }
    const infinite = result.classification === "infinite";
    steps.push({ title: infinite ? "Recognize an identity" : "Recognize a contradiction", explanation: infinite ?
      "The variable terms cancel and both sides are equal. Every real value satisfies the equation." :
      "The variable terms cancel but the remaining constants are unequal. No real value satisfies the equation.",
      expression: `0 = ${result.rhs.latex()}` });
    return { title: "Classify the linear equation", steps, answer: infinite ? "Infinitely many solutions (all real numbers)" : "No solution",
      note: "No division by a zero coefficient was performed. The original equation was checked symbolically." };
  }
  throw new Error("Problem/result kind mismatch");
}
