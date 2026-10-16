import { parseFiniteData } from "./finite-data.ts";
import { isDeepStrictEqual } from "node:util";
import { coefficients, parsePolynomial } from "../computation/polynomials.ts";
import { parseExactArrayJSON, parseRationalLiteral } from "./numeric-data.ts";
import type {
  MathematicsProblem,
  PolynomialOperation,
  MatrixOperation,
} from "../solvers/mathematics-contracts.ts";
import type { ProblemRepresentation } from "./problem.ts";
import type { Understanding } from "../solvers/contracts.ts";
import { mathConcept, mathPattern } from "../solvers/mathematics-contracts.ts";
const unsupported = (): Understanding => ({
  status: "unsupported",
  reason: "Outside bounded mathematical grammar or resource limits",
});
/** Intent adapters consume the entire request. Mathematical structure belongs to the parser,
 * not a growing set of problem-specific word/number extraction expressions. */
export function understandMathematics(original: string): Understanding {
  if (original.length > 1000) return unsupported();
  const source = original
    .trim()
    .replace(/−|–/g, "-")
    .replace(/×|·/g, "*")
    .replace(/²/g, "^2")
    .replace(/³/g, "^3");
  try {
    const finiteData = parseFiniteData(original, source);
    if (finiteData)
      return {
        status: "understood",
        problem: finiteData,
        representation: mathematicsRepresentation(finiteData),
      };
    let problem: MathematicsProblem;
    const matrix =
      /^(determinant|inverse|rank|solve linear system)\s+(\[.*\])$/i.exec(
        source,
      );
    if (matrix) {
      const operation: MatrixOperation =
        matrix[1].toLowerCase() === "solve linear system"
          ? "linear-system"
          : (matrix[1].toLowerCase() as MatrixOperation);
      // JSON numbers can lose decimal precision: accept strings or safe integral numbers only.
      const raw: unknown = parseExactArrayJSON(matrix[2]);
      if (!Array.isArray(raw) || raw.length < 1 || raw.length > 5)
        return unsupported();
      const rows = raw.map((r: unknown) => {
        if (!Array.isArray(r) || r.length < 1 || r.length > 6)
          throw new Error("Matrix bound");
        return r.map((x: unknown) => {
          if (typeof x === "number" && Number.isSafeInteger(x))
            return String(x);
          if (typeof x !== "string" || x.length > 80)
            throw new Error("Use quoted exact decimals/fractions");
          return parseRationalLiteral(x).toString();
        });
      });
      if (
        rows.some((r) => r.length !== rows[0].length) ||
        (operation === "linear-system"
          ? rows[0].length < 2
          : rows[0].length > 5) ||
        ((operation === "inverse" || operation === "determinant") &&
          rows.length !== rows[0].length)
      )
        return unsupported();
      problem = {
        kind: "mathematics",
        family: "matrix",
        operation,
        original,
        matrix: rows,
        concept: mathConcept(operation),
        pattern: mathPattern(operation),
        assumptions: [
          "Exact rational entries",
          "Augmented last column is the right-hand side for systems",
        ],
        difficulty: "introductory",
      };
    } else {
      let operation: PolynomialOperation,
        body: string,
        bounds: { lower: string; upper: string } | undefined;
      const definite =
        /^integrate\s+(.+)\s+from\s+([+\-\d./]+)\s+to\s+([+\-\d./]+)$/i.exec(
          source,
        );
      const requested =
        /^(calculate|simplify|expand|differentiate|integrate|solve(?: quadratic)?|find the (?:minimum|maximum) of)\s+(.+)$/i.exec(
          source,
        );
      if (definite) {
        operation = "definite-integral";
        body = definite[1];
        const scalar = parseRationalLiteral;
        bounds = {
          lower: scalar(definite[2]).toString(),
          upper: scalar(definite[3]).toString(),
        };
      } else if (requested) {
        const intent = requested[1].toLowerCase();
        body = requested[2];
        operation = intent.startsWith("solve")
          ? "solve-polynomial"
          : intent.includes("minimum")
            ? "minimum"
            : intent.includes("maximum")
              ? "maximum"
              : intent === "expand"
                ? "simplify"
                : (intent as PolynomialOperation);
      } else if (/^[\d\s.+\-*/()^]+$/.test(source)) {
        operation = "calculate";
        body = source;
      } else if (/[=<>]/.test(source)) {
        operation = "solve-polynomial";
        body = source;
      } else return unsupported();
      if (operation === "calculate") {
        const percentage =
          /^([+-]?(?:\d+(?:\.\d*)?|\.\d+))%\s+of\s+([+-]?(?:\d+(?:\.\d*)?|\.\d+))$/i.exec(
            body,
          );
        if (percentage) body = `(${percentage[1]})/100*(${percentage[2]})`;
      }
      let relation: "<" | "<=" | ">" | ">=" | undefined;
      if (operation === "solve-polynomial" && /[<>]/.test(body))
        operation = "solve-linear-inequality";
      const letters = [...new Set(body.match(/[a-z]/g) ?? [])];
      if (letters.length > 1 || (operation === "calculate" && letters.length))
        return unsupported();
      const variable = letters[0] ?? "x";
      let expression;
      if (operation === "solve-linear-inequality") {
        const sides = /^([^<>=]+)(<=|>=|<|>)([^<>=]+)$/.exec(body);
        if (!sides) return unsupported();
        relation = sides[2] as typeof relation;
        expression = {
          kind: "binary" as const,
          op: "-" as const,
          left: parsePolynomial(sides[1], variable),
          right: parsePolynomial(sides[3], variable),
        };
      } else if (operation === "solve-polynomial") {
        const sides = body.split("=");
        if (sides.length !== 2 || !letters.length) return unsupported();
        expression = {
          kind: "binary" as const,
          op: "-" as const,
          left: parsePolynomial(sides[0], variable),
          right: parsePolynomial(sides[1], variable),
        };
      } else expression = parsePolynomial(body, variable);
      const values = coefficients(expression);
      if (operation === "solve-linear-inequality" && values.length > 2)
        return unsupported();
      if (
        (operation === "solve-polynomial" && values.length > 3) ||
        ((operation === "minimum" || operation === "maximum") &&
          values.length > 3)
      )
        return unsupported();
      problem = {
        kind: "mathematics",
        family: "polynomial",
        operation,
        original,
        variable,
        expression,
        coefficients: values.map((v) => v.toString()),
        ...(bounds ? { bounds } : {}),
        ...(relation ? { relation } : {}),
        concept: mathConcept(operation),
        pattern: mathPattern(operation),
        assumptions: [
          "Real variable",
          "Rational coefficients",
          "Constant nonzero divisors",
          "Degree at most 12",
        ],
        difficulty: "introductory",
      };
    }
    return {
      status: "understood",
      problem,
      representation: mathematicsRepresentation(problem),
    };
  } catch {
    return unsupported();
  }
}
export function mathematicsRepresentation(
  problem: MathematicsProblem,
): ProblemRepresentation {
  return {
    domain: "mathematics",
    subject:
      problem.family === "matrix"
        ? "linear-algebra"
        : problem.family === "finite-data"
          ? "finite-mathematics"
          : "algebra-and-calculus",
    concept: problem.concept,
    pattern: problem.pattern,
    known: [],
    unknown: ["result"],
    constraints: ["bounded exact mathematics"],
    assumptions: problem.assumptions,
    evidence: [problem.original],
    mathematics: problem,
  };
}
export function consistentMathematicsRepresentation(
  value: ProblemRepresentation,
): boolean {
  if (!value.mathematics || typeof value.mathematics.original !== "string")
    return false;
  const parsed = understandMathematics(value.mathematics.original);
  return (
    parsed.status === "understood" &&
    isDeepStrictEqual(value, parsed.representation)
  );
}
