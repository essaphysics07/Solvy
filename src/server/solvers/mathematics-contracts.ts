import type { Expression } from "../computation/expression.ts";
import type { Rational } from "../computation/rational.ts";
export type PolynomialOperation =
  | "calculate"
  | "simplify"
  | "differentiate"
  | "integrate"
  | "definite-integral"
  | "solve-polynomial"
  | "solve-linear-inequality"
  | "minimum"
  | "maximum";
export type MatrixOperation =
  | "determinant"
  | "inverse"
  | "rank"
  | "linear-system";
export type DataOperation =
  | "mean"
  | "population-variance"
  | "sample-variance"
  | "arithmetic-sum"
  | "geometric-sum"
  | "combinations"
  | "permutations"
  | "binomial-probability"
  | "binomial-at-least";
export type MathOperation =
  | PolynomialOperation
  | MatrixOperation
  | DataOperation;
interface MathBase {
  kind: "mathematics";
  concept: string;
  pattern: string;
  original: string;
  assumptions: string[];
  difficulty: "introductory";
}
export interface PolynomialProblem extends MathBase {
  family: "polynomial";
  operation: PolynomialOperation;
  variable: string;
  expression: Expression;
  coefficients: string[];
  bounds?: { lower: string; upper: string };
  relation?: "<" | "<=" | ">" | ">=";
}
export interface MatrixProblem extends MathBase {
  family: "matrix";
  operation: MatrixOperation;
  matrix: string[][];
}
export interface DataProblem extends MathBase {
  family: "finite-data";
  operation: DataOperation;
  data:
    | { kind: "sample"; values: string[] }
    | { kind: "sequence"; first: string; increment: string; count: number }
    | { kind: "counting"; n: number; k: number; probability?: string };
}
export type MathematicsProblem =
  | PolynomialProblem
  | MatrixProblem
  | DataProblem;
export type MathValue =
  | {
      type: "interval";
      classification: "all" | "none" | "half-line";
      bound?: Rational;
      relation?: "<" | "<=" | ">" | ">=";
    }
  | { type: "scalar"; value: Rational }
  | {
      type: "polynomial";
      coefficients: Rational[];
      constantOfIntegration: boolean;
    }
  | {
      type: "roots";
      classification: "none" | "infinite" | "finite";
      rational: Rational[];
      surd?: { center: Rational; radicand: Rational; scale: Rational };
    }
  | {
      type: "extremum";
      classification: "attained" | "unbounded" | "constant";
      value?: Rational;
      at?: Rational;
    }
  | { type: "matrix"; matrix: Rational[][] }
  | { type: "singular" }
  | {
      type: "system";
      classification: "unique" | "none" | "infinite";
      particular: Rational[];
      nullspace: Rational[][];
    };
export interface MathematicsResult {
  kind: "mathematics";
  value: MathValue;
}

export const mathConcept = (operation: MathOperation) =>
  ({
    mean: "arithmetic-mean",
    "population-variance": "population-variance",
    "sample-variance": "sample-variance",
    "arithmetic-sum": "arithmetic-sequence-sum",
    "geometric-sum": "geometric-sequence-sum",
    combinations: "combinations",
    permutations: "permutations",
    "binomial-probability": "binomial-distribution",
    "binomial-at-least": "binomial-distribution",
    calculate: "exact-arithmetic",
    simplify: "polynomial-expression",
    differentiate: "polynomial-derivative",
    integrate: "polynomial-antiderivative",
    "definite-integral": "polynomial-definite-integral",
    "solve-linear-inequality": "real-linear-inequality",
    "solve-polynomial": "real-quadratic-equation",
    minimum: "quadratic-extrema",
    maximum: "quadratic-extrema",
    determinant: "matrix-determinant",
    inverse: "matrix-inverse",
    rank: "matrix-rank",
    "linear-system": "rational-linear-system",
  })[operation];
export const mathPattern = (op: MathOperation) => `math-${op}-v1`;
