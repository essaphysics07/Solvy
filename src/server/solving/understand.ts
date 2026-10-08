import { parseExpression, affine } from "../computation/expression.ts";
import { Rational } from "../computation/rational.ts";
import type { Understanding, UnderstoodProblem } from "../solvers/contracts.ts";
import type { SolveInput } from "./input.ts";
import type { ProblemRepresentation } from "./problem.ts";

const unsupported = (reason: string): Understanding => ({
  status: "unsupported",
  reason,
});

export function understand(input: SolveInput): Understanding {
  // Never ignore a diagram or other attached context and then label the text-only calculation verified.
  if (input.image) return unsupported("Image understanding requires the vision provider.");

  const source = input.problem.replace(/−|–/g, "-").replace(/×|·/g, "*").trim();

  if (input.subject === "mathematics") return understandLinear(source);

  return understandNewton(source);
}

function understandLinear(source: string): Understanding {
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

    affine(left);
    affine(right);

    const problem: UnderstoodProblem = {
      kind: "linear",
      concept: "linear-equation",
      pattern: "one-variable-affine",
      left,
      right,
      variable: letters[0],
      original: body,
      assumptions: ["Real variable", "Constant nonzero divisors"],
      difficulty: "introductory",
    };

    return {
      status: "understood",
      problem,
      representation: toProblemRepresentation(problem),
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

function understandNewton(source: string): Understanding {
  if (
    !/\bforce\b/i.test(source) ||
    !/\b(?:find|calculate|determine|what)\b/i.test(source)
  ) {
    return unsupported("Not a net-force request.");
  }

  if (
    /\b(?:applied|pulling|pushing|tension|friction|weight|gravit|centripetal|centrifugal|magnetic|electric|incline|slope|rocket|variable.mass|relativ|non.inertial|deceler|slows|retard|east|west|north|south|upward|downward)\b/i.test(
      source,
    ) ||
    /\b(?:force|mass|acceleration)\s+(?:and|or)\b/i.test(source)
  ) {
    return unsupported(
      "Additional forces, directions, or assumptions require broader reasoning.",
    );
  }

  // Strict supported sentences; entire input must match.
  // This prevents silent use of a subset of facts.
  const num = "([+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+))";
  const massUnit = "(kg|kilograms?|g|grams?)";
  const accUnit = "(m|cm)\\s*\\/\\s*s(?:²|\\^2|2)";
  const question =
    "(?:find|calculate|determine|what is)\\s+(?:the\\s+)?(?:net\\s+)?force(?:\\s+(?:on|acting on)\\s+(?:it|the (?:object|body|block)))?";

  const narrative = new RegExp(
    `^(?:a|an)\\s+${num}\\s*${massUnit}\\s+(?:object|body|block)\\s+(?:accelerates at|has an acceleration of)\\s+${num}\\s*${accUnit}[.,;]?\\s*${question}[?.]?$`,
    "i",
  );

  const assignments = new RegExp(
    `^(?:given\\s*:?\\s*)?(?:m|mass)\\s*=\\s*${num}\\s*${massUnit}\\s*[,;]\\s*(?:a|acceleration)\\s*=\\s*${num}\\s*${accUnit}\\s*[.;,]?\\s*${question}[?.]?$`,
    "i",
  );

  const match = narrative.exec(source) ?? assignments.exec(source);

  if (!match) {
    return unsupported(
      "Outside the simple mass-and-acceleration grammar; units and context need provider interpretation.",
    );
  }

  const [, m, mUnit, a, lengthUnit] = match;

  try {
    if (Rational.parse(m).n <= 0n) {
      return {
        status: "clarification",
        message:
          "Mass must be greater than zero for this model. Please check the mass and its unit.",
      };
    }

    Rational.parse(a);
  } catch {
    return unsupported("Number exceeds supported exact precision.");
  }

  const problem: UnderstoodProblem = {
    kind: "newton",
    concept: "newton-second-law",
    pattern: "mass-acceleration-to-net-force",
    mass: {
      value: m,
      unit: /^(kg|kilogram)/i.test(mUnit) ? "kg" : "g",
      evidence: `${m} ${mUnit}`,
    },
    acceleration: {
      value: a,
      unit: `${lengthUnit.toLowerCase()}/s2`,
      evidence: `${a} ${lengthUnit}/s²`,
    },
    unknown: "net-force",
    assumptions: [
      "Constant mass",
      "Inertial frame",
      "Classical mechanics",
      "Signed values refer to the same axis",
    ],
    difficulty: "introductory",
  };

  return {
    status: "understood",
    problem,
    representation: toProblemRepresentation(problem),
  };
}

export function toProblemRepresentation(
  problem: UnderstoodProblem,
): ProblemRepresentation {
  if (problem.kind === "linear") {
    return {
      domain: "mathematics",
      subject: "algebra",
      concept: problem.concept,
      pattern: problem.pattern,
      known: [],
      unknown: [problem.variable],
      constraints: [],
      assumptions: problem.assumptions,
      evidence: [problem.original],
    };
  }

  return {
    domain: "physics",
    subject: "mechanics",
    concept: problem.concept,
    pattern: problem.pattern,
    known: [
      {
        quantity: "mass",
        value: problem.mass.value,
        unit: problem.mass.unit,
        evidence: problem.mass.evidence,
      },
      {
        quantity: "acceleration",
        value: problem.acceleration.value,
        unit: problem.acceleration.unit,
        evidence: problem.acceleration.evidence,
      },
    ],
    unknown: [problem.unknown],
    constraints: [],
    assumptions: problem.assumptions,
    evidence: [
      problem.mass.evidence,
      problem.acceleration.evidence,
    ],
  };
}