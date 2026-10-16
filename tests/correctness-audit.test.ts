import test from "node:test";
import assert from "node:assert/strict";
import { Rational, RationalPrecisionError, ONE } from "../src/server/computation/rational.ts";
import { parsePolynomial, coefficients } from "../src/server/computation/polynomials.ts";
import { understandMathematics } from "../src/server/solving/mathematics.ts";
import { solveMathematics } from "../src/server/solvers/mathematics.ts";
import { verify } from "../src/server/verification/verify.ts";
import { solve } from "../src/server/solving/orchestrator.ts";
import { routeProblem } from "../src/server/solving/router.ts";
import { publicError } from "../src/server/solving/errors.ts";
import { BundledKnowledgeRepository } from "../src/server/knowledge/repository.ts";
import type { AIProvider } from "../src/server/ai/provider.ts";
import type { PolynomialProblem, MathematicsResult } from "../src/server/solvers/mathematics-contracts.ts";
const knowledge = new BundledKnowledgeRepository("mathematics");
const relations = ["<", "<=", ">", ">="] as const;
type Relation = typeof relations[number];
function parsed(source: string) {
  const r = understandMathematics(source);
  if(r.status !== "understood" || r.problem.kind !== "mathematics" || r.problem.family !== "polynomial") assert.fail(source);
  return {problem: r.problem, representation: r.representation};
}
function report(problem: PolynomialProblem, result: MathematicsResult) {
  return verify(problem, result, knowledge.retrieve(problem.concept)!);
}
const input = (problem: string) => ({problem, subject:"mathematics" as const, explanationLevel:"simple" as const});
const noProvider: AIProvider = {id:"test",capabilities:{text:true,vision:true,audio:false,structuredOutput:true},generate:async()=>{throw new Error("Unexpected provider call");}};

for(const relation of relations) test(`inequality audit: ${relation}, signed coefficients/constants and all relation mutations`,()=>{
  const reverse: Record<Relation,Relation> = {"<":">", "<=":">=", ">":"<", ">=":"<="};
  for(const numerator of [-2,-1,1,2]) for(const denominator of [1,3]) for(const constant of [-5,0,5]) for(const rhs of [-7,0,7]) {
    const {problem} = parsed(`solve (${numerator}/${denominator})*x+(${constant}) ${relation} (${rhs})`);
    const result = solveMathematics(problem);
    if(result.value.type !== "interval") assert.fail();
    const expectedRelation = numerator < 0 ? reverse[relation] : relation;
    assert.equal(result.value.relation, expectedRelation);
    assert.equal(result.value.bound?.toString(), new Rational(BigInt((rhs-constant)*denominator),BigInt(numerator)).toString());
    assert.equal(report(problem,result).status,"VERIFIED_WITHIN_SCOPE");
    // Each of the other three operators is wrong: test direction AND inclusion.
    for(const bad of relations.filter(r=>r!==expectedRelation)) assert.equal(report(problem,{kind:"mathematics",value:{...result.value,relation:bad}}).status,"FAILED");
    assert.equal(report(problem,{kind:"mathematics",value:{...result.value,bound:result.value.bound!.add(ONE)}}).status,"FAILED");
  }
});
for(const relation of relations) test(`constant inequality audit: ${relation}, all/none and cancellation`,()=>{
  const holds = (n:number) => ({"<":n<0, "<=":n<=0, ">":n>0, ">=":n>=0})[relation];
  for(const left of [-3,0,3]) for(const right of [-5,0,5]) for(const prefix of ["0x", "2x"]) {
    const {problem} = parsed(`solve ${prefix}+(${left}) ${relation} ${prefix}+(${right})`);
    const result = solveMathematics(problem);
    if(result.value.type !== "interval") assert.fail();
    const classification = holds(left-right)?"all":"none";
    assert.equal(result.value.classification,classification);
    assert.equal(report(problem,result).status,"VERIFIED_WITHIN_SCOPE");
    assert.equal(report(problem,{kind:"mathematics",value:{type:"interval",classification:classification==="all"?"none":"all"}}).status,"FAILED");
  }
});
test("negative-slope inequality completes the real orchestration path",async()=>{
  let saves=0;
  const result=await solve(input("-2x + 3 <= 7"),{knowledge,provider:noProvider,persistence:{save:async()=>{saves++;return "saved";}}});
  assert.equal(result.answer,"x >= -2");assert.equal(result.verification?.status,"VERIFIED_WITHIN_SCOPE");assert.equal(saves,1);
});
test("malformed relations cannot be interpreted as >=",()=>{
  const {problem}=parsed("solve -2x+3<=7"),result=solveMathematics(problem);
  if(result.value.type!=="interval") assert.fail();
  for(const relation of ["!=","garbage",""]) {
    const bad={kind:"mathematics" as const,value:{...result.value,relation:relation as Relation}};
    assert.notEqual(report(problem,bad).status,"VERIFIED_WITHIN_SCOPE");
    assert.notEqual(report({...problem,relation:relation as Relation},result).status,"VERIFIED_WITHIN_SCOPE");
  }
});
const excluded=["x^0","(x-1)^0","(x^2+1)^0","0*x^0","(x^0)^0","(x/x)^0","(x-x)^0","0^0"];
for(const expression of excluded) test(`zero power cannot erase domain: ${expression}`,()=>{
  assert.throws(()=>parsePolynomial(expression));
  for(const source of [`simplify ${expression}`,`solve ${expression}=1`,`solve ${expression}=${expression}`,`solve ${expression}<2`,`differentiate ${expression}`,`integrate ${expression}`]) assert.equal(understandMathematics(source).status,"unsupported",source);
});
test("safe constant zero powers and ordinary positive powers remain valid",()=>{
  for(const expression of ["2^0","(-2)^0","(2-1)^0","(x-x+1)^0","(0x+2)^0"]) assert.deepEqual(coefficients(parsePolynomial(expression)).map(String),["1"]);
  for(const source of ["simplify x^2","solve (x-1)^2=0","solve (x-x+1)^0=1"]) {
    const {problem}=parsed(source);assert.equal(report(problem,solveMathematics(problem)).status,"VERIFIED_WITHIN_SCOPE");
  }
});
test("legacy representations with erased zero powers fail knowledge routing",()=>{
  const {representation,problem}=parsed("solve (x-x+1)^0=1");
  for(const source of ["solve x^0=1","solve (x-1)^0=1"]) {
    assert.equal(routeProblem({...representation,evidence:[source],mathematics:{...problem,original:source}},knowledge.retrieve(problem.concept)!).status,"unsupported");
  }
});
test("unsupported zero-power inputs use unverified fallback, ignoring provider verification claims",async()=>{
  for(const source of ["x^0","solve x^0=1","solve (x-1)^0=(x-1)^0","simplify 0^0"]) {
    let calls=0;
    const solution=await solve(input(source),{knowledge,persistence:{save:async()=>"skipped"},provider:{...noProvider,generate:async request=>{
      calls++;assert.equal(request.text,source);
      return {provider:"test",model:"test",content:{title:"Candidate",answer:"1",steps:[{title:"Candidate",explanation:"Provider reasoning"}],verification:{status:"VERIFIED_WITHIN_SCOPE"}}};
    }}});
    assert.equal(calls,1);assert.equal(solution.provenance?.engine,"ai");assert.equal(solution.verification?.status,"UNVERIFIED");
  }
});
test("invalid computed inequality cannot be saved or returned as verified",async t=>{
  const divide=Rational.prototype.div;let calls=0,saves=0;
  t.mock.method(Rational.prototype,"div",function(this:Rational,other:Rational){return ++calls===1?ONE:divide.call(this,other);});
  await assert.rejects(solve(input("solve -2x+3<=7"),{knowledge,provider:noProvider,persistence:{save:async()=>{saves++;return "saved";}}}),{code:"VERIFICATION_FAILED",httpStatus:422});
  assert.equal(saves,0);
});
for(const precision of [true,false]) test(`executor errors distinguish ${precision?"unsupported precision":"internal failure"}`,async t=>{
  t.mock.method(Rational.prototype,"div",()=>{throw precision?new RationalPrecisionError("limit"):new Error("private implementation details");});
  await assert.rejects(solve(input("solve -2x+3<=7"),{knowledge,provider:noProvider,persistence:{save:async()=>{assert.fail("Must not persist");}}}),{code:precision?"UNSUPPORTED":"INTERNAL_ERROR",httpStatus:precision?422:500});
});
test("verification exceptions stay inconclusive and public internal errors are sanitized",()=>{
  const {problem}=parsed("solve x<2");
  assert.equal(report(problem,{kind:"mathematics",value:null} as unknown as MathematicsResult).status,"PARTIAL");
  const error=publicError(new Error("private implementation details"));assert.equal(error.code,"INTERNAL_ERROR");assert.equal(error.httpStatus,500);assert.ok(!error.message.includes("private"));
});
