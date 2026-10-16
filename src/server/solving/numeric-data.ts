import { Rational } from "../computation/rational.ts";
/** Preserve decimal lexemes before JavaScript JSON parsing. Unquoted decimals or
 * exponents could round to a safe integer (1.0000000000000001 -> 1), so reject
 * their syntax before conversion. Users can quote any exact decimal/fraction. */
export function parseExactArrayJSON(source: string): unknown {
  if (source.length > 1000) throw new Error("Numeric data size");
  const outsideStrings = source.replace(/"(?:[^"\\]|\\.)*"/g, '""');
  if (!/^[\s\[\],"\d-]*$/.test(outsideStrings))
    throw new Error("Quote exact decimal and fraction entries");
  return JSON.parse(source);
}
/** Normalize input literals to canonical rational data; internal decoders remain strict. */
export function parseRationalLiteral(source: string): Rational {
  if (source.length > 80) throw new Error("Rational literal size");
  const fraction = /^([+-]?\d+)\/([+-]?\d+)$/.exec(source);
  return fraction
    ? new Rational(BigInt(fraction[1]), BigInt(fraction[2]))
    : Rational.parse(source);
}
