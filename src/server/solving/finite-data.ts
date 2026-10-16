import { parseExactArrayJSON, parseRationalLiteral } from "./numeric-data.ts";
import type {
  DataProblem,
  DataOperation,
} from "../solvers/mathematics-contracts.ts";
import { mathConcept, mathPattern } from "../solvers/mathematics-contracts.ts";
const scalar = parseRationalLiteral;
/** Small declarative request forms have named semantic parameters; no inference
 * about independence, replacement or population/sample conventions is hidden. */
export function parseFiniteData(
  original: string,
  source: string,
): DataProblem | undefined {
  let operation: DataOperation, data: DataProblem["data"];
  const sample =
    /^(mean|population variance|sample variance)\s+(\[.*\])$/i.exec(source);
  const seq =
    /^(arithmetic|geometric) sum\s+a=([+\-\d./]+),\s*(d|r)=([+\-\d./]+),\s*n=(\d+)$/i.exec(
      source,
    );
  const count =
    /^(combinations|permutations|binomial probability|binomial at least)\s+n=(\d+),\s*k=(\d+)(?:,\s*p=([+\-\d./]+))?$/i.exec(
      source,
    );
  if (sample) {
    operation = sample[1].toLowerCase().replaceAll(" ", "-") as DataOperation;
    const raw: unknown = parseExactArrayJSON(sample[2]);
    if (
      !Array.isArray(raw) ||
      raw.length < 1 ||
      raw.length > 100 ||
      (operation === "sample-variance" && raw.length < 2)
    )
      throw new Error("Sample size");
    data = {
      kind: "sample",
      values: raw.map((x: unknown) => {
        if (typeof x === "number" && Number.isSafeInteger(x)) return String(x);
        if (typeof x !== "string" || x.length > 80)
          throw new Error("Use exact quoted decimals/fractions");
        return scalar(x).toString();
      }),
    };
  } else if (seq) {
    operation =
      seq[1].toLowerCase() === "arithmetic"
        ? "arithmetic-sum"
        : "geometric-sum";
    if (
      seq[3].toLowerCase() !== (operation === "arithmetic-sum" ? "d" : "r") ||
      Number(seq[5]) > 100
    )
      throw new Error("Sequence parameters");
    data = {
      kind: "sequence",
      first: scalar(seq[2]).toString(),
      increment: scalar(seq[4]).toString(),
      count: Number(seq[5]),
    };
  } else if (count) {
    operation = count[1].toLowerCase().replaceAll(" ", "-") as DataOperation;
    const n = Number(count[2]),
      k = Number(count[3]),
      binomial = operation.startsWith("binomial");
    if (
      !Number.isSafeInteger(n) ||
      !Number.isSafeInteger(k) ||
      n > 100 ||
      k > n ||
      (binomial && n > 50) ||
      binomial !== !!count[4]
    )
      throw new Error("Counting parameters");
    const probability = count[4] ? scalar(count[4]) : undefined;
    if (probability && (probability.n < 0n || probability.n > probability.d))
      throw new Error("Probability domain");
    data = {
      kind: "counting",
      n,
      k,
      ...(probability ? { probability: probability.toString() } : {}),
    };
  } else return undefined;
  return {
    kind: "mathematics",
    family: "finite-data",
    operation,
    data,
    original,
    concept: mathConcept(operation),
    pattern: mathPattern(operation),
    difficulty: "introductory",
    assumptions: operation.startsWith("binomial")
      ? [
          "Independent Bernoulli trials",
          "Identical success probability",
          "Exact rational probability",
        ]
      : operation.includes("variance")
        ? [
            operation === "sample-variance"
              ? "Sample variance with n-1 denominator"
              : "Population variance with n denominator",
          ]
        : ["Exact rational data", "Explicit finite parameters"],
  };
}
