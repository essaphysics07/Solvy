import test from "node:test";
import assert from "node:assert/strict";
import { understand } from "../src/server/solving/understand.ts";
import { routeProblem } from "../src/server/solving/router.ts";
import { BundledKnowledgeRepository } from "../src/server/knowledge/repository.ts";
import { solveLinear } from "../src/server/solvers/linear.ts";
import { verify } from "../src/server/verification/verify.ts";
import { analyzeAffineEquation, exactRational } from "../src/server/computation/affine-equation.ts";
import { parseExpression } from "../src/server/computation/expression.ts";
import type { ProblemRepresentation } from "../src/server/solving/problem.ts";

const knowledge = new BundledKnowledgeRepository().retrieve("linear-equation")!;
function linear(source: string) {
  const result = understand({ problem: source, subject: "mathematics", explanationLevel: "simple" });
  if (result.status !== "understood" || result.problem.kind !== "linear") assert.fail(JSON.stringify(result));
  return { problem: result.problem, representation: result.representation };
}
const cases = [
  ["2x + 6 = 14", "x", "2", "6", "0", "14"],
  ["0x = 5", "x", "0", "0", "0", "5"],
  ["0x = 0", "x", "0", "0", "0", "0"],
  ["3y - 1 = 8", "y", "3", "-1", "0", "8"],
  ["Solve for y: 3y - 1 = 8", "y", "3", "-1", "0", "8"],
  ["2(x + 3) = 14", "x", "2", "6", "0", "14"],
  ["x/3 + 1/2 = 1", "x", "1/3", "1/2", "0", "1"],
  ["0.1x + 0.2 = 0.5", "x", "1/10", "1/5", "0", "1/2"],
  ["-(2x-3) = -5", "x", "-2", "3", "0", "-5"],
  ["x/(2-1) = 2", "x", "1", "0", "0", "2"],
  ["2x + 1 = 2x + 1", "x", "2", "1", "2", "1"],
  ["2x + 1 = 2x + 2", "x", "2", "1", "2", "2"],
  ["3x + 1 = 2", "x", "3", "1", "0", "2"],
];
for (const [source, variable, a, b, c, d] of cases) {
  test(`algebra representation retains exact two-sided structure: ${source}`, () => {
    const { problem, representation } = linear(source);
    assert.equal(representation.algebra, problem, "One shared structure, not a duplicated AST");
    assert.equal(problem.relation, "=");
    assert.equal(problem.numberDomain, "real");
    assert.equal(problem.variable, variable);
    assert.deepEqual(problem.form, { kind: "affine", left: { coefficient: a, constant: b }, right: { coefficient: c, constant: d } });
    assert.deepEqual(representation.known.map(item => [item.quantity, item.value, item.unit]), [
      ["coefficient", exactRational(a).sub(exactRational(c)).toString(), "one"],
      ["constant", b, "one"], ["rhs", d, "one"],
    ]);
    assert.deepEqual(representation.unknown, [variable]);
    assert.deepEqual(representation.evidence, [problem.original]);
    assert.deepEqual(representation.assumptions, ["Real variable", "Constant nonzero divisors"]);
    assert.deepEqual(representation.constraints, ["one real variable", "linear", "bounded expression grammar"]);
    assert.deepEqual(routeProblem(representation, knowledge), { status: "matched", pattern: "one-variable-affine" });
    assert.equal(verify(problem, solveLinear(problem), knowledge).status, "VERIFIED_WITHIN_SCOPE");
    assert.equal(routeProblem(JSON.parse(JSON.stringify(representation)), knowledge).status, "matched", "Representation is JSON safe");
  });
}

test("two-sided variables bind to the existing A*x+b=c formula without solving early", () => {
  const { problem, representation } = linear("3x+2=x+8");
  assert.deepEqual(representation.known.map(item => item.value), ["2", "2", "8"]);
  assert.equal("classification" in problem.form, false);
  const result = solveLinear(problem);
  assert.equal(result.classification, "unique");
  if (result.classification === "unique") assert.equal(result.value.toString(), "3");
  assert.equal(result.rhs.toString(), "6", "Solver performs c-b after representation/routing");
});

test("unsupported expressions never acquire a deterministic representation", () => {
  for (const source of ["x^2=4", "x*x=4", "x/x=1", "x/(x-x+1)=2", "x+y=2", "2x=4 and x>5", "process.exit()", "2x=4=5", "x x = 4", "Solve x=1 over integers"]) {
    const result = understand({ problem: source, subject: "mathematics", explanationLevel: "simple" });
    assert.equal(result.status, "unsupported", source);
    assert.equal("representation" in result, false, source);
  }
});

test("zero division remains clarification, with no representation", () => {
  const result = understand({ problem: "x/(2-2)=1", subject: "mathematics", explanationLevel: "simple" });
  assert.equal(result.status, "clarification");
  assert.equal("representation" in result, false);
});

test("router rejects forged/missing semantics, constraints, evidence and pattern hints", () => {
  const { representation: valid } = linear("2x+6=14");
  const alterations: ProblemRepresentation[] = [
    { ...valid, algebra: undefined }, { ...valid, known: [] }, { ...valid, constraints: [] },
    { ...valid, assumptions: [] }, { ...valid, evidence: ["x*x=4"] },
    { ...valid, unknown: ["y"] }, { ...valid, pattern: "invented-pattern" },
    { ...valid, concept: "newton-second-law" }, { ...valid, domain: "physics" },
    { ...valid, algebra: { ...valid.algebra!, variable: "y" } },
    { ...valid, algebra: { ...valid.algebra!, right: parseExpression("99") } },
    { ...valid, algebra: { ...valid.algebra!, original: "x*x=4" } },
    { ...valid, algebra: { ...valid.algebra!, form: { ...valid.algebra!.form, left: { coefficient: "999", constant: "6" } } } },
    { ...valid, known: valid.known.map(item => ({ ...item, value: "999" })) },
  ];
  for (const altered of alterations) assert.equal(routeProblem(altered, knowledge).status, "unsupported", JSON.stringify(altered));
});

test("router cannot use cloned or modified knowledge to authorize algebra", () => {
  const { representation } = linear("2x=4");
  assert.equal(routeProblem(representation, structuredClone(knowledge)).status, "unsupported");
  for (const key of ["formulas", "methods", "verificationRules", "patterns"] as const) {
    const modified = structuredClone(knowledge); modified[key] = [];
    assert.equal(routeProblem(representation, modified).status, "unsupported");
  }
});

test("independent verifier checks original ASTs even if derived summaries are corrupted", () => {
  const { problem } = linear("2x+6=14");
  const corrupt = { ...problem, form: { ...problem.form, left: { coefficient: "4", constant: "6" } } };
  const wrongResult = solveLinear(corrupt);
  assert.equal(verify(problem, wrongResult, knowledge).status, "FAILED");
});

test("semantic analyzer rejects a second variable and keeps source AST identity", () => {
  const left = parseExpression("2x+6"), right = parseExpression("14");
  const equation = analyzeAffineEquation({ left, right, original: "2x+6=14", variable: "x" });
  assert.equal(equation.left, left); assert.equal(equation.right, right);
  assert.throws(() => analyzeAffineEquation({ left, right: parseExpression("y", "y"), original: "2x+6=y", variable: "x" }), /Unexpected variable/);
});

test("exact semantic scalars reject noncanonical values and executable text", () => {
  assert.equal(exactRational("-1/3").toString(), "-1/3");
  for (const value of ["1/0", "2/4", "0.1", "NaN", "1+2", "process.exit()", "9".repeat(514)]) assert.throws(() => exactRational(value));
});

test("routing compares semantic objects structurally rather than by object key order", () => {
  const { representation } = linear("2x+6=14");
  const equation = representation.algebra!;
  const reordered = { ...representation, algebra: { ...equation, form: {
    right: equation.form.right, left: equation.form.left, kind: "affine" as const,
  } } };
  assert.equal(routeProblem(reordered, knowledge).status, "matched");
});
