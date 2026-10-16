import { finiteDataExpected } from "./finite-data.ts";
import type { VerificationCheck } from "../../shared/contracts/solution.ts";
import { Rational, ZERO, ONE } from "../computation/rational.ts";
import { exactRational } from "../computation/affine-equation.ts";
import { evaluate, type Expression } from "../computation/expression.ts";
import type { Matrix } from "../computation/matrices.ts";
import type {
  MathematicsProblem,
  MathematicsResult,
  PolynomialProblem,
} from "../solvers/mathematics-contracts.ts";
const q = (n: number) => new Rational(BigInt(n));
function check(id: string, pass: boolean, evidence: string): VerificationCheck {
  return {
    checkerId: id,
    checkerVersion: "1.0.0",
    claim:
      "Exact mathematical result and complete classification within the parsed domain",
    expected: "Identity or complete solution set",
    observed: pass ? "Exact checks agree" : "Mismatch",
    tolerance: "exact rational arithmetic",
    status: pass ? "PASS" : "FAIL",
    evidence,
  };
}
/** Derivative oracle follows the original AST's product/quotient rules, not coefficient differentiation. */
function dual(
  e: Expression,
  x: Rational,
  variable: string,
): [Rational, Rational] {
  if (e.kind === "number") return [Rational.parse(e.value), ZERO];
  if (e.kind === "variable") {
    if (e.name !== variable) throw new Error("Variable mismatch");
    return [x, ONE];
  }
  if (e.kind === "negate") {
    const [v, d] = dual(e.value, x, variable);
    return [v.neg(), d.neg()];
  }
  const [a, da] = dual(e.left, x, variable),
    [b, db] = dual(e.right, x, variable);
  switch (e.op) {
    case "+":
      return [a.add(b), da.add(db)];
    case "-":
      return [a.sub(b), da.sub(db)];
    case "*":
      return [a.mul(b), da.mul(b).add(a.mul(db))];
    case "/":
      return [a.div(b), da.mul(b).sub(a.mul(db)).div(b.mul(b))];
  }
}
function degree(e: Expression): number {
  if (e.kind === "number") return 0;
  if (e.kind === "variable") return 1;
  if (e.kind === "negate") return degree(e.value);
  const a = degree(e.left),
    b = degree(e.right);
  if (e.op === "/" && b !== 0) throw new Error("Polynomial domain");
  return e.op === "*" ? a + b : e.op === "/" ? a : Math.max(a, b);
}
// Independent monomial summation (solver uses Horner evaluation).
function sumP(
  p: readonly Rational[],
  x: Rational,
  differentiated = false,
): Rational {
  let value = ZERO,
    power = ONE;
  for (let i = differentiated ? 1 : 0; i < p.length; i++) {
    value = value.add(p[i].mul(power).mul(differentiated ? q(i) : ONE));
    power = power.mul(x);
  }
  return value;
}
function original(p: PolynomialProblem, x: Rational) {
  return evaluate(p.expression, { [p.variable]: x });
}
/** Interpolate the original expression on d+1 distinct points, then integrate its
 * Lagrange basis directly. This does not call coefficient extraction or integration. */
function integralByInterpolation(p: PolynomialProblem, d: number): Rational {
  const lower = exactRational(p.bounds!.lower),
    upper = exactRational(p.bounds!.upper);
  let answer = ZERO;
  for (let i = 0; i <= d; i++) {
    let basis = [ONE],
      denominator = ONE;
    for (let j = 0; j <= d; j++)
      if (i !== j) {
        const next = Array.from({ length: basis.length + 1 }, () => ZERO);
        basis.forEach((v, k) => {
          next[k] = next[k].sub(v.mul(q(j)));
          next[k + 1] = next[k + 1].add(v);
        });
        basis = next;
        denominator = denominator.mul(q(i - j));
      }
    let area = ZERO,
      upperPower = upper,
      lowerPower = lower;
    basis.forEach((v, k) => {
      area = area.add(v.mul(upperPower.sub(lowerPower)).div(q(k + 1)));
      upperPower = upperPower.mul(upper);
      lowerPower = lowerPower.mul(lower);
    });
    answer = answer.add(original(p, q(i)).mul(area).div(denominator));
  }
  return answer;
}
function polynomialCheck(
  p: PolynomialProblem,
  result: MathematicsResult,
): boolean {
  const r = result.value,
    d = degree(p.expression);
  if (d > 12) return false;
  if (p.operation === "calculate")
    return r.type === "scalar" && d === 0 && r.value.equals(original(p, ZERO));
  if (p.operation === "definite-integral")
    return r.type === "scalar" && r.value.equals(integralByInterpolation(p, d));
  if (
    p.operation === "simplify" ||
    p.operation === "differentiate" ||
    p.operation === "integrate"
  ) {
    if (
      r.type !== "polynomial" ||
      r.coefficients.length > 14 ||
      r.coefficients.length < 1 ||
      r.constantOfIntegration !== (p.operation === "integrate")
    )
      return false;
    const count = Math.max(d, r.coefficients.length - 1) + 1;
    for (let i = 0; i < count; i++) {
      const x = q(i),
        observed = sumP(r.coefficients, x, p.operation === "integrate");
      const expected =
        p.operation === "differentiate"
          ? dual(p.expression, x, p.variable)[1]
          : original(p, x);
      if (!observed.equals(expected)) return false;
    }
    return true;
  }
  const c = original(p, ZERO),
    plus = original(p, ONE),
    minus = original(p, ONE.neg());
  const a = plus
      .add(minus)
      .sub(c.mul(q(2)))
      .div(q(2)),
    b = plus.sub(minus).div(q(2));
  // A higher syntactic degree may cancel. Establish the reduced quadratic identity
  // at d+1 points rather than trusting cached summaries or rejecting valid cancellation.
  for (let i = 0; i <= Math.max(d, 2); i++) {
    const x = q(i);
    if (!original(p, x).equals(a.mul(x).mul(x).add(b.mul(x)).add(c)))
      return false;
  }
  if (p.operation === "solve-linear-inequality") {
    if (r.type !== "interval" || !a.zero || !p.relation) return false;
    const holds = (v: Rational, relation: string): boolean => {
      switch (relation) {
        case "<": return v.n < 0n;
        case "<=": return v.n <= 0n;
        case ">": return v.n > 0n;
        case ">=": return v.n >= 0n;
        default: throw new Error("Unsupported inequality relation");
      }
    };
    if (b.zero)
      return (
        r.classification === (holds(c, p.relation) ? "all" : "none") &&
        r.bound === undefined &&
        r.relation === undefined
      );
    if (
      r.classification !== "half-line" ||
      !r.bound ||
      !r.relation ||
      !original(p, r.bound).zero
    )
      return false;
    // An affine expression has one boundary; the boundary and a point on each
    // side establish the whole half-line, including strict versus closed endpoints.
    return [r.bound.sub(ONE), r.bound, r.bound.add(ONE)].every(
      (x) =>
        holds(original(p, x), p.relation!) ===
        holds(x.sub(r.bound!), r.relation!),
    );
  }
  if (p.operation === "minimum" || p.operation === "maximum") {
    if (r.type !== "extremum") return false;
    if (a.zero && b.zero)
      return (
        r.classification === "constant" &&
        !!r.value?.equals(c) &&
        r.at === undefined
      );
    if (a.zero || (p.operation === "minimum" ? a.n < 0n : a.n > 0n))
      return (
        r.classification === "unbounded" &&
        r.value === undefined &&
        r.at === undefined
      );
    return (
      r.classification === "attained" &&
      !!r.at &&
      !!r.value &&
      dual(p.expression, r.at, p.variable)[1].zero &&
      original(p, r.at).equals(r.value)
    );
  }
  if (r.type !== "roots") return false;
  const discriminant = b.mul(b).sub(q(4).mul(a).mul(c));
  if (a.zero && b.zero)
    return (
      r.classification === (c.zero ? "infinite" : "none") &&
      r.rational.length === 0 &&
      !r.surd
    );
  if (!a.zero && discriminant.n < 0n)
    return r.classification === "none" && r.rational.length === 0 && !r.surd;
  if (r.classification !== "finite") return false;
  if (a.zero)
    return (
      !r.surd && r.rational.length === 1 && original(p, r.rational[0]).zero
    );
  if (r.surd) {
    const { center, scale, radicand } = r.surd;
    return (
      r.rational.length === 0 &&
      discriminant.n > 0n &&
      radicand.n > 0n &&
      !scale.zero &&
      center.mul(q(2)).equals(b.neg().div(a)) &&
      center.mul(center).sub(scale.mul(scale).mul(radicand)).equals(c.div(a))
    );
  }
  return (
    r.rational.length === (discriminant.zero ? 1 : 2) &&
    r.rational.every((x) => original(p, x).zero) &&
    (discriminant.zero || !r.rational[0].equals(r.rational[1]))
  );
}
/** Cofactor expansion is intentionally independent of the solver's Gaussian elimination. */
export function cofactorDeterminant(a: Matrix): Rational {
  if (a.length < 1 || a.length > 5 || a.some((r) => r.length !== a.length))
    throw new Error("Square matrix bound");
  if (a.length === 1) return a[0][0];
  return a[0].reduce(
    (s, x, j) =>
      s.add(
        x
          .mul(
            cofactorDeterminant(
              a.slice(1).map((row) => row.filter((_, k) => k !== j)),
            ),
          )
          .mul(j % 2 ? ONE.neg() : ONE),
      ),
    ZERO,
  );
}
function combinations(n: number, k: number): number[][] {
  const out: number[][] = [];
  function visit(start: number, items: number[]) {
    if (items.length === k) {
      out.push(items);
      return;
    }
    for (let i = start; i < n; i++) visit(i + 1, [...items, i]);
  }
  visit(0, []);
  return out;
}
export function rankByMinors(a: Matrix): number {
  if (
    a.length < 1 ||
    a.length > 5 ||
    !a[0].length ||
    a[0].length > 6 ||
    a.some((r) => r.length !== a[0].length)
  )
    throw new Error("Rank bound");
  for (let k = Math.min(a.length, a[0].length); k > 0; k--)
    for (const rows of combinations(a.length, k))
      for (const cols of combinations(a[0].length, k)) {
        if (
          !cofactorDeterminant(rows.map((i) => cols.map((j) => a[i][j]))).zero
        )
          return k;
      }
  return 0;
}
export function mathematicsChecks(
  problem: MathematicsProblem,
  result: MathematicsResult,
): VerificationCheck[] {
  if (problem.family === "finite-data")
    return [
      check(
        `independent-${problem.operation}`,
        result.value.type === "scalar" &&
          result.value.value.equals(finiteDataExpected(problem)),
        "Independent enumerative or recurrence computation checks the closed-form or moment-based solver result under explicit finite-data assumptions.",
      ),
    ];
  if (problem.family === "polynomial")
    return [
      check(
        `independent-${problem.operation}`,
        polynomialCheck(problem, result),
        problem.operation === "solve-polynomial"
          ? "Original expression, discriminant, root count and exact roots or Vieta relations establish the complete real solution set."
          : problem.operation === "solve-linear-inequality"
            ? "Original affine relation is compared with the returned solution relation at the boundary and on both sides; endpoint inclusion and constant truth values are checked."
          : problem.operation === "definite-integral"
            ? "Exact Lagrange interpolation and integrated basis values independently reconstruct the signed integral."
            : "Original AST evaluation and product-rule derivatives; identity tests use more distinct exact points than the polynomial degree. This is a bounded polynomial identity proof, not random sampling.",
      ),
    ];
  const a = problem.matrix.map((row) => row.map(exactRational)),
    r = result.value,
    n = a.length;
  let pass = false;
  if (problem.operation === "determinant")
    pass = r.type === "scalar" && r.value.equals(cofactorDeterminant(a));
  else if (problem.operation === "rank")
    pass = r.type === "scalar" && r.value.equals(q(rankByMinors(a)));
  else if (problem.operation === "inverse") {
    if (r.type === "singular") pass = cofactorDeterminant(a).zero;
    else if (
      r.type === "matrix" &&
      r.matrix.length === n &&
      r.matrix.every((row) => row.length === n)
    ) {
      pass = true;
      for (let i = 0; i < n; i++)
        for (let j = 0; j < n; j++) {
          const ab = a[i].reduce(
              (s, c, k) => s.add(c.mul(r.matrix[k][j])),
              ZERO,
            ),
            ba = r.matrix[i].reduce((s, c, k) => s.add(c.mul(a[k][j])), ZERO);
          if (
            !ab.equals(i === j ? ONE : ZERO) ||
            !ba.equals(i === j ? ONE : ZERO)
          )
            pass = false;
        }
    }
  } else if (r.type === "system") {
    const coefficients = a.map((row) => row.slice(0, -1)),
      variables = coefficients[0].length,
      rank = rankByMinors(coefficients),
      augmented = rankByMinors(a);
    if (augmented > rank)
      pass =
        r.classification === "none" &&
        r.particular.length === 0 &&
        r.nullspace.length === 0;
    else {
      const residual = (v: Rational[], homogeneous: boolean) =>
        v.length === variables &&
        coefficients.every((row, i) =>
          row
            .reduce((s, c, j) => s.add(c.mul(v[j])), ZERO)
            .equals(homogeneous ? ZERO : a[i][variables]),
        );
      pass =
        r.classification === (rank === variables ? "unique" : "infinite") &&
        residual(r.particular, false) &&
        r.nullspace.length === variables - rank &&
        r.nullspace.every((v) => residual(v, true)) &&
        (!r.nullspace.length ||
          rankByMinors(r.nullspace) === r.nullspace.length);
    }
  }
  return [
    check(
      `independent-${problem.operation}`,
      pass,
      "Independent cofactor/minor rank computations, original-system residuals, nullspace completeness and both inverse products as applicable. No solver row-reduction output is trusted.",
    ),
  ];
}
