import { mathematicsPackage } from "./package.ts";
export const linearAlgebraKnowledge = mathematicsPackage(
  "solvy-rational-linear-algebra",
  "matrix",
  [
    {
      operation: "determinant",
      title: "Determinants",
      definition:
        "The determinant of a square matrix is an alternating multilinear scalar; it vanishes exactly for singular matrices.",
      display: "det(A)=sum_sigma sign(sigma)*product_i A[i,sigma(i)]",
      conditions: ["Square rational matrix of order at most 5"],
      method: ["Pivoted elimination", "Track row swaps and diagonal products"],
      verification: "Independent cofactor expansion",
      mistake: "A row swap changes determinant sign.",
      example: { problem: "determinant [[1,2],[3,4]]", answer: "-2" },
    },
    {
      operation: "inverse",
      title: "Matrix inverses",
      definition:
        "An inverse B satisfies AB=BA=I and exists only for a nonsingular square matrix.",
      display: "A*A^-1=I",
      conditions: ["Square rational matrix of order at most 5"],
      method: [
        "Reduce augmented matrix [A|I]",
        "Check full pivot rank",
        "Extract inverse",
      ],
      verification:
        "Exact products in both orders; cofactor determinant for singular classification",
      mistake: "A singular matrix has no inverse.",
      example: {
        problem: "inverse [[1,2],[3,4]]",
        answer: "[[-2, 1], [3/2, -1/2]]",
      },
      prerequisites: ["determinant"],
    },
    {
      operation: "rank",
      title: "Matrix rank",
      definition:
        "Rank is the dimension of the column space, equivalently the largest order of a nonzero minor.",
      display: "rank(A)=max{k: some k-minor is nonzero}",
      conditions: ["Rational matrix at most 5 by 5"],
      method: ["Exact row reduction", "Count pivot columns"],
      verification: "Independently enumerate minors, largest first",
      mistake: "Count pivots rather than nonzero original rows.",
      example: { problem: "rank [[1,2],[2,4]]", answer: "1" },
      prerequisites: ["determinant"],
    },
    {
      operation: "linear-system",
      title: "Rational linear systems",
      definition:
        "A consistent linear system has an affine solution set formed by a particular solution plus the nullspace.",
      display: "A*x=b; x=x0+sum t_i*v_i",
      conditions: [
        "At most 5 equations and 5 variables",
        "Last augmented column is b",
        "Real solutions",
      ],
      method: [
        "Row-reduce [A|b]",
        "Classify inconsistency or free variables",
        "Construct particular solution and nullspace basis",
      ],
      verification:
        "Independent ranks by minors, original-system residual and nullspace dimension/independence",
      mistake:
        "A free variable means infinitely many solutions only when the system is consistent.",
      example: {
        problem: "solve linear system [[2,1,5],[1,-1,1]]",
        answer: "x1 = 2, x2 = 1",
      },
      prerequisites: ["rank"],
    },
  ],
  {
    title: "OpenStax College Algebra 2e",
    url: "https://openstax.org/books/college-algebra-2e/pages/7-6-solving-systems-with-gaussian-elimination",
    locator:
      "7.6 Gaussian elimination; 7.7 inverses; 7.8 determinants; rank/nullspace implementation uses exact minors",
  },
);
