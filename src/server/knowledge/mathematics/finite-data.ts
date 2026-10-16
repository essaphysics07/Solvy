import { mathematicsPackage } from "./package.ts";
export const statisticsKnowledge = mathematicsPackage(
  "solvy-exact-statistics",
  "finite-data",
  [
    {
      operation: "mean",
      title: "Arithmetic mean",
      definition:
        "The arithmetic mean is the sum of observations divided by their number.",
      display: "mean=sum(x_i)/n",
      conditions: ["1 to 100 exact rational observations"],
      method: ["Sum exactly", "Divide by sample size"],
      verification: "Independent summation and exact division",
      mistake: "The mean is not necessarily an observed value.",
      example: { problem: "mean [1,2,3]", answer: "2" },
    },
    {
      operation: "population-variance",
      title: "Population variance",
      definition:
        "The population variance is the average squared deviation from the population mean.",
      display: "variance=sum((x_i-mean)^2)/n",
      conditions: ["1 to 100 population observations"],
      method: [
        "Compute mean",
        "Sum squared centered deviations",
        "Divide by n",
      ],
      verification: "Independent raw second-moment identity",
      mistake: "Population variance uses n, not n-1.",
      example: { problem: "population variance [1,2,3]", answer: "2/3" },
      prerequisites: ["mean"],
    },
    {
      operation: "sample-variance",
      title: "Sample variance",
      definition:
        "The sample variance uses the sum of squared deviations from the sample mean divided by n-1.",
      display: "s^2=sum((x_i-mean)^2)/(n-1)",
      conditions: ["2 to 100 observations"],
      method: [
        "Compute mean",
        "Sum squared centered deviations",
        "Divide by n-1",
      ],
      verification: "Independent raw second-moment identity and sample size",
      mistake: "Sample variance is undefined for a single observation.",
      example: { problem: "sample variance [1,2,3]", answer: "1" },
      prerequisites: ["mean"],
    },
  ],
  {
    title: "OpenStax Introductory Statistics 2e",
    url: "https://openstax.org/books/introductory-statistics-2e/pages/2-7-measures-of-the-spread-of-the-data",
    locator: "Measures of center and spread; population versus sample variance",
  },
);
export const sequencesKnowledge = mathematicsPackage(
  "solvy-finite-sequences",
  "finite-data",
  [
    {
      operation: "arithmetic-sum",
      title: "Finite arithmetic sequences",
      definition:
        "Successive terms of an arithmetic sequence differ by a fixed increment.",
      display: "S_n=n*(2a+(n-1)d)/2",
      conditions: [
        "Integer 0 <= n <= 100",
        "Rational first term and increment",
      ],
      method: ["Check finite count", "Apply paired-term sum"],
      verification: "Enumerate and sum all terms independently",
      mistake: "The nth term has n-1 increments; an empty sum is zero.",
      example: { problem: "arithmetic sum a=2, d=3, n=5", answer: "40" },
    },
    {
      operation: "geometric-sum",
      title: "Finite geometric sequences",
      definition:
        "Successive terms are obtained by multiplying by a fixed ratio.",
      display: "S_n=a*(1-r^n)/(1-r) for r!=1; S_n=n*a for r=1",
      conditions: [
        "Integer 0 <= n <= 100",
        "Rational first term and ratio",
        "Finite sum only",
      ],
      method: [
        "Handle empty sum",
        "Handle ratio one",
        "Use finite geometric sum",
      ],
      verification: "Independent term enumeration",
      mistake:
        "A finite geometric sum does not require |r|<1; that condition belongs to infinite convergence.",
      example: { problem: "geometric sum a=2, r=3, n=4", answer: "80" },
    },
  ],
  {
    title: "OpenStax College Algebra 2e",
    url: "https://openstax.org/books/college-algebra-2e/pages/9-4-series-and-their-notations",
    locator: "Finite arithmetic and geometric sums",
  },
);
export const countingKnowledge = mathematicsPackage(
  "solvy-counting-probability",
  "finite-data",
  [
    {
      operation: "combinations",
      title: "Combinations",
      definition:
        "A combination counts unordered k-element selections from n distinct objects without replacement.",
      display: "C(n,k)=n!/(k!(n-k)!)",
      conditions: ["Integers 0 <= k <= n <= 100"],
      method: [
        "Use shorter multiplicative recurrence",
        "Reduce exact fractions",
      ],
      verification: "Independent Pascal-triangle recurrence",
      mistake: "Order is ignored; do not use a permutation count.",
      example: { problem: "combinations n=5, k=2", answer: "10" },
    },
    {
      operation: "permutations",
      title: "Permutations without replacement",
      definition:
        "A permutation count records ordered selections of distinct objects without replacement.",
      display: "P(n,k)=n!/(n-k)!",
      conditions: ["Integers 0 <= k <= n <= 100"],
      method: ["Multiply k descending factors"],
      verification: "Independent factorial quotient",
      mistake: "This formula assumes no replacement.",
      example: { problem: "permutations n=5, k=2", answer: "20" },
    },
    ...(["binomial-probability", "binomial-at-least"] as const).map(
      (operation) => ({
        operation,
        title: "Binomial distribution",
        definition:
          "Independent Bernoulli trials with a common success probability yield a binomial count of successes.",
        display:
          operation === "binomial-probability"
            ? "P(X=k)=C(n,k)*p^k*(1-p)^(n-k)"
            : "P(X>=k)=sum_{j=k}^n C(n,j)*p^j*(1-p)^(n-j)",
        conditions: [
          "Independent identical Bernoulli trials",
          "Integers 0 <= k <= n <= 50",
          "0 <= p <= 1 exact rational",
        ],
        method: [
          "Validate binomial assumptions",
          "Compute exact probability mass",
          "Sum tail if requested",
        ],
        verification: "Independent convolution of Bernoulli distributions",
        mistake:
          "At least includes the endpoint; independence cannot be assumed for arbitrary word problems.",
        example: {
          problem:
            operation === "binomial-probability"
              ? "binomial probability n=3, k=2, p=1/2"
              : "binomial at least n=3, k=2, p=1/2",
          answer: operation === "binomial-probability" ? "3/8" : "1/2",
        },
        prerequisites: ["combinations" as const],
      }),
    ),
  ],
  {
    title: "OpenStax Introductory Statistics 2e",
    url: "https://openstax.org/books/introductory-statistics-2e/pages/4-3-binomial-distribution",
    locator:
      "Binomial distribution; counting conventions are explicitly restricted to selections without replacement",
  },
);
