import { solveFiniteData } from "./finite-data.ts";
import { Rational, ZERO, ONE } from "../computation/rational.ts";
import { exactRational } from "../computation/affine-equation.ts";
import {
  at,
  derivative,
  integral,
  squareRoot,
} from "../computation/polynomials.ts";
import { determinant, identity, rref } from "../computation/matrices.ts";
import type {
  MathematicsProblem,
  MathematicsResult,
  MathValue,
} from "./mathematics-contracts.ts";
export function solveMathematics(
  problem: MathematicsProblem,
): MathematicsResult {
  let value: MathValue;
  if (problem.family === "finite-data")
    return {
      kind: "mathematics",
      value: { type: "scalar", value: solveFiniteData(problem) },
    };
  if (problem.family === "matrix") {
    const a = problem.matrix.map((row) => row.map(exactRational)),
      n = a.length,
      columns = a[0].length;
    if (problem.operation === "determinant")
      value = { type: "scalar", value: determinant(a) };
    else if (problem.operation === "rank")
      value = {
        type: "scalar",
        value: new Rational(BigInt(rref(a).pivots.length)),
      };
    else if (problem.operation === "inverse") {
      const reduction = rref(
        a.map((row, i) => [...row, ...identity(n)[i]]),
        n,
      );
      value =
        reduction.pivots.length < n
          ? { type: "singular" }
          : {
              type: "matrix",
              matrix: reduction.matrix.map((row) => row.slice(n)),
            };
    } else {
      const variables = columns - 1,
        reduction = rref(a, variables),
        rows = reduction.matrix;
      if (
        rows.some(
          (row) =>
            row.slice(0, variables).every((x) => x.zero) &&
            !row[variables].zero,
        )
      )
        value = {
          type: "system",
          classification: "none",
          particular: [],
          nullspace: [],
        };
      else {
        const particular = Array.from({ length: variables }, () => ZERO);
        reduction.pivots.forEach((p, i) => {
          particular[p] = rows[i][variables];
        });
        const free = Array.from({ length: variables }, (_, i) => i).filter(
          (i) => !reduction.pivots.includes(i),
        );
        const nullspace = free.map((f) => {
          const v = Array.from({ length: variables }, () => ZERO);
          v[f] = ONE;
          reduction.pivots.forEach((p, i) => {
            v[p] = rows[i][f].neg();
          });
          return v;
        });
        value = {
          type: "system",
          classification: free.length ? "infinite" : "unique",
          particular,
          nullspace,
        };
      }
    }
  } else {
    const p = problem.coefficients.map(exactRational),
      c = p[0],
      b = p[1] ?? ZERO,
      a = p[2] ?? ZERO;
    switch (problem.operation) {
      case "calculate":
        value = { type: "scalar", value: c };
        break;
      case "simplify":
        value = {
          type: "polynomial",
          coefficients: p,
          constantOfIntegration: false,
        };
        break;
      case "differentiate":
        value = {
          type: "polynomial",
          coefficients: derivative(p),
          constantOfIntegration: false,
        };
        break;
      case "integrate":
        value = {
          type: "polynomial",
          coefficients: integral(p),
          constantOfIntegration: true,
        };
        break;
      case "definite-integral": {
        const f = integral(p);
        value = {
          type: "scalar",
          value: at(f, exactRational(problem.bounds!.upper)).sub(
            at(f, exactRational(problem.bounds!.lower)),
          ),
        };
        break;
      }
      case "solve-linear-inequality": {
        const relation = problem.relation!;
        if (b.zero) {
          const sign = c.n < 0n ? -1 : c.n > 0n ? 1 : 0;
          const truth =
            relation === "<"
              ? sign < 0
              : relation === "<="
                ? sign <= 0
                : relation === ">"
                  ? sign > 0
                  : sign >= 0;
          value = { type: "interval", classification: truth ? "all" : "none" };
        } else {
          const reversed = {
            "<": ">",
            "<=": ">=",
            ">": "<",
            ">=": "<=",
          } as const;
          value = {
            type: "interval",
            classification: "half-line",
            bound: c.neg().div(b),
            relation: b.n < 0n ? reversed[relation] : relation,
          };
        }
        break;
      }
      case "solve-polynomial": {
        if (a.zero)
          value = b.zero
            ? {
                type: "roots",
                classification: c.zero ? "infinite" : "none",
                rational: [],
              }
            : {
                type: "roots",
                classification: "finite",
                rational: [c.neg().div(b)],
              };
        else {
          const twoA = new Rational(2n).mul(a),
            d = b.mul(b).sub(new Rational(4n).mul(a).mul(c));
          if (d.n < 0n)
            value = { type: "roots", classification: "none", rational: [] };
          else {
            const root = squareRoot(d),
              center = b.neg().div(twoA);
            value = root
              ? {
                  type: "roots",
                  classification: "finite",
                  rational: d.zero
                    ? [center]
                    : [
                        b.neg().sub(root).div(twoA),
                        b.neg().add(root).div(twoA),
                      ],
                }
              : {
                  type: "roots",
                  classification: "finite",
                  rational: [],
                  surd: { center, radicand: d, scale: ONE.div(twoA) },
                };
          }
        }
        break;
      }
      case "minimum":
      case "maximum": {
        if (a.zero && b.zero)
          value = { type: "extremum", classification: "constant", value: c };
        else if (
          a.zero ||
          (problem.operation === "minimum" ? a.n < 0n : a.n > 0n)
        )
          value = { type: "extremum", classification: "unbounded" };
        else {
          const x = b.neg().div(new Rational(2n).mul(a));
          value = {
            type: "extremum",
            classification: "attained",
            at: x,
            value: at(p, x),
          };
        }
        break;
      }
    }
  }
  return { kind: "mathematics", value };
}
