import { mathematicsPackage } from "./package.ts";
export const calculusKnowledge = mathematicsPackage(
  "solvy-polynomial-calculus",
  "polynomial",
  [
    {
      operation: "differentiate",
      title: "Polynomial differentiation",
      definition:
        "The derivative of a polynomial follows from linearity and the integer power rule.",
      display: "D(c*x^n)=n*c*x^(n-1)",
      conditions: ["Polynomial of degree at most 12"],
      method: [
        "Collect polynomial coefficients",
        "Multiply each coefficient by its exponent",
        "Lower each exponent by one",
      ],
      verification:
        "Independent AST product/quotient-rule differentiation evaluated at enough exact points",
      mistake: "The derivative of a constant is zero.",
      example: { problem: "differentiate x^3-2x", answer: "3*x^2 - 2" },
    },
    {
      operation: "integrate",
      title: "Polynomial antiderivatives",
      definition:
        "All antiderivatives on the real line of a polynomial differ by an additive constant.",
      display: "integral c*x^n dx = c*x^(n+1)/(n+1)+C",
      conditions: ["Polynomial of degree at most 12"],
      method: [
        "Raise each exponent by one",
        "Divide coefficient by new exponent",
        "Retain arbitrary integration constant",
      ],
      verification:
        "Differentiate the proposed antiderivative and prove polynomial identity",
      mistake: "Do not omit the arbitrary constant for an indefinite integral.",
      example: { problem: "integrate x^2", answer: "1/3*x^3 + C" },
      prerequisites: ["differentiate"],
    },
    {
      operation: "definite-integral",
      title: "Definite polynomial integrals",
      definition:
        "A polynomial is continuous, so its integral on an oriented finite interval equals the antiderivative difference.",
      display: "integral_a^b p(x) dx = F(b)-F(a)",
      conditions: [
        "Exact rational finite bounds",
        "Polynomial degree at most 12",
      ],
      method: [
        "Construct antiderivative",
        "Evaluate at upper and lower bounds",
        "Subtract in interval order",
      ],
      verification:
        "Independent exact Lagrange interpolation and integration from original-expression samples",
      mistake:
        "Reversing bounds reverses sign; a signed integral is not necessarily geometric area.",
      example: { problem: "integrate x^2 from 0 to 3", answer: "9" },
      prerequisites: ["integrate"],
    },
  ],
  {
    title: "OpenStax Calculus Volume 1",
    url: "https://openstax.org/books/calculus-volume-1/pages/5-3-the-fundamental-theorem-of-calculus",
    locator:
      "3.3 Differentiation Rules; 4.10 Antiderivatives; 5.3 Fundamental Theorem of Calculus",
  },
);
