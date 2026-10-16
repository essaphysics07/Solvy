import { Rational, ZERO, ONE } from "../computation/rational.ts";
import { exactRational } from "../computation/affine-equation.ts";
import type { DataProblem } from "../solvers/mathematics-contracts.ts";
/** Independent checks: sequence enumeration vs closed forms, raw second moments
 * vs centered moments, Pascal recursion vs multiplicative combinations, and
 * Bernoulli distribution convolution vs the binomial formula. */
export function finiteDataExpected(problem: DataProblem): Rational {
  const d = problem.data;
  if (d.kind === "sample") {
    const xs = d.values.map(exactRational),
      n = new Rational(BigInt(xs.length));
    const sum = xs.reduce((a, b) => a.add(b), ZERO);
    if (problem.operation === "mean") return sum.div(n);
    const squares = xs.reduce((a, b) => a.add(b.mul(b)), ZERO);
    return squares
      .sub(sum.mul(sum).div(n))
      .div(n.sub(problem.operation === "sample-variance" ? ONE : ZERO));
  }
  if (d.kind === "sequence") {
    let term = exactRational(d.first),
      sum = ZERO;
    const increment = exactRational(d.increment);
    for (let i = 0; i < d.count; i++) {
      sum = sum.add(term);
      if (i + 1 < d.count)
        term =
          problem.operation === "arithmetic-sum"
            ? term.add(increment)
            : term.mul(increment);
    }
    return sum;
  }
  if (problem.operation === "combinations") {
    let row = [ONE];
    for (let i = 0; i < d.n; i++)
      row = Array.from({ length: row.length + 1 }, (_, j) =>
        (row[j - 1] ?? ZERO).add(row[j] ?? ZERO),
      );
    return row[d.k];
  }
  if (problem.operation === "permutations") {
    function factorial(n: number) {
      let out = 1n;
      for (let i = 2; i <= n; i++) out *= BigInt(i);
      return out;
    }
    return new Rational(factorial(d.n), factorial(d.n - d.k));
  }
  const p = exactRational(d.probability!),
    failure = ONE.sub(p);
  let distribution = [ONE];
  for (let i = 0; i < d.n; i++)
    distribution = Array.from({ length: distribution.length + 1 }, (_, j) =>
      (distribution[j] ?? ZERO)
        .mul(failure)
        .add((distribution[j - 1] ?? ZERO).mul(p)),
    );
  return problem.operation === "binomial-at-least"
    ? distribution.slice(d.k).reduce((a, b) => a.add(b), ZERO)
    : distribution[d.k];
}
