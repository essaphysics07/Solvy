import { mathematicsPackage } from "./package.ts";
export const algebraKnowledge = mathematicsPackage(
  "solvy-polynomial-algebra",
  "polynomial",
  [
    {
      operation: "calculate",
      title: "Exact rational arithmetic",
      definition:
        "Rational arithmetic operates on reduced integer ratios, with a nonzero denominator.",
      display: "a/b+c/d=(ad+bc)/(bd)",
      conditions: [
        "Nonzero divisors",
        "Rational literals",
        "Bounded nonnegative integer powers",
      ],
      method: [
        "Parse bounded arithmetic AST",
        "Reduce using exact rational operations",
      ],
      verification:
        "Evaluate original AST independently of coefficient reduction",
      mistake:
        "Decimal inputs are exact decimals, not binary floating-point numbers.",
      example: { problem: "calculate 0.1 + 0.2", answer: "3/10" },
    },
    {
      operation: "simplify",
      title: "Univariate polynomials",
      definition:
        "A polynomial is a finite sum of nonnegative integer powers with scalar coefficients.",
      display: "p(x)=sum c_k x^k",
      conditions: [
        "One real variable",
        "Degree at most 12",
        "Constant nonzero divisors",
      ],
      method: ["Expand products", "Combine coefficients of equal powers"],
      verification: "Exact identity check at degree+1 distinct rational points",
      mistake:
        "Cancellation must not erase a variable-denominator restriction.",
      example: { problem: "expand (x+1)^2", answer: "1*x^2 + 2*x + 1" },
      prerequisites: ["calculate"],
    },
    {
      operation: "solve-polynomial",
      title: "Real quadratic equations",
      definition:
        "A quadratic equation has degree two; degenerate constant and linear cases require separate classification.",
      display: "x=(-b +/- sqrt(b^2-4ac))/(2a)",
      conditions: [
        "Degree at most 2",
        "Real solution set",
        "a != 0 for quadratic formula",
      ],
      method: [
        "Subtract equation sides",
        "Classify degree and discriminant",
        "Return exact rational roots or symbolic radicals",
      ],
      verification:
        "Original-expression interpolation, exact substitution, discriminant and Vieta completeness",
      mistake:
        "A negative discriminant gives no real roots, not no complex roots.",
      example: { problem: "solve x^2-5x+6=0", answer: "x = 2 or 3" },
      prerequisites: ["simplify"],
    },
    {
      operation: "solve-linear-inequality",
      title: "Real affine inequalities",
      definition:
        "An affine inequality defines a half-line, the full real line, or the empty set.",
      display: "a*x+b < 0; reverse relation when dividing by negative a",
      conditions: [
        "One real variable",
        "Degree at most one",
        "A single strict or non-strict inequality",
      ],
      method: [
        "Collect affine expression",
        "Classify zero coefficient",
        "Isolate variable and reverse relation if needed",
      ],
      verification:
        "Original boundary value and exact truth on both sides, including endpoint closure",
      mistake:
        "Multiplication or division by a negative number reverses the relation.",
      example: { problem: "solve -2x+3 <= 7", answer: "x >= -2" },
      prerequisites: ["simplify"],
    },
    ...(["minimum", "maximum"] as const).map((operation) => ({
      operation,
      title: "Quadratic extrema",
      definition:
        "The sign of the quadratic coefficient determines whether the vertex is a global minimum or maximum over the real line.",
      display: "x_v=-b/(2a), f(x_v)=c-b^2/(4a)",
      conditions: ["Degree at most 2", "Unrestricted real domain"],
      method: [
        "Classify constant, linear, or quadratic",
        "Check curvature sign",
        "Evaluate vertex or report unboundedness",
      ],
      verification:
        "Independent original-expression derivative, value and curvature checks",
      mistake: "A convex quadratic has no global maximum on the real line.",
      example: {
        problem: `find the ${operation} of x^2-4x+3`,
        answer:
          operation === "minimum"
            ? "minimum = -1 at x = 2"
            : "No global maximum (unbounded over the real numbers)",
      },
      prerequisites: ["simplify" as const],
    })),
  ],
  {
    title: "OpenStax College Algebra 2e",
    url: "https://openstax.org/books/college-algebra-2e/pages/5-1-quadratic-functions",
    locator:
      "Quadratic functions; exact coefficient arithmetic and bounded implementation documented separately",
  },
);
