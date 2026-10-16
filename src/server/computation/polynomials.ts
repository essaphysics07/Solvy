import { Rational, ZERO, ONE } from "./rational.ts";
import { containsVariable, type Expression } from "./expression.ts";
export const MAX_DEGREE = 12;
export type Polynomial = readonly Rational[]; // ascending powers, canonical trailing zeros removed
export function trim(p: Polynomial): Rational[] {
  const out = [...p];
  while (out.length > 1 && out.at(-1)!.zero) out.pop();
  if (!out.length || out.length > MAX_DEGREE + 2)
    throw new Error("Polynomial degree limit");
  return out;
}
export function add(a: Polynomial, b: Polynomial): Rational[] {
  return trim(
    Array.from({ length: Math.max(a.length, b.length) }, (_, i) =>
      (a[i] ?? ZERO).add(b[i] ?? ZERO),
    ),
  );
}
export function multiply(a: Polynomial, b: Polynomial): Rational[] {
  if (a.length + b.length - 2 > MAX_DEGREE)
    throw new Error("Polynomial degree limit");
  const out = Array.from({ length: a.length + b.length - 1 }, () => ZERO);
  a.forEach((x, i) =>
    b.forEach((y, j) => {
      out[i + j] = out[i + j].add(x.mul(y));
    }),
  );
  return trim(out);
}
export function coefficients(e: Expression): Rational[] {
  switch (e.kind) {
    case "number":
      return [Rational.parse(e.value)];
    case "variable":
      return [ZERO, ONE];
    case "negate":
      return coefficients(e.value).map((x) => x.neg());
    case "binary": {
      if (e.op === "/" && containsVariable(e.right))
        throw new Error("Variable denominator");
      const a = coefficients(e.left),
        b = coefficients(e.right);
      if (e.op === "*") return multiply(a, b);
      if (e.op === "/") return trim(a.map((x) => x.div(b[0])));
      return add(a, e.op === "-" ? b.map((x) => x.neg()) : b);
    }
  }
}
export function at(p: Polynomial, x: Rational): Rational {
  return [...p].reverse().reduce((v, c) => v.mul(x).add(c), ZERO);
}
export function derivative(p: Polynomial): Rational[] {
  return trim(
    p.length === 1
      ? [ZERO]
      : p.slice(1).map((c, i) => c.mul(new Rational(BigInt(i + 1)))),
  );
}
export function integral(p: Polynomial): Rational[] {
  return trim([ZERO, ...p.map((c, i) => c.div(new Rational(BigInt(i + 1))))]);
}
/** Exact square root if rational, otherwise no approximation is substituted. */
export function squareRoot(q: Rational): Rational | undefined {
  if (q.n < 0n) return undefined;
  function root(n: bigint) {
    if (n < 2n) return n;
    let x = n,
      y = (x + 1n) / 2n;
    while (y < x) {
      x = y;
      y = (x + n / x) / 2n;
    }
    return x;
  }
  const n = root(q.n),
    d = root(q.d);
  return n * n === q.n && d * d === q.d ? new Rational(n, d) : undefined;
}
/** Bounded polynomial grammar. Powers compile into existing arithmetic AST nodes.
 * Unary minus binds less tightly than powers. No functions, variable divisors, chained powers or code.
 */
export function parsePolynomial(source: string, variable = "x"): Expression {
  if (source.length > 400 || !/^[a-z]$/.test(variable))
    throw new Error("Expression limit");
  const tokens = source.match(/\d+(?:\.\d*)?|\.\d+|[a-z]|[()+\-*/^]/g) ?? [];
  if (
    !tokens.length ||
    tokens.length > 100 ||
    tokens.join("") !== source.replace(/\s/g, "")
  )
    throw new Error("Unsupported syntax");
  let index = 0,
    depth = 0,
    nodes = 0;
  const sizes = new WeakMap<Expression, number>();
  const degrees = new WeakMap<Expression, number>();
  const node = (e: Expression): Expression => {
    const size =
      1 +
      (e.kind === "binary"
        ? sizes.get(e.left)! + sizes.get(e.right)!
        : e.kind === "negate"
          ? sizes.get(e.value)!
          : 0);
    const degree =
      e.kind === "variable"
        ? 1
        : e.kind === "number"
          ? 0
          : e.kind === "negate"
            ? degrees.get(e.value)!
            : e.op === "*"
              ? degrees.get(e.left)! + degrees.get(e.right)!
              : Math.max(degrees.get(e.left)!, degrees.get(e.right)!);
    if (degree > MAX_DEGREE)
      throw new Error("Syntactic polynomial degree limit");
    degrees.set(e, degree);
    if (++nodes > 400 || size > 800) throw new Error("AST limit");
    sizes.set(e, size);
    return e;
  };
  const binary = (
    op: "+" | "-" | "*" | "/",
    left: Expression,
    right: Expression,
  ) => node({ kind: "binary", op, left, right });
  function primary(): Expression {
    if (++depth > 24) throw new Error("Nesting limit");
    const t = tokens[index++];
    let result: Expression;
    if (t === "-" || t === "+") {
      result = primary();
      if (t === "-") result = node({ kind: "negate", value: result });
    } else {
      if (t === "(") {
        result = sum();
        if (tokens[index++] !== ")") throw new Error("Parenthesis");
      } else if (t === variable)
        result = node({ kind: "variable", name: variable });
      else if (t && /^(?:\d+(?:\.\d*)?|\.\d+)$/.test(t)) {
        Rational.parse(t);
        result = node({ kind: "number", value: t });
      } else throw new Error("Expected number or variable");
      if (tokens[index] === "^") {
        index++;
        const exponent = tokens[index++];
        if (
          !exponent ||
          !/^\d+$/.test(exponent) ||
          Number(exponent) > MAX_DEGREE
        )
          throw new Error("Power limit");
        const base = result;
        result = node({ kind: "number", value: "1" });
        // Reject invalid bases even for exponent zero; don't erase denominator constraints.
        const baseCoefficients = coefficients(base);
        if (Number(exponent) === 0) {
          // This AST has no exclusion-set representation. Only a proven nonzero
          // constant base can be erased without changing the real domain.
          if (baseCoefficients.length !== 1)
            throw new Error("Variable-dependent zero power requires domain exclusions");
          if (baseCoefficients[0].zero) throw new Error("Undefined zero power");
        }
        for (let i = 0; i < Number(exponent); i++)
          result = binary("*", result, base);
      }
    }
    depth--;
    return result;
  }
  function product(): Expression {
    let left = primary(),
      afterDivision = false;
    while (index < tokens.length) {
      const t = tokens[index];
      if (t === "*" || t === "/") {
        index++;
        left = binary(t, left, primary());
        afterDivision = t === "/";
      } else if (t === variable || t === "(") {
        if (afterDivision || (t === variable && tokens[index - 1] === variable))
          throw new Error("Ambiguous multiplication");
        left = binary("*", left, primary());
      } else break;
    }
    return left;
  }
  function sum(): Expression {
    let left = product();
    while (tokens[index] === "+" || tokens[index] === "-") {
      const op = tokens[index++] as "+" | "-";
      left = binary(op, left, product());
    }
    return left;
  }
  const result = sum();
  if (index !== tokens.length) throw new Error("Trailing syntax");
  // Bound expanded traversal as well as allocated nodes (powers share AST branches).
  const pending = [result];
  let visited = 0;
  while (pending.length) {
    if (++visited > 800) throw new Error("Expanded AST limit");
    const e = pending.pop()!;
    if (e.kind === "binary") pending.push(e.left, e.right);
    else if (e.kind === "negate") pending.push(e.value);
  }
  coefficients(result);
  return result;
}
export function formatPolynomial(
  p: Polynomial,
  variable: string,
  latex = false,
): string {
  return (
    [...p]
      .map((c, i) => ({ c, i }))
      .reverse()
      .filter(({ c }) => !c.zero)
      .map(
        ({ c, i }) =>
          `${latex ? c.latex() : c.toString()}${i ? (latex ? variable : `*${variable}`) + (i > 1 ? (latex ? `^{${i}}` : `^${i}`) : "") : ""}`,
      )
      .join(" + ")
      .replace(/\+ -/g, "- ") || "0"
  );
}
