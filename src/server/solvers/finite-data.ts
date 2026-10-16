import { Rational, ZERO, ONE } from "../computation/rational.ts";
import { exactRational } from "../computation/affine-equation.ts";
import {
  choose,
  permutations,
  mean,
  variance,
  power,
} from "../computation/finite-data.ts";
import type { DataProblem } from "./mathematics-contracts.ts";
export function solveFiniteData(problem: DataProblem): Rational {
  const d = problem.data;
  if (d.kind === "sample") {
    const values = d.values.map(exactRational);
    return problem.operation === "mean"
      ? mean(values)
      : variance(values, problem.operation === "sample-variance");
  }
  if (d.kind === "sequence") {
    const a = exactRational(d.first),
      step = exactRational(d.increment),
      n = new Rational(BigInt(d.count));
    if (!d.count) return ZERO;
    return problem.operation === "arithmetic-sum"
      ? n
          .mul(a.mul(new Rational(2n)).add(n.sub(ONE).mul(step)))
          .div(new Rational(2n))
      : step.equals(ONE)
        ? a.mul(n)
        : a.mul(ONE.sub(power(step, d.count))).div(ONE.sub(step));
  }
  if (problem.operation === "combinations") return choose(d.n, d.k);
  if (problem.operation === "permutations") return permutations(d.n, d.k);
  const p = exactRational(d.probability!),
    end = problem.operation === "binomial-at-least" ? d.n : d.k;
  let result = ZERO;
  for (let k = d.k; k <= end; k++)
    result = result.add(
      choose(d.n, k)
        .mul(power(p, k))
        .mul(power(ONE.sub(p), d.n - k)),
    );
  return result;
}
