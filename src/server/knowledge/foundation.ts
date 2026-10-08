import type { KnowledgeBundle, Dimension } from "./schema.ts";
import type { Expression } from "../computation/expression.ts";
const variable = (name: string): Expression => ({ kind: "variable", name });
const binary = (op: "+" | "-" | "*" | "/", left: Expression, right: Expression): Expression => ({ kind: "binary", op, left, right });
export const MASS: Dimension = [1,0,0,0,0,0,0];
export const ACCELERATION: Dimension = [0,1,-2,0,0,0,0];
export const FORCE: Dimension = [1,1,-2,0,0,0,0];
export const DIMENSIONLESS: Dimension = [0,0,0,0,0,0,0];
export const foundation: KnowledgeBundle = {
  id: "solvy-foundation",
  metadata: {
    schemaVersion: 1, revision: 1, state: "candidate", validation: "passed",
    createdAt: "2026-10-07T19:00:00Z", updatedAt: "2026-10-07T19:00:00Z",
    author: "Solvy implementation", generatedBy: "Codex",
    review: { method: "Source-grounded seed with executable regression tests; human subject review pending", reviewer: "Automated checks only", confidence: null },
  },
  taxonomy: [
    { id: "science", kind: "domain", label: "Natural science", parent: null },
    { id: "physics", kind: "subject", label: "Physics", parent: "science" },
    { id: "mechanics", kind: "branch", label: "Mechanics", parent: "physics" },
    { id: "newton-laws", kind: "topic", label: "Newton's laws", parent: "mechanics" },
    { id: "formal-science", kind: "domain", label: "Formal science", parent: null },
    { id: "mathematics", kind: "subject", label: "Mathematics", parent: "formal-science" },
    { id: "algebra", kind: "branch", label: "Algebra", parent: "mathematics" },
    { id: "linear-equations", kind: "topic", label: "Linear equations", parent: "algebra" },
  ],
  concepts: [
    { id: "newton-second-law", topic: "newton-laws", title: "Newton's second law",
      definitions: ["For constant mass in an inertial frame, net external force equals mass times acceleration."],
      laws: ["F_net = m a"], prerequisites: ["mass", "acceleration"], related: ["net-force"] },
    { id: "linear-equation", topic: "linear-equations", title: "One-variable linear equations",
      definitions: ["An affine equation is reduced to A x = B using operations that preserve equality."],
      laws: ["The same valid operation on both sides preserves the solution set."], prerequisites: [], related: [] },
  ],
  quantities: [
    { id: "mass", meaning: "Constant mass", dimension: MASS, kind: "scalar", domain: "positive" },
    { id: "acceleration", meaning: "Acceleration along a specified axis, or magnitude", dimension: ACCELERATION, kind: "component", domain: "finite signed component" },
    { id: "net-force", meaning: "Net external force along the same axis", dimension: FORCE, kind: "component", domain: "finite signed component" },
    ...["coefficient", "constant", "rhs", "unknown"].map(id => ({ id, meaning: id, dimension: DIMENSIONLESS, kind: "scalar" as const, domain: "real" })),
  ],
  variables: [
    { id: "var-F", symbol: "F", quantity: "net-force" }, { id: "var-m", symbol: "m", quantity: "mass" }, { id: "var-a", symbol: "a", quantity: "acceleration" },
    { id: "var-x", symbol: "x", quantity: "unknown" }, { id: "var-A", symbol: "A", quantity: "coefficient" },
    { id: "var-b", symbol: "b", quantity: "constant" }, { id: "var-c", symbol: "c", quantity: "rhs" },
  ],
  units: [
    { id: "kg", symbol: "kg", aliases: ["kg", "kilogram", "kilograms"], dimension: MASS, scale: "1", offset: "0" },
    { id: "g", symbol: "g", aliases: ["g", "gram", "grams"], dimension: MASS, scale: "0.001", offset: "0" },
    { id: "m/s2", symbol: "m/s²", aliases: ["m/s²", "m/s^2", "m/s2"], dimension: ACCELERATION, scale: "1", offset: "0" },
    { id: "cm/s2", symbol: "cm/s²", aliases: ["cm/s²", "cm/s^2", "cm/s2"], dimension: ACCELERATION, scale: "0.01", offset: "0" },
    { id: "N", symbol: "N", aliases: ["N", "newton", "newtons"], dimension: FORCE, scale: "1", offset: "0" },
    { id: "one", symbol: "1", aliases: ["dimensionless"], dimension: DIMENSIONLESS, scale: "1", offset: "0" },
  ],
  formulas: [
    { id: "newton-F-ma", concept: "newton-second-law", display: "F_{\\mathrm{net}} = ma", target: "F",
      expression: binary("*", variable("m"), variable("a")), bindings: { F: "net-force", m: "mass", a: "acceleration" },
      conditions: ["m > 0", "net external force", "same axis"], assumptions: ["constant mass", "inertial frame", "classical mechanics"],
      rearrangements: [
        { target: "a", expression: binary("/", variable("F"), variable("m")), conditions: ["m > 0"] },
        { target: "m", expression: binary("/", variable("F"), variable("a")), conditions: ["a != 0", "F/a > 0"] },
      ] },
    { id: "linear-isolate", concept: "linear-equation", display: "Ax + b = c", target: "x",
      expression: binary("/", binary("-", variable("c"), variable("b")), variable("A")),
      bindings: { x: "unknown", A: "coefficient", b: "constant", c: "rhs" },
      conditions: ["A != 0 for division", "check A=0 before dividing"], assumptions: ["real variable", "constant nonzero divisors only"], rearrangements: [] },
  ],
  relationships: [{ from: "newton-second-law", to: "mass", kind: "prerequisite" }, { from: "newton-F-ma", to: "N", kind: "uses" }, { from: "linear-equation", to: "linear-isolate", kind: "uses" }],
  patterns: [
    { id: "mass-acceleration-to-net-force", concept: "newton-second-law", known: ["mass", "acceleration"], unknown: ["net-force"], formula: "newton-F-ma", method: "newton-method", constraints: ["single object", "one axis", "no additional force requested"] },
    { id: "one-variable-affine", concept: "linear-equation", known: ["coefficient", "constant", "rhs"], unknown: ["unknown"], formula: "linear-isolate", method: "linear-method", constraints: ["one real variable", "linear", "bounded expression grammar"] },
  ],
  methods: [
    { id: "newton-method", executor: "newton-net-force-v1", operations: ["validate dimensions", "normalize SI", "multiply", "report net force"] },
    { id: "linear-method", executor: "linear-affine-v1", operations: ["parse both sides", "collect affine coefficients", "classify zero coefficient", "isolate variable if unique"] },
  ],
  verificationRules: [
    ...["arithmetic", "units", "dimensions", "applicability", "physical-constraints", "explanation-consistency"].map(checker => ({ id: `newton-check-${checker}`, checker, appliesTo: "mass-acceleration-to-net-force", claim: checker })),
    ...["algebra-substitution", "arithmetic", "applicability", "explanation-consistency"].map(checker => ({ id: `linear-check-${checker}`, checker, appliesTo: "one-variable-affine", claim: checker })),
  ],
  commonMistakes: [
    { id: "applied-vs-net", concept: "newton-second-law", trigger: "applied force requested", guidance: "Net force is the sum of external forces, not necessarily one applied force." },
    { id: "zero-coefficient", concept: "linear-equation", trigger: "A=0", guidance: "Classify identity or contradiction; do not divide by zero." },
  ],
  examples: [
    { id: "newton-example", problem: "A 5 kg object accelerates at 4 m/s². Find the force.", pattern: "mass-acceleration-to-net-force", answer: "20 N" },
    { id: "linear-example", problem: "2x + 6 = 14", pattern: "one-variable-affine", answer: "x = 4" },
  ],
  sources: [
    { id: "openstax-newton", title: "OpenStax University Physics Volume 1", url: "https://openstax.org/books/university-physics-volume-1/pages/5-3-newtons-second-law", locator: "5.3 Newton's Second Law", accessedAt: "2026-10-07", supports: ["newton-second-law", "newton-F-ma", "N"] },
    { id: "openstax-linear", title: "OpenStax Elementary Algebra 2e", url: "https://openstax.org/books/elementary-algebra-2e/pages/2-3-solve-equations-with-variables-and-constants-on-both-sides", locator: "2.3 Solve Equations with Variables and Constants on Both Sides", accessedAt: "2026-10-07", supports: ["linear-equation", "linear-isolate"] },
  ],
};
