import { isDeepStrictEqual as equal } from "node:util";
import { parseExpression } from "../computation/expression.ts";
import { analyzeAffineEquation, affineBindings } from "../computation/affine-equation.ts";
import type { LinearProblem, Understanding } from "../solvers/contracts.ts";
import type { ProblemRepresentation } from "./problem.ts";

const unsupported = (reason: string): Understanding => ({ status: "unsupported", reason });

/** Algebra input adapter. Grammar stays bounded; new families should add analyzers, not regexes to understand.ts. */
export function understandAlgebra(source: string): Understanding {
  const requestedVariable = source.match(
    /^(?:please\s+)?(?:solve\s+for|find|what\s+is)\s+([a-z])\b/i,
  )?.[1];

  const body = source
    .replace(
      /^(?:please\s+)?(?:solve(?:\s+(?:the\s+)?(?:linear\s+)?equation)?(?:\s+for\s+[a-z])?|find\s+[a-z]|what\s+is\s+[a-z])\s*:?\s*/i,
      "",
    )
    .replace(/[?.]\s*$/, "")
    .trim();

  // Do not pull a convenient equation out of a larger word problem or ignore extra constraints.
  const matches = body.match(/[a-z]/g) ?? [];
  const letters = [...new Set(matches)];

  if (
    (requestedVariable && requestedVariable !== letters[0]) ||
    letters.length !== 1 ||
    !/^[0-9a-z\s.+\-*/()=]+$/.test(body) ||
    body.split("=").length !== 2
  ) {
    return unsupported("Outside the one-variable equation grammar.");
  }

  try {
    const [leftText, rightText] = body.split("=");

    const left = parseExpression(leftText, letters[0]);
    const right = parseExpression(rightText, letters[0]);

    const equation = analyzeAffineEquation({ left, right, variable: letters[0], original: body });

    const problem: LinearProblem = {
      kind: "linear",
      concept: "linear-equation",
      pattern: "one-variable-affine",
      ...equation,
      assumptions: ["Real variable", "Constant nonzero divisors"],
      difficulty: "introductory",
    };

    return {
      status: "understood",
      problem,
      representation: toAlgebraRepresentation(problem),
    };
  } catch (error) {
    if (error instanceof Error && error.message === "Division by zero") {
      return {
        status: "clarification",
        message:
          "This equation contains division by zero and is undefined. Please correct the denominator.",
      };
    }

    return unsupported("The expression is not a supported linear equation.");
  }
}

/** Quantities use existing knowledge IDs; x/y remains the actual unknown symbol. */
export function toAlgebraRepresentation(problem: LinearProblem): ProblemRepresentation {
  const values = affineBindings(problem);
  return {
    domain: "mathematics",
    subject: "algebra",
    concept: problem.concept,
    pattern: problem.pattern,
    algebra: problem,
    known: [
      { quantity: "coefficient", value: values.coefficient.toString(), unit: "one", evidence: "left coefficient - right coefficient" },
      { quantity: "constant", value: values.constant.toString(), unit: "one", evidence: "left constant" },
      { quantity: "rhs", value: values.rhs.toString(), unit: "one", evidence: "right constant" },
    ],
    unknown: [problem.variable],
    constraints: ["one real variable", "linear", "bounded expression grammar"],
    assumptions: problem.assumptions,
    evidence: [problem.original],
  };
}

/** Revalidate syntax and its derived facts at routing, not just a parser's pattern label.
 * This is a boundary check, not the independent solution verifier (which retains its own algorithm).
 */
export function isConsistentAlgebraRepresentation(representation: ProblemRepresentation): boolean {
  try {
    const equation = representation.algebra;
    if (!equation || typeof equation.original !== "string" || equation.original.length > 1000) return false;
    const checked = understandAlgebra(equation.original);
    if (checked.status !== "understood" || checked.problem.kind !== "linear") return false;
    const expected = checked.representation;
    const canonical = checked.problem;
    return representation.domain === expected.domain && representation.subject === expected.subject &&
      representation.concept === expected.concept && representation.pattern === expected.pattern &&
      equal(representation.known, expected.known) && equal(representation.unknown, expected.unknown) &&
      equal(representation.constraints, expected.constraints) && equal(representation.assumptions, expected.assumptions) &&
      equal(representation.evidence, expected.evidence) && equation.variable === canonical.variable &&
      equation.relation === canonical.relation && equation.numberDomain === canonical.numberDomain &&
      equation.original === canonical.original && equal(equation.left, canonical.left) &&
      equal(equation.right, canonical.right) && equal(equation.form, canonical.form);
  } catch { return false; }
}
