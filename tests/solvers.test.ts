import test from "node:test";
import assert from "node:assert/strict";
import { understand } from "../src/server/solving/understand.ts";
import { solveNewton } from "../src/server/solvers/newton.ts";
import { solveLinear } from "../src/server/solvers/linear.ts";
import { verify } from "../src/server/verification/verify.ts";
import { explain } from "../src/server/solving/explain.ts";
import { Rational } from "../src/server/computation/rational.ts";
import { BundledKnowledgeRepository, executablePattern } from "../src/server/knowledge/repository.ts";
import { foundation } from "../src/server/knowledge/foundation.ts";
import { validateKnowledge } from "../src/server/knowledge/schema.ts";
import type { Subject } from "../src/shared/contracts/solution.ts";
const knowledge = new BundledKnowledgeRepository().retrieve("newton-second-law")!;
function problem(text: string, subject: Subject) {
  const parsed = understand({ problem: text, subject, explanationLevel: "step-by-step" });
  assert.equal(parsed.status, "understood", JSON.stringify(parsed));
  if (parsed.status !== "understood") throw new Error("not understood");
  return parsed.problem;
}
const newtonCases = [
  ["A 5 kg object accelerates at 4 m/s². Find the force.", "20"],
  ["A 10 kg body accelerates at 3 m/s^2. Calculate the net force.", "30"],
  ["A 2.5 kg block accelerates at 8 m/s². Find the force.", "20"],
  ["A 500 g object accelerates at 200 cm/s². Find the force.", "1"],
  ["A 5 kg object accelerates at 0 m/s². Find the force.", "0"],
  ["A 5 kg object accelerates at -4 m/s². Find the net force.", "-20"],
  ["m = 2.5 kg, a = 8 m/s²; find net force", "20"],
  ["A 0.1 kg object accelerates at 0.2 m/s². Find the force.", "1/50"],
];
for (const [text, answer] of newtonCases) test(`Newton: ${text}`, () => {
  const p = problem(text, "physics"); assert.equal(p.kind, "newton"); if (p.kind !== "newton") return;
  const result = solveNewton(p, knowledge); assert.equal(String(result.value), answer);
  const content = explain(p, result, "step-by-step");
  const report = verify(p, result, knowledge, content);
  assert.equal(report.status, "VERIFIED_WITHIN_SCOPE");
  assert.equal(report.checks.length, 6);
});
for (const text of ["A -5 kg object accelerates at 4 m/s². Find the force.", "A 0 kg object accelerates at 4 m/s². Find the force."]) test(`Newton invalid mass: ${text}`, () => {
  assert.equal(understand({ problem: text, subject: "physics", explanationLevel: "simple" }).status, "clarification");
});
for (const text of [
  "A 5 kg object accelerates at 4 m/s². Find the applied force.",
  "A 5 kg object accelerates at 4 m/s². Find the force. Friction is 3 N.",
  "A 5 kg object accelerates at 4 m/s. Find the force.",
  "A 5 kg object accelerates at 4 m/s² east. Find the force.",
  "A 5 kg object accelerates at 4 m/s². Find the force and work.",
  "A rocket loses mass. Find the force.",
  "A 5 kg object accelerates at 4 m/s². Find the gravitational force.",
]) test(`Newton rejects broader context: ${text}`, () => {
  assert.equal(understand({ problem: text, subject: "physics", explanationLevel: "simple" }).status, "unsupported");
});
test("Newton solver rejects dimensionally wrong quantities", () => {
  const p = problem(newtonCases[0][0], "physics"); if (p.kind !== "newton") throw new Error();
  assert.throws(() => solveNewton({ ...p, mass: { ...p.mass, unit: "N" } }, knowledge), /dimensions/);
  assert.throws(() => solveNewton({ ...p, mass: { ...p.mass, value: "NaN" } }, knowledge));
});
const linearCases = [
  ["2x + 6 = 14", "unique", "4"], ["Solve 3x + 1 = 2", "unique", "1/3"],
  ["2x + 6 = 2", "unique", "-2"], ["2x + 1 = 2x + 2", "none", ""],
  ["2x + 1 = 2x + 1", "infinite", ""], ["0x = 0", "infinite", ""], ["0x = 5", "none", ""],
  ["2(x + 3) = 14", "unique", "4"], ["x/3 + 1/2 = 1", "unique", "3/2"],
  ["0.1x + 0.2 = 0.5", "unique", "3"], ["Solve for y: 3y - 1 = 8", "unique", "3"],
  ["-(2x-3) = -5", "unique", "4"], ["x/(2-1) = 2", "unique", "2"],
];
for (const [text, classification, answer] of linearCases) test(`Linear: ${text}`, () => {
  const p = problem(text, "mathematics"); if (p.kind !== "linear") throw new Error();
  const result = solveLinear(p); assert.equal(result.classification, classification);
  if (result.classification === "unique") assert.equal(String(result.value), answer);
  assert.equal(verify(p, result, knowledge, explain(p, result, "step-by-step")).status, "VERIFIED_WITHIN_SCOPE");
});
for (const text of ["x/0 = 1", "x/(2-2)=1", "0/0+x=2"]) test(`Invalid division: ${text}`, () => {
  assert.equal(understand({ problem: text, subject: "mathematics", explanationLevel: "simple" }).status, "clarification");
});
for (const text of ["x^2=4", "x*x=4", "x/x=1", "x/(x-x+1)=2", "x+y=2", "2x=4 and x>5", "process.exit()", "2x=4=5", "x x = 4", "Solve x=1 over integers"]) test(`Unsupported expression: ${text}`, () => {
  assert.equal(understand({ problem: text, subject: "mathematics", explanationLevel: "simple" }).status, "unsupported");
});
test("exact arithmetic handles generated reusable variations", () => {
  for (let coefficient = -9; coefficient <= 9; coefficient++) {
    if (!coefficient) continue;
    for (let x = -3; x <= 3; x++) {
      const p = problem(`${coefficient}x+7=${coefficient*x+7}`, "mathematics"); if (p.kind !== "linear") throw new Error();
      const result = solveLinear(p); assert.equal(result.classification, "unique");
      if (result.classification === "unique") assert.equal(String(result.value), String(x));
      assert.equal(verify(p, result, knowledge).status, "VERIFIED_WITHIN_SCOPE");
    }
  }
});
test("verification detects incorrect numerical, unit, dimensional and explanation claims", () => {
  const p = problem(newtonCases[0][0], "physics"); if (p.kind !== "newton") throw new Error();
  const result = solveNewton(p, knowledge);
  assert.equal(verify(p, { ...result, value: Rational.parse("21") }, knowledge).status, "FAILED");
  assert.equal(verify(p, { ...result, unit: "J" }, knowledge).status, "FAILED");
  assert.equal(verify(p, { ...result, dimension: [1,2,-2,0,0,0,0] }, knowledge).status, "FAILED");
  const content = explain(p, result, "step-by-step");
  assert.equal(verify(p, result, knowledge, { ...content, answer: "999 N" }).status, "FAILED");
  content.steps[0].expression = "m = 999";
  assert.equal(verify(p, result, knowledge, content).status, "FAILED");
});
test("verification independently rejects changed executable formula", () => {
  const p = problem(newtonCases[0][0], "physics"); if (p.kind !== "newton") throw new Error();
  const altered = structuredClone(knowledge);
  altered.formulas[0].expression = { kind: "number", value: "99" };
  const result = solveNewton(p, altered);
  assert.equal(verify(p, result, altered).status, "FAILED");
});
test("algebra verification rejects incorrect value and wrong solution-set classification", () => {
  const p = problem("2x+6=14", "mathematics"); if (p.kind !== "linear") throw new Error();
  const result = solveLinear(p); if (result.classification !== "unique") throw new Error();
  assert.equal(verify(p, { ...result, value: Rational.parse("5") }, knowledge).status, "FAILED");
  assert.equal(verify(p, { kind: "linear", classification: "infinite", coefficient: result.coefficient, rhs: result.rhs }, knowledge).status, "FAILED");
});
test("knowledge is versioned, validated, immutable and does not auto-publish candidates", () => {
  assert.equal(validateKnowledge(foundation).metadata.state, "candidate");
  assert.ok(Object.isFrozen(knowledge.formulas[0].expression));
  assert.ok(executablePattern(knowledge, "one-variable-affine"));
  assert.equal(executablePattern(structuredClone(knowledge), "one-variable-affine"), undefined);
  const invalid = structuredClone(knowledge); invalid.units[0].dimension = [1,2] as never;
  assert.throws(() => validateKnowledge(invalid), /dimension/);
  const missing = structuredClone(knowledge); missing.patterns[0].formula = "missing";
  assert.throws(() => validateKnowledge(missing), /missing/);
  const injection = structuredClone(knowledge); injection.formulas[0].expression = { kind: "eval", value: "process.exit()" } as never;
  assert.throws(() => validateKnowledge(injection), /operation/);
});
test("Newton reusable numerical variations", () => {
  for (let mass = 1; mass <= 7; mass++) for (let acceleration = -3; acceleration <= 3; acceleration++) {
    const p = problem(`A ${mass} kg object accelerates at ${acceleration} m/s². Find the force.`, "physics");
    if (p.kind !== "newton") throw new Error();
    const result = solveNewton(p, knowledge);
    assert.equal(String(result.value), String(mass * acceleration));
    assert.equal(verify(p, result, knowledge).status, "VERIFIED_WITHIN_SCOPE");
  }
});
