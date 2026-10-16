import test from "node:test";
import assert from "node:assert/strict";
import katex from "katex";
import { solve } from "../src/server/solving/orchestrator.ts";
import { understandMathematics } from "../src/server/solving/mathematics.ts";
import { routeProblem } from "../src/server/solving/router.ts";
import { solveMathematics } from "../src/server/solvers/mathematics.ts";
import { verify } from "../src/server/verification/verify.ts";
import { explain } from "../src/server/solving/explain.ts";
import {
  BundledKnowledgeRepository,
  executablePattern,
} from "../src/server/knowledge/repository.ts";
import { validateKnowledge } from "../src/server/knowledge/schema.ts";
import { assessKnowledgeCandidate } from "../src/server/knowledge/ingestion.ts";
import {
  parsePolynomial,
  coefficients,
  squareRoot,
} from "../src/server/computation/polynomials.ts";
import { Rational, ZERO, ONE } from "../src/server/computation/rational.ts";
import type { AIProvider } from "../src/server/ai/provider.ts";
import type { MathematicsResult } from "../src/server/solvers/mathematics-contracts.ts";
const knowledge = new BundledKnowledgeRepository("mathematics");
const provider: AIProvider = {
  id: "not-needed",
  capabilities: {
    text: true,
    vision: true,
    structuredOutput: true,
    audio: false,
  },
  generate: async () => {
    throw new Error("Unexpected AI call");
  },
};
function parsed(source: string) {
  const r = understandMathematics(source);
  if (r.status !== "understood" || r.problem.kind !== "mathematics")
    assert.fail(source);
  return { problem: r.problem, representation: r.representation };
}
const cases: readonly (readonly [string, string])[] = [
  ["calculate 0.1+0.2", "3/10"],
  ["1/3+1/6", "1/2"],
  ["calculate -2^2", "-4"],
  ["calculate (-2)^2", "4"],
  ["expand (x+1)^2", "1*x^2 + 2*x + 1"],
  ["simplify (x+1)*(x-1)", "1*x^2 - 1"],
  ["differentiate x^3-2x", "3*x^2 - 2"],
  ["differentiate 4", "0"],
  ["differentiate y^2/3", "2/3*y"],
  ["integrate x^2", "1/3*x^3 + C"],
  ["integrate 0", "0 + C"],
  ["integrate x^2 from 0 to 3", "9"],
  ["integrate x^2 from 3 to 0", "-9"],
  ["integrate x^2 from 2 to 2", "0"],
  ["solve x^2-5x+6=0", "x = 2 or 3"],
  ["solve (x-1)^2=0", "x = 1"],
  ["solve x^2+1=0", "No real solution"],
  ["solve x^2=2", "x = 0 +/- (1/2)*sqrt(8)"],
  ["solve -x^2+2=0", "x = 0 +/- (-1/2)*sqrt(8)"],
  ["find the minimum of x^2-4x+3", "minimum = -1 at x = 2"],
  [
    "find the maximum of x^2-4x+3",
    "No global maximum (unbounded over the real numbers)",
  ],
  ["find the maximum of -x^2+4x+3", "maximum = 7 at x = 2"],
  ["find the minimum of 5", "minimum = 5 (every real input)"],
  [
    "find the minimum of x",
    "No global minimum (unbounded over the real numbers)",
  ],
  ["determinant [[0,1],[1,0]]", "-1"],
  ["determinant [[1,2],[2,4]]", "0"],
  ["determinant [[7]]", "7"],
  ["inverse [[1,2],[3,4]]", "[[-2, 1], [3/2, -1/2]]"],
  ["inverse [[1,2],[2,4]]", "Singular matrix: no inverse"],
  ["rank [[1,2],[2,4]]", "1"],
  ["rank [[0,0,0],[0,0,0]]", "0"],
  ['determinant [["0.1","1/3"],["0.2",1]]', "1/30"],
  ["solve linear system [[2,1,5],[1,-1,1]]", "x1 = 2, x2 = 1"],
  ["solve linear system [[1,2,3],[2,4,7]]", "No solution"],
  [
    "solve linear system [[1,2,3],[2,4,6]]",
    "x = (3, 0) + t1 (-2, 1); all parameters real",
  ],
  [
    "solve linear system [[0,0,0]]",
    "x = (0, 0) + t1 (1, 0) + t2 (0, 1); all parameters real",
  ],
];
for (const [problem, answer] of cases)
  test(`mathematics vertical slice: ${problem}`, async () => {
    let saved = false;
    const result = await solve(
      { problem, subject: "mathematics", explanationLevel: "deep-dive" },
      {
        knowledge,
        provider,
        persistence: {
          save: async (row) => {
            assert.equal(row.solution.answer, answer);
            saved = true;
            return "saved";
          },
        },
      },
    );
    assert.equal(result.answer, answer);
    assert.ok(saved);
    assert.equal(result.verification?.status, "VERIFIED_WITHIN_SCOPE");
    assert.equal(result.provenance?.engine, "deterministic");
    assert.ok(result.provenance?.knowledge?.[0].revision);
    for (const step of result.steps)
      if (step.expression)
        katex.renderToString(step.expression, {
          throwOnError: true,
          strict: "error",
        });
  });
for (const source of [
  "integrate x^2 sin x",
  "differentiate sin(x)",
  "solve x^3=1",
  "solve x/x=1",
  "solve x/(x-x+1)=2",
  "solve x+y=2",
  "solve x x=4",
  "solve 2x=4 and x>5",
  "solve x=1 over integers",
  "solve 2x=4=5",
  "calculate process.exit()",
  "calculate 1/0",
  "calculate 0^0",
  "calculate 2^-2",
  "calculate 2^1000000",
  "calculate 2^2^2",
  "simplify (x/(x-x))^0",
  "differentiate x^13",
  "rank [[1],[1,2]]",
  "rank [[0.1]]",
  "inverse [[1,2]]",
  "solve linear system [[1]]",
  "rank [[null]]",
  "rank [[true]]",
  "rank [[9007199254740993]]",
  'rank [["1/0"]]',
  "rank [[1]] trailing",
  "find the maximum of x^2 on [0,1]",
  "find the eigenvalues of [[1,2],[3,4]]",
])
  test(`mathematics rejects unsupported or ambiguous input: ${source}`, () =>
    assert.equal(understandMathematics(source).status, "unsupported"));
test("parser bounds include expanded shared powers and recursion", () => {
  for (const s of [
    "(".repeat(25) + "x" + ")".repeat(25),
    "1+".repeat(100) + "1",
    "9".repeat(401),
    "((((1+0)^12)^12)^12)^12",
  ])
    assert.throws(() => parsePolynomial(s));
});
test("polynomial parser retains normal precedence and exact decimals", () => {
  assert.deepEqual(coefficients(parsePolynomial("-(x+1)^2/2")).map(String), [
    "-1/2",
    "-1",
    "-1/2",
  ]);
  assert.equal(squareRoot(new Rational(9n, 16n))?.toString(), "3/4");
  assert.equal(squareRoot(new Rational(2n)), undefined);
});
test("generated quadratic families preserve both roots and full classification", () => {
  for (let a = -3; a <= 3; a++)
    if (a)
      for (let x = -3; x <= 3; x++)
        for (let y = x; y <= 3; y++) {
          const { problem } = parsed(`solve ${a}*(x-(${x}))*(x-(${y}))=0`),
            r = solveMathematics(problem);
          assert.equal(
            verify(problem, r, knowledge.retrieve(problem.concept)!).status,
            "VERIFIED_WITHIN_SCOPE",
          );
          if (r.value.type !== "roots") assert.fail();
          assert.deepEqual(
            r.value.rational.map(String).sort(),
            [...new Set([String(x), String(y)])].sort(),
          );
        }
});
test("generated polynomial derivatives and antiderivatives verify through original AST", () => {
  for (let degree = 0; degree <= 12; degree++)
    for (let coefficient = -2; coefficient <= 2; coefficient++)
      for (const op of ["differentiate", "integrate", "simplify"]) {
        // Degree-zero polynomials are constants, not x^0 (undefined at x=0).
        const term = degree === 0 ? `${coefficient}` : `${coefficient}*x^${degree}`;
        const { problem } = parsed(`${op} ${term}+1/3`),
          r = solveMathematics(problem);
        assert.equal(
          verify(problem, r, knowledge.retrieve(problem.concept)!).status,
          "VERIFIED_WITHIN_SCOPE",
        );
      }
});
test("generated rational matrix inverses, ranks and systems independently verify", () => {
  for (let a = -3; a <= 3; a++)
    for (let b = -3; b <= 3; b++)
      for (const source of [
        `inverse [[${a},1],[${b},2]]`,
        `rank [[${a},1],[${b},2]]`,
        `solve linear system [[${a},1,3],[${b},2,4]]`,
      ]) {
        const { problem } = parsed(source);
        assert.equal(
          verify(
            problem,
            solveMathematics(problem),
            knowledge.retrieve(problem.concept)!,
          ).status,
          "VERIFIED_WITHIN_SCOPE",
        );
      }
});
test("router rejects forged mathematical summaries, operation, evidence and bundle identity", () => {
  const { problem, representation } = parsed("differentiate x^3");
  const bundle = knowledge.retrieve(problem.concept)!;
  assert.equal(routeProblem(representation, bundle).status, "matched");
  assert.equal(
    routeProblem(JSON.parse(JSON.stringify(representation)), bundle).status,
    "matched",
  );
  for (const bad of [
    {
      ...representation,
      known: [{ quantity: "fake", unit: "one", value: "9", evidence: "" }],
    },
    { ...representation, evidence: [] },
    { ...representation, mathematics: undefined },
    { ...representation, mathematics: { ...problem, coefficients: ["99"] } },
    { ...representation, concept: "exact-arithmetic" },
    { ...representation, constraints: [] },
  ])
    assert.equal(routeProblem(bad, bundle).status, "unsupported");
  assert.equal(
    routeProblem(representation, structuredClone(bundle)).status,
    "unsupported",
  );
});
test("independent verification rejects tampered math results and cached coefficients", () => {
  const tampered: [string, MathematicsResult][] = [
    [
      "calculate 0.1+0.2",
      { kind: "mathematics", value: { type: "scalar", value: ONE } },
    ],
    [
      "differentiate x^3",
      {
        kind: "mathematics",
        value: {
          type: "polynomial",
          coefficients: [ZERO, ONE],
          constantOfIntegration: false,
        },
      },
    ],
    [
      "integrate x^2",
      {
        kind: "mathematics",
        value: {
          type: "polynomial",
          coefficients: [ZERO, ZERO, ZERO, new Rational(1n, 3n)],
          constantOfIntegration: false,
        },
      },
    ],
    [
      "solve x^2-1=0",
      {
        kind: "mathematics",
        value: {
          type: "roots",
          classification: "finite",
          rational: [ONE, ONE],
        },
      },
    ],
    [
      "solve x^2=2",
      {
        kind: "mathematics",
        value: {
          type: "roots",
          classification: "finite",
          rational: [],
          surd: { center: ZERO, scale: ONE, radicand: new Rational(3n) },
        },
      },
    ],
    [
      "rank [[1,2],[2,4]]",
      {
        kind: "mathematics",
        value: { type: "scalar", value: new Rational(2n) },
      },
    ],
    [
      "inverse [[1,0],[0,1]]",
      { kind: "mathematics", value: { type: "singular" } },
    ],
    [
      "solve linear system [[1,2,3]]",
      {
        kind: "mathematics",
        value: {
          type: "system",
          classification: "infinite",
          particular: [new Rational(3n), ZERO],
          nullspace: [],
        },
      },
    ],
  ];
  for (const [source, r] of tampered) {
    const { problem } = parsed(source);
    assert.equal(
      verify(problem, r, knowledge.retrieve(problem.concept)!).status,
      "FAILED",
      source,
    );
  }
  const { problem } = parsed("differentiate x^3");
  if (problem.family !== "polynomial") assert.fail();
  const corrupt = { ...problem, coefficients: ["0", "99"] };
  assert.equal(
    verify(
      problem,
      solveMathematics(corrupt),
      knowledge.retrieve(problem.concept)!,
    ).status,
    "FAILED",
  );
});
test("all explanation levels retain the authoritative result and reject edited explanations", () => {
  const { problem } = parsed("solve x^2=2"),
    result = solveMathematics(problem),
    bundle = knowledge.retrieve(problem.concept)!;
  let answer: string | undefined;
  for (const level of ["simple", "step-by-step", "deep-dive"] as const) {
    const content = explain(problem, result, level);
    answer ??= content.answer;
    assert.equal(content.answer, answer);
    assert.equal(
      verify(problem, result, bundle, content, level).status,
      "VERIFIED_WITHIN_SCOPE",
    );
    assert.equal(
      verify(problem, result, bundle, { ...content, answer: "x=999" }, level)
        .status,
      "FAILED",
    );
  }
});
test("graph retrieval returns methods, conditions, prerequisites and verification", () => {
  const context = knowledge.context("polynomial-antiderivative")!;
  assert.ok(context.concepts.some((c) => c.id === "polynomial-derivative"));
  assert.ok(context.formulas.every((f) => f.conditions.length));
  assert.equal(context.patterns.length, 2);
  assert.equal(context.methods.length, 2);
  assert.equal(context.verificationRules.length, 4);
});
test("candidate assessment preserves provenance and never registers executable knowledge", () => {
  const source = structuredClone(knowledge.retrieve("polynomial-derivative")!),
    before = JSON.stringify(source),
    report = assessKnowledgeCandidate(source);
  assert.equal(JSON.stringify(source), before);
  assert.notEqual(report.candidate, source);
  assert.equal(report.publicationEligible, false);
  assert.equal(report.digest.length, 64);
  assert.equal(
    executablePattern(report.candidate, "math-differentiate-v1"),
    undefined,
  );
  assert.equal(report.candidate.metadata.state, "candidate");
  const forged = structuredClone(source);
  forged.metadata.state = "published";
  assert.throws(() => assessKnowledgeCandidate(forged));
  forged.metadata.state = "candidate";
  forged.sources = [];
  assert.throws(() => assessKnowledgeCandidate(forged));
});
test("malformed knowledge cannot bind arbitrary algorithms, methods or concepts", () => {
  const original = knowledge.retrieve("polynomial-derivative")!;
  for (const mutate of [
    (b: any) => (b.formulas[0].expression.operation = "execute-code"),
    (b: any) => (b.methods[0].executor = "shell"),
    (b: any) => (b.formulas[0].expression.input = "matrix"),
    (b: any) => (b.patterns[0].concept = "missing"),
    (b: any) => (b.concepts[0].pedagogy.levels = ["fake"]),
  ]) {
    const bad = structuredClone(original);
    mutate(bad);
    assert.throws(() => validateKnowledge(bad));
  }
  assert.ok(Object.isFrozen(original.concepts[0]));
});
test("expanded catalog still preserves image context and unsupported AI fallback", async () => {
  for (const image of [undefined, { mimeType: "image/png", data: "abc" }]) {
    let calls = 0;
    const result = await solve(
      {
        problem: image ? "differentiate x^3" : "integrate x^2 sin x",
        subject: "mathematics",
        explanationLevel: "simple",
        image,
      },
      {
        knowledge,
        persistence: { save: async () => "skipped" },
        provider: {
          ...provider,
          generate: async (request) => {
            calls++;
            assert.deepEqual(request.image, image);
            return {
              provider: "test",
              model: "test",
              content: {
                title: "Fallback",
                answer: "Outside deterministic scope",
                steps: [
                  {
                    title: "Reason",
                    explanation: "No independent mathematical claim",
                  },
                ],
              },
            };
          },
        },
      },
    );
    assert.equal(calls, 1);
    assert.equal(result.verification?.status, "UNVERIFIED");
  }
});
const moreCases: readonly (readonly [string, string])[] = [
  ["calculate 15% of 200", "30"],
  ["solve -2x+3 <= 7", "x >= -2"],
  ["solve x/3 > 2", "x > 6"],
  ["solve 0x < 0", "No real solution"],
  ["solve 0x <= 0", "All real numbers"],
  ["solve 2x+1>2x+2", "No real solution"],
  ["mean [1,2,3]", "2"],
  ['mean ["0.1","0.2"]', "3/20"],
  ["population variance [1,2,3]", "2/3"],
  ["sample variance [1,2,3]", "1"],
  ["population variance [9]", "0"],
  ["sample variance [3,3]", "0"],
  ["arithmetic sum a=2, d=3, n=5", "40"],
  ["arithmetic sum a=2, d=-3, n=5", "-20"],
  ["arithmetic sum a=2, d=3, n=0", "0"],
  ["geometric sum a=2, r=3, n=4", "80"],
  ["geometric sum a=2, r=1, n=4", "8"],
  ["geometric sum a=2, r=0, n=4", "2"],
  ["geometric sum a=2, r=-1, n=4", "0"],
  ["geometric sum a=2, r=1/2, n=3", "7/2"],
  ["combinations n=5, k=2", "10"],
  ["combinations n=0, k=0", "1"],
  ["permutations n=5, k=2", "20"],
  ["permutations n=5, k=0", "1"],
  ["binomial probability n=3, k=2, p=1/2", "3/8"],
  ["binomial at least n=3, k=2, p=1/2", "1/2"],
  ["binomial probability n=3, k=0, p=0", "1"],
  ["binomial at least n=3, k=1, p=0", "0"],
  ["binomial probability n=3, k=3, p=1", "1"],
  ["binomial at least n=0, k=0, p=1/2", "1"],
];
for (const [problem, answer] of moreCases)
  test(`finite data and inequalities vertical slice: ${problem}`, async () => {
    const result = await solve(
      { problem, subject: "mathematics", explanationLevel: "deep-dive" },
      { knowledge, provider, persistence: { save: async () => "skipped" } },
    );
    assert.equal(result.answer, answer);
    assert.equal(result.verification?.status, "VERIFIED_WITHIN_SCOPE");
    for (const step of result.steps)
      if (step.expression)
        katex.renderToString(step.expression, {
          throwOnError: true,
          strict: "error",
        });
  });
for (const source of [
  "mean []",
  "mean [0.1,0.2]",
  "sample variance [1]",
  "variance [1,2,3]",
  "combinations n=2, k=3",
  "combinations n=101, k=2",
  "combinations n=2, k=1, p=1/2",
  "binomial probability n=3, k=2",
  "binomial probability n=3, k=2, p=1.1",
  "binomial probability n=51, k=2, p=1/2",
  "geometric sum a=1, d=2, n=3",
  "arithmetic sum a=1, d=2, n=101",
  "arithmetic sum a=1, d=2, n=-1",
  "solve x^2<4",
  "solve 1<x<2",
  "solve x!=2",
])
  test(`finite data/inequality domain rejection: ${source}`, () =>
    assert.equal(understandMathematics(source).status, "unsupported"));
test("generated statistics, sequence and counting checks use independent methods", () => {
  for (let n = 0; n <= 15; n++) {
    for (let k = 0; k <= n; k++)
      for (const op of [
        "combinations",
        "permutations",
        "binomial probability",
        "binomial at least",
      ]) {
        const source = `${op} n=${n}, k=${k}${op.startsWith("binomial") ? ", p=1/3" : ""}`;
        const { problem } = parsed(source),
          bundle = knowledge.retrieve(problem.concept)!;
        const result = solveMathematics(problem);
        assert.equal(
          verify(problem, result, bundle).status,
          "VERIFIED_WITHIN_SCOPE",
          source,
        );
        if (result.value.type !== "scalar") assert.fail();
        assert.equal(
          verify(
            problem,
            {
              kind: "mathematics",
              value: { type: "scalar", value: result.value.value.add(ONE) },
            },
            bundle,
          ).status,
          "FAILED",
        );
      }
    for (const source of [
      `arithmetic sum a=1/3, d=-2/5, n=${n}`,
      `geometric sum a=1/3, r=-2/5, n=${n}`,
      `sample variance [${n},${n + 1},${n - 2}]`,
    ]) {
      const { problem } = parsed(source);
      assert.equal(
        verify(
          problem,
          solveMathematics(problem),
          knowledge.retrieve(problem.concept)!,
        ).status,
        "VERIFIED_WITHIN_SCOPE",
        source,
      );
    }
  }
});
test("generated inequalities check orientation and strict boundary membership", () => {
  for (let a = -3; a <= 3; a++)
    for (let c = -2; c <= 2; c++)
      for (const relation of ["<", "<=", ">", ">="]) {
        const { problem } = parsed(`solve ${a}x+(${c}) ${relation} 0`),
          bundle = knowledge.retrieve(problem.concept)!,
          result = solveMathematics(problem);
        assert.equal(
          verify(problem, result, bundle).status,
          "VERIFIED_WITHIN_SCOPE",
        );
        if (
          result.value.type === "interval" &&
          result.value.classification === "half-line"
        ) {
          const r = result.value;
          assert.equal(
            verify(
              problem,
              {
                kind: "mathematics",
                value: { ...r, relation: r.relation === "<" ? ">" : "<" },
              },
              bundle,
            ).status,
            "FAILED",
          );
        }
      }
});
test("all shipped new knowledge examples solve with their advertised answers", async () => {
  const visited = new Set<string>();
  for (const [source] of [...cases, ...moreCases]) {
    const { problem } = parsed(source),
      bundle = knowledge.retrieve(problem.concept)!;
    if (visited.has(bundle.id)) continue;
    visited.add(bundle.id);
    for (const example of bundle.examples) {
      const result = await solve(
        {
          problem: example.problem,
          subject: "mathematics",
          explanationLevel: "simple",
        },
        { knowledge, provider, persistence: { save: async () => "skipped" } },
      );
      assert.equal(result.answer, example.answer, example.id);
      assert.equal(result.verification?.status, "VERIFIED_WITHIN_SCOPE");
    }
  }
  assert.equal(visited.size, 6);
});
test("degree cancellation remains independently provable for equations and inequalities", () => {
  for (const source of [
    "solve x^3-x^3+x^2=4",
    "solve x^2-x^2+2x < 4",
    "find the minimum of x^3-x^3+x^2",
  ]) {
    const { problem } = parsed(source);
    assert.equal(
      verify(
        problem,
        solveMathematics(problem),
        knowledge.retrieve(problem.concept)!,
      ).status,
      "VERIFIED_WITHIN_SCOPE",
    );
  }
  assert.equal(
    understandMathematics("simplify (x-x)^12*(x-x)^12").status,
    "unsupported",
    "Bound syntactic work even when coefficients cancel",
  );
});
test("maximum matrix dimensions and dependent rows remain bounded and exact", () => {
  for (const op of ["determinant", "inverse", "rank"])
    for (const entries of [
      Array.from({ length: 5 }, (_, i) =>
        Array.from({ length: 5 }, (_, j) => (i === j ? i + 1 : 0)),
      ),
      Array.from({ length: 5 }, () => Array(5).fill(1)),
    ]) {
      const { problem } = parsed(`${op} ${JSON.stringify(entries)}`),
        result = solveMathematics(problem);
      assert.equal(
        verify(problem, result, knowledge.retrieve(problem.concept)!).status,
        "VERIFIED_WITHIN_SCOPE",
      );
      if (op === "determinant" && entries[0][1] === 0) {
        if (result.value.type !== "scalar") assert.fail();
        assert.equal(result.value.value.toString(), "120");
      }
    }
  assert.equal(
    understandMathematics(
      `rank ${JSON.stringify(Array.from({ length: 6 }, () => [1]))}`,
    ).status,
    "unsupported",
  );
});
test("resource-edge finite calculations and exact decimal variance", () => {
  for (const source of [
    "combinations n=100, k=50",
    "permutations n=100, k=100",
    "binomial at least n=50, k=20, p=1/2",
    "geometric sum a=1, r=2, n=100",
    'sample variance ["1000000000000000.1","1000000000000000.2","1000000000000000.3"]',
  ]) {
    const { problem } = parsed(source),
      r = solveMathematics(problem);
    assert.equal(
      verify(problem, r, knowledge.retrieve(problem.concept)!).status,
      "VERIFIED_WITHIN_SCOPE",
      source,
    );
    if (source.startsWith("sample")) {
      if (r.value.type !== "scalar") assert.fail();
      assert.equal(r.value.value.toString(), "1/100");
    }
  }
});
test("oversized and cyclic knowledge candidates fail without executable registration", () => {
  const bundle = structuredClone(knowledge.retrieve("exact-arithmetic")!);
  bundle.concepts[0].definitions = ["x".repeat(1_000_001)];
  assert.throws(() => assessKnowledgeCandidate(bundle));
  const cycle: Record<string, unknown> = {};
  cycle.self = cycle;
  assert.throws(() => assessKnowledgeCandidate(cycle));
});
test("JSON numeric lexemes cannot round into a falsely exact integer", () => {
  for (const source of [
    "mean [1.0000000000000001]",
    "rank [[1.0000000000000001]]",
    "mean [1e-400]",
    "mean [1e2]",
    "mean [0.0]",
  ])
    assert.equal(understandMathematics(source).status, "unsupported", source);
  const { problem } = parsed('mean ["1.0000000000000001","2/4","-1/-2"]'),
    r = solveMathematics(problem);
  assert.equal(
    verify(problem, r, knowledge.retrieve(problem.concept)!).status,
    "VERIFIED_WITHIN_SCOPE",
  );
  if (r.value.type !== "scalar") assert.fail();
  assert.equal(r.value.value.toString(), "6666666666666667/10000000000000000");
});
