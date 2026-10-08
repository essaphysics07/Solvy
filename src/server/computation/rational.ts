/** Bounded exact rationals. No eval, dynamic code, or floating-point equality. */
function gcd(a: bigint, b: bigint): bigint {
  a = a < 0n ? -a : a; b = b < 0n ? -b : b;
  while (b !== 0n) { const remainder = a % b; a = b; b = remainder; }
  return a;
}
export class Rational {
  readonly n: bigint;
  readonly d: bigint;
  constructor(n: bigint, d = 1n) {
    if (d === 0n) throw new Error("Division by zero");
    if (n.toString().length > 256 || d.toString().length > 256) throw new Error("Number exceeds supported precision");
    if (d < 0n) { n = -n; d = -d; }
    const divisor = gcd(n, d);
    this.n = n / divisor; this.d = d / divisor;
  }
  static parse(value: string): Rational {
    if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(value) || value.length > 40) throw new Error("Invalid or oversized number");
    const negative = value.startsWith("-");
    const unsigned = value.replace(/^[+-]/, "");
    const [whole, decimal = ""] = unsigned.split(".");
    return new Rational(BigInt((whole || "0") + decimal) * (negative ? -1n : 1n), 10n ** BigInt(decimal.length));
  }
  add(other: Rational) { return new Rational(this.n * other.d + other.n * this.d, this.d * other.d); }
  sub(other: Rational) { return new Rational(this.n * other.d - other.n * this.d, this.d * other.d); }
  mul(other: Rational) { return new Rational(this.n * other.n, this.d * other.d); }
  div(other: Rational) { return new Rational(this.n * other.d, this.d * other.n); }
  neg() { return new Rational(-this.n, this.d); }
  equals(other: Rational) { return this.n === other.n && this.d === other.d; }
  get zero() { return this.n === 0n; }
  toString() { return this.d === 1n ? String(this.n) : `${this.n}/${this.d}`; }
  latex() { return this.d === 1n ? String(this.n) : `\\frac{${this.n}}{${this.d}}`; }
}
export const ZERO = new Rational(0n);
export const ONE = new Rational(1n);
