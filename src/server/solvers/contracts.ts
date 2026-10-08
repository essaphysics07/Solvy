import type { AffineEquation } from "../computation/affine-equation.ts";
import type { Rational } from "../computation/rational.ts";
import type { Dimension } from "../knowledge/schema.ts";
import type { ProblemRepresentation } from "../solving/problem.ts";

export interface QuantityInput {
  value: string;
  unit: string;
  evidence: string;
}

export interface NewtonProblem {
  kind: "newton";
  concept: "newton-second-law";
  pattern: "mass-acceleration-to-net-force";
  mass: QuantityInput;
  acceleration: QuantityInput;
  unknown: "net-force";
  assumptions: string[];
  difficulty: "introductory";
}

export interface LinearProblem extends AffineEquation {
  kind: "linear";
  concept: "linear-equation";
  pattern: "one-variable-affine";
  assumptions: string[];
  difficulty: "introductory";
}

export type UnderstoodProblem = NewtonProblem | LinearProblem;

export type Understanding =
  | {
      status: "understood";
      problem: UnderstoodProblem;
      representation: ProblemRepresentation;
    }
  | {
      status: "clarification";
      message: string;
    }
  | {
      status: "unsupported";
      reason: string;
    };

export interface NewtonResult {
  kind: "newton";
  value: Rational;
  massSI: Rational;
  accelerationSI: Rational;
  unit: string;
  dimension: Dimension;
}

export type LinearResult =
  | {
      kind: "linear";
      classification: "unique";
      value: Rational;
      coefficient: Rational;
      rhs: Rational;
    }
  | {
      kind: "linear";
      classification: "none" | "infinite";
      coefficient: Rational;
      rhs: Rational;
    };

export type ComputedResult = NewtonResult | LinearResult;