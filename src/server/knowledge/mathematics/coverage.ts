/** Coverage inventory, not mathematical knowledge or a claim that AI answers are verified.
 * Only code-shipped pattern/method/checker links authorize deterministic execution. */
export const mathematicsCoverage = [
  {
    domain: "foundations",
    status: "partial",
    implemented: [
      "exact rational arithmetic",
      "bounded integer powers",
      "numeric percentages",
    ],
    unsupported: [
      "general logarithms",
      "scientific-notation input",
      "general radicals",
    ],
  },
  {
    domain: "algebra",
    status: "partial",
    implemented: [
      "affine equations",
      "affine inequalities",
      "polynomial expansion",
      "real quadratic solution sets",
    ],
    unsupported: [
      "higher-degree roots",
      "rational functions with variable denominators",
      "absolute value",
      "parameterized equations",
    ],
  },
  {
    domain: "functions",
    status: "partial",
    implemented: ["quadratic extrema on the real line"],
    unsupported: [
      "general domains/ranges",
      "composition",
      "inverse and piecewise functions",
      "constrained optimization",
    ],
  },
  {
    domain: "sequences",
    status: "partial",
    implemented: ["finite arithmetic sums", "finite geometric sums"],
    unsupported: ["general recurrences", "infinite-series convergence"],
  },
  {
    domain: "linear-algebra",
    status: "partial",
    implemented: [
      "small rational determinants",
      "inverse",
      "rank",
      "complete linear-system solution sets",
    ],
    unsupported: [
      "natural-language simultaneous-equation extraction",
      "eigenvalues/eigenvectors",
      "general vector-space proofs",
    ],
  },
  {
    domain: "calculus",
    status: "partial",
    implemented: [
      "polynomial derivatives",
      "polynomial antiderivatives",
      "definite polynomial integrals",
    ],
    unsupported: [
      "general limits",
      "transcendental calculus",
      "implicit differentiation",
      "Taylor series",
    ],
  },
  {
    domain: "probability-statistics",
    status: "partial",
    implemented: [
      "combinations/permutations without replacement",
      "explicit binomial mass and tails",
      "mean",
      "population/sample variance",
    ],
    unsupported: [
      "arbitrary probability word problems",
      "Bayes inference",
      "other distributions",
      "statistical inference",
    ],
  },
  ...[
    "trigonometry",
    "coordinate-geometry",
    "euclidean-geometry",
    "vectors",
    "complex-numbers",
    "multivariable-calculus",
    "differential-equations",
    "numerical-methods",
    "discrete-mathematics-beyond-counting",
    "real-analysis",
    "complex-analysis",
    "abstract-algebra",
    "PDEs",
    "Fourier-analysis",
    "optimization-beyond-quadratics",
    "tensors",
  ].map((domain) => ({
    domain,
    status: "unsupported",
    implemented: [],
    unsupported: [
      "No deterministic implementation in this milestone; provider fallback remains available",
    ],
  })),
] as const;
