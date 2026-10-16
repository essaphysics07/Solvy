import type {
  ExplanationLevel,
  SolutionContent,
} from "../../shared/contracts/solution.ts";
import type {
  MathematicsProblem,
  MathematicsResult,
  MathValue,
} from "../solvers/mathematics-contracts.ts";
import { formatPolynomial } from "../computation/polynomials.ts";
import { exactRational } from "../computation/affine-equation.ts";
function output(p: MathematicsProblem, r: MathValue, latex = false): string {
  const scalar = (v: { toString(): string; latex(): string }) =>
    latex ? v.latex() : v.toString();
  switch (r.type) {
    case "interval":
      return r.classification === "none"
        ? latex
          ? "\\varnothing"
          : "No real solution"
        : r.classification === "all"
          ? latex
            ? "\\mathbb{R}"
            : "All real numbers"
          : `${p.family === "polynomial" ? p.variable : "x"} ${latex ? (r.relation === "<=" ? "\\le" : r.relation === ">=" ? "\\ge" : r.relation) : r.relation} ${scalar(r.bound!)}`;
    case "scalar":
      return scalar(r.value);
    case "polynomial":
      return (
        formatPolynomial(
          r.coefficients,
          p.family === "polynomial" ? p.variable : "x",
          latex,
        ) + (r.constantOfIntegration ? " + C" : "")
      );
    case "roots": {
      if (r.classification !== "finite")
        return latex
          ? r.classification === "none"
            ? "\\varnothing"
            : "\\mathbb{R}"
          : r.classification === "none"
            ? "No real solution"
            : "All real numbers";
      const variable = p.family === "polynomial" ? p.variable : "x";
      if (r.surd) {
        const { center, scale, radicand } = r.surd;
        return `${variable} = ${scalar(center)} ${latex ? "\\pm" : "+/-"} (${scalar(scale)})${latex ? `\\sqrt{${scalar(radicand)}}` : `*sqrt(${scalar(radicand)})`}`;
      }
      return `${variable} = ${r.rational.map(scalar).join(latex ? "\\quad \\text{or}\\quad " : " or ")}`;
    }
    case "extremum":
      return r.classification === "unbounded"
        ? latex
          ? "\\text{No global extremum of the requested kind}"
          : `No global ${p.operation} (unbounded over the real numbers)`
        : r.classification === "constant"
          ? latex
            ? `f(x)=${scalar(r.value!)}`
            : `${p.operation} = ${scalar(r.value!)} (every real input)`
          : latex
            ? `f(${scalar(r.at!)})=${scalar(r.value!)}`
            : `${p.operation} = ${scalar(r.value!)} at ${p.family === "polynomial" ? p.variable : "x"} = ${scalar(r.at!)}`;
    case "singular":
      return latex
        ? "\\text{Singular: no inverse}"
        : "Singular matrix: no inverse";
    case "matrix":
      return latex
        ? `\\begin{bmatrix}${r.matrix.map((row) => row.map(scalar).join(" & ")).join(" \\\\ ")}\\end{bmatrix}`
        : `[${r.matrix.map((row) => `[${row.map(scalar).join(", ")}]`).join(", ")}]`;
    case "system": {
      if (r.classification === "none")
        return latex ? "\\varnothing" : "No solution";
      if (r.classification === "unique")
        return r.particular
          .map(
            (v, i) => `${latex ? `x_{${i + 1}}` : `x${i + 1}`} = ${scalar(v)}`,
          )
          .join(latex ? ",\\quad " : ", ");
      const vector = (v: typeof r.particular) =>
        latex
          ? `\\begin{bmatrix}${v.map(scalar).join(" \\\\ ")}\\end{bmatrix}`
          : `(${v.map(scalar).join(", ")})`;
      return (
        `x = ${vector(r.particular)}${r.nullspace.map((v, i) => ` + ${latex ? `t_{${i + 1}}` : `t${i + 1}`} ${vector(v)}`).join("")}` +
        (latex ? ",\\quad t_i\\in\\mathbb{R}" : "; all parameters real")
      );
    }
  }
}
const methods: Record<MathematicsProblem["operation"], string> = {
  mean: "Add all observations and divide by the number of observations.",
  "population-variance":
    "Average the squared deviations from the mean, using denominator n.",
  "sample-variance":
    "Sum squared deviations from the sample mean and divide by n-1.",
  "arithmetic-sum":
    "Use n times the average of the first and last terms; n=0 gives an empty sum.",
  "geometric-sum":
    "Use the finite geometric sum, treating ratio 1 separately to avoid division by zero.",
  combinations:
    "Count unordered selections without replacement using n choose k.",
  permutations: "Count ordered selections without replacement using n!/(n-k)!.",
  "binomial-probability":
    "For n independent trials with the same probability p, multiply n choose k by p^k and (1-p)^(n-k).",
  "binomial-at-least":
    "Sum the binomial probabilities from k through n successes, including the boundary k.",
  calculate: "Evaluate in order using exact reduced fractions.",
  simplify:
    "Expand products and combine equal powers without changing the expression's domain.",
  differentiate:
    "For each term, multiply by its exponent and lower that exponent by one. Constants differentiate to zero.",
  integrate:
    "For each term, raise its exponent by one and divide by the new exponent. Include the arbitrary constant C.",
  "definite-integral":
    "Find a polynomial antiderivative and subtract its lower-bound value from its upper-bound value.",
  "solve-linear-inequality":
    "Collect to one affine expression. Dividing by a negative coefficient reverses the inequality; a zero coefficient requires a truth-value check.",
  "solve-polynomial":
    "Collect the equation into a polynomial equal to zero. Handle zero coefficients before applying the quadratic formula; the discriminant determines real root count.",
  minimum:
    "Check the leading coefficient and the unrestricted real domain. A convex quadratic attains its minimum at its vertex.",
  maximum:
    "Check the leading coefficient and the unrestricted real domain. A concave quadratic attains its maximum at its vertex.",
  determinant:
    "Use elimination while tracking pivot values and changes of sign from row swaps.",
  inverse:
    "Row-reduce [A | I]. A missing pivot means the square matrix is singular.",
  rank: "Row-reduce with exact fractions and count pivots.",
  "linear-system":
    "Treat the last column as the right-hand side. Row-reduce, check consistency, and retain all free parameters.",
};
export function explainMathematics(
  problem: MathematicsProblem,
  result: MathematicsResult,
  level: ExplanationLevel,
): SolutionContent {
  const steps = [
    { title: "Apply the method", explanation: methods[problem.operation] },
    {
      title: "Exact result",
      explanation:
        "The calculation uses exact fractions; radicals and free parameters remain symbolic.",
      expression: output(problem, result.value, true),
    },
  ];
  if (level !== "simple" && problem.family === "polynomial")
    steps.unshift({
      title: "Represent the problem",
      explanation:
        problem.operation === "solve-polynomial" ||
        problem.operation === "solve-linear-inequality"
          ? "Subtract the right side from the left; compare this expression with zero using the original relation."
          : "Collect the original expression by powers of its real variable.",
      expression: formatPolynomial(
        problem.coefficients.map(exactRational),
        problem.variable,
        true,
      ),
    } as (typeof steps)[number]);
  if (level === "deep-dive")
    steps.push({
      title: "Scope of verification",
      explanation:
        problem.family === "finite-data"
          ? "Enumeration, Pascal recursion, independent Bernoulli convolution or raw second moments check the formula under the stated assumptions."
          : problem.family === "matrix"
            ? "Independent cofactor/minor calculations and original-matrix residuals check the result, including solution-set completeness."
            : "Original-expression evaluations and independent differentiation or interpolation check the result. The checks apply to the parsed polynomial over the real numbers.",
    });
  return {
    title: `Exact ${problem.operation.replaceAll("-", " ")}`,
    answer: output(problem, result.value),
    steps,
    note:
      problem.family === "finite-data"
        ? `Verified exact finite-data calculation. ${problem.assumptions.join("; ")}.`
        : problem.family === "matrix"
          ? "Exact rational matrix calculation. For systems, the final input column is the right-hand side; solution parameters range over the reals."
          : "Verified within the bounded polynomial model over the real numbers. Input interpretation is outside the independent mathematical checks.",
  };
}
