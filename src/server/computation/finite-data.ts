import { Rational, ZERO, ONE } from "./rational.ts";
export function boundedInteger(n: number, max = 100): number {
  if (!Number.isSafeInteger(n) || n < 0 || n > max)
    throw new Error("Integer resource/domain limit");
  return n;
}
export function power(value: Rational, n: number): Rational {
  boundedInteger(n);
  let out = ONE,
    base = value;
  while (n) {
    if (n % 2) out = out.mul(base);
    n = Math.floor(n / 2);
    if (n) base = base.mul(base);
  }
  return out;
}
export function choose(n: number, k: number): Rational {
  boundedInteger(n);
  boundedInteger(k, n);
  let value = ONE;
  for (let i = 1; i <= Math.min(k, n - k); i++)
    value = value
      .mul(new Rational(BigInt(n - i + 1)))
      .div(new Rational(BigInt(i)));
  return value;
}
export function permutations(n: number, k: number): Rational {
  boundedInteger(n);
  boundedInteger(k, n);
  let out = ONE;
  for (let i = 0; i < k; i++) out = out.mul(new Rational(BigInt(n - i)));
  return out;
}
export function mean(values: readonly Rational[]): Rational {
  if (!values.length || values.length > 100) throw new Error("Sample size");
  return values
    .reduce((a, b) => a.add(b), ZERO)
    .div(new Rational(BigInt(values.length)));
}
export function variance(
  values: readonly Rational[],
  sample: boolean,
): Rational {
  const average = mean(values),
    divisor = values.length - (sample ? 1 : 0);
  if (divisor < 1) throw new Error("Sample variance requires two observations");
  return values
    .reduce((sum, v) => {
      const d = v.sub(average);
      return sum.add(d.mul(d));
    }, ZERO)
    .div(new Rational(BigInt(divisor)));
}
