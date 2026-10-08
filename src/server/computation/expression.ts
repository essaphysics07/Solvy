import { Rational, ZERO, ONE } from "./rational.ts";
export type Expression =
  | { kind: "number"; value: string }
  | { kind: "variable"; name: string }
  | { kind: "negate"; value: Expression }
  | { kind: "binary"; op: "+" | "-" | "*" | "/"; left: Expression; right: Expression };
/** Restricted arithmetic grammar, bounded before parsing. Variables cannot appear in divisors. */
export function parseExpression(source: string, variable = "x"): Expression {
  if (source.length > 400) throw new Error("Expression too long");
  const tokens = source.match(/\d+(?:\.\d*)?|\.\d+|[a-z]|[()+\-*/]/g) ?? [];
  if (tokens.join("") !== source.replace(/\s/g, "") || tokens.length === 0 || tokens.length > 100) throw new Error("Unsupported syntax");
  let index = 0;
  let depth = 0;
  const binary = (op: "+" | "-" | "*" | "/", left: Expression, right: Expression): Expression => ({ kind: "binary", op, left, right });
  function primary(): Expression {
    if (++depth > 24) throw new Error("Expression too deep");
    let result: Expression;
    const token = tokens[index++];
    if (token === "-" || token === "+") result = token === "-" ? { kind: "negate", value: primary() } : primary();
    else if (token === "(") {
      result = sum();
      if (tokens[index++] !== ")") throw new Error("Unclosed parentheses");
    } else if (token === variable) result = { kind: "variable", name: variable };
    else if (token && /^(?:\d+(?:\.\d*)?|\.\d+)$/.test(token)) {
      Rational.parse(token); result = { kind: "number", value: token };
    } else throw new Error("Expected a number or variable");
    depth--; return result;
  }
  function product(): Expression {
    let left = primary();
    let afterDivision = false;
    while (index < tokens.length) {
      const token = tokens[index];
      if (token === "*" || token === "/") { index++; left = binary(token, left, primary()); afterDivision = token === "/"; }
      else if (token === variable || token === "(") {
        if (afterDivision) throw new Error("Ambiguous implicit multiplication after division");
        left = binary("*", left, primary());
      }
      else break;
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
  if (index !== tokens.length) throw new Error("Unexpected token");
  return result;
}
export function evaluate(expression: Expression, variables: Record<string, Rational>): Rational {
  switch (expression.kind) {
    case "number": return Rational.parse(expression.value);
    case "variable": {
      const value = variables[expression.name];
      if (!value) throw new Error("Missing variable");
      return value;
    }
    case "negate": return evaluate(expression.value, variables).neg();
    case "binary": {
      const l = evaluate(expression.left, variables), r = evaluate(expression.right, variables);
      switch (expression.op) { case "+": return l.add(r); case "-": return l.sub(r); case "*": return l.mul(r); case "/": return l.div(r); }
    }
  }
}
export function containsVariable(expression: Expression): boolean {
  return expression.kind === "variable" || (expression.kind === "negate" && containsVariable(expression.value)) ||
    (expression.kind === "binary" && (containsVariable(expression.left) || containsVariable(expression.right)));
}
/** Reduce only a syntactically affine expression. Deliberately reject x*x and x/x even if cancellation is possible. */
export function affine(expression: Expression): { a: Rational; b: Rational } {
  switch (expression.kind) {
    case "number": return { a: ZERO, b: Rational.parse(expression.value) };
    case "variable": return { a: ONE, b: ZERO };
    case "negate": { const value = affine(expression.value); return { a: value.a.neg(), b: value.b.neg() }; }
    case "binary": {
      if (expression.op === "*" && containsVariable(expression.left) && containsVariable(expression.right)) throw new Error("Nonlinear expression");
      if (expression.op === "/" && containsVariable(expression.right)) throw new Error("Variable denominator");
      const l = affine(expression.left), r = affine(expression.right);
      switch (expression.op) {
        case "+": return { a: l.a.add(r.a), b: l.b.add(r.b) };
        case "-": return { a: l.a.sub(r.a), b: l.b.sub(r.b) };
        case "*": return { a: l.a.mul(r.b).add(r.a.mul(l.b)), b: l.b.mul(r.b) };
        case "/": return { a: l.a.div(r.b), b: l.b.div(r.b) };
      }
    }
  }
}
/** Independent polynomial evaluator for verification; not the affine solver's reduction code. */
export function polynomial(expression: Expression): Rational[] {
  if (expression.kind === "number") return [Rational.parse(expression.value)];
  if (expression.kind === "variable") return [ZERO, ONE];
  if (expression.kind === "negate") return polynomial(expression.value).map(v => v.neg());
  const l = polynomial(expression.left), r = polynomial(expression.right);
  if (expression.op === "/") {
    if (r.length !== 1) throw new Error("Nonconstant divisor");
    return l.map(v => v.div(r[0]));
  }
  if (expression.op === "*") {
    const out = Array.from({ length: l.length + r.length - 1 }, () => ZERO);
    l.forEach((v, i) => r.forEach((w, j) => { out[i + j] = out[i + j].add(v.mul(w)); }));
    return out;
  }
  return Array.from({ length: Math.max(l.length, r.length) }, (_, i) =>
    expression.op === "+" ? (l[i] ?? ZERO).add(r[i] ?? ZERO) : (l[i] ?? ZERO).sub(r[i] ?? ZERO));
}
