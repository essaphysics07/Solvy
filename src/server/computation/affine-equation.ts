import { affine, type Expression } from "./expression.ts";
import { Rational } from "./rational.ts";

/** JSON-safe exact values (e.g. "2", "-1/3"), not executable expression strings. */
export interface AffineSide {
  readonly coefficient: string;
  readonly constant: string;
}

/** Original syntax is retained for independent verification, not replaced by its reduction. */
export interface AffineEquation {
  readonly relation: "=";
  readonly numberDomain: "real";
  readonly variable: string;
  readonly original: string;
  readonly left: Expression;
  readonly right: Expression;
  readonly form: {
    readonly kind: "affine";
    readonly left: AffineSide;
    readonly right: AffineSide;
  };
}

export function analyzeAffineEquation(
  equation: Pick<AffineEquation, "left" | "right" | "variable" | "original">,
): AffineEquation {
  if (!/^[a-z]$/.test(equation.variable)) throw new Error("Expected one lowercase variable");
  const pending = [equation.left, equation.right];
  let visited = 0;
  while (pending.length) {
    if (++visited > 400) throw new Error("Equation exceeds the bounded AST size");
    const node = pending.pop()!;
    if (node.kind === "variable" && node.name !== equation.variable) throw new Error("Unexpected variable");
    if (node.kind === "negate") pending.push(node.value);
    if (node.kind === "binary") pending.push(node.left, node.right);
  }
  const summarize = (expression: Expression): AffineSide => {
    const { a, b } = affine(expression);
    return { coefficient: a.toString(), constant: b.toString() };
  };
  return {
    ...equation,
    relation: "=",
    numberDomain: "real",
    form: { kind: "affine", left: summarize(equation.left), right: summarize(equation.right) },
  };
}

/** Decode only canonical bounded rational data; never parse arbitrary code. */
export function exactRational(value: string): Rational {
  if (typeof value !== "string" || value.length > 513 || !/^-?\d+(?:\/[1-9]\d*)?$/.test(value)) {
    throw new Error("Invalid exact rational data");
  }
  const [numerator, denominator = "1"] = value.split("/");
  const result = new Rational(BigInt(numerator), BigInt(denominator));
  if (result.toString() !== value) throw new Error("Noncanonical exact rational data");
  return result;
}

/** Project both sides into the existing knowledge formula A*x + b = c, without dividing. */
export function affineBindings(equation: AffineEquation) {
  return {
    coefficient: exactRational(equation.form.left.coefficient).sub(exactRational(equation.form.right.coefficient)),
    constant: exactRational(equation.form.left.constant),
    rhs: exactRational(equation.form.right.constant),
  };
}
