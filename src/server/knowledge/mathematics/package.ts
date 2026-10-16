import type { KnowledgeBundle, Pedagogy } from "../schema.ts";
import type { MathOperation } from "../../solvers/mathematics-contracts.ts";
import {
  mathConcept,
  mathPattern,
} from "../../solvers/mathematics-contracts.ts";
export interface ConceptSeed {
  operation: MathOperation;
  title: string;
  definition: string;
  display: string;
  conditions: string[];
  method: string[];
  verification: string;
  mistake: string;
  example: { problem: string; answer: string };
  prerequisites?: MathOperation[];
}
/** Packages use the existing knowledge graph. Algorithm formulas are typed signatures,
 * not pretend scalar formulas or executable source strings. */
export function mathematicsPackage(
  id: string,
  family: "polynomial" | "matrix" | "finite-data",
  seeds: ConceptSeed[],
  source: { title: string; url: string; locator: string },
): KnowledgeBundle {
  const pedagogy: Pedagogy = {
    levels: ["school", "college", "competitive-exam", "advanced"],
    difficulty: family === "matrix" ? "intermediate" : "introductory",
    examGuidance:
      "Check applicability and degenerate cases before applying a shortcut.",
    limitations: [
      "Bounded exact rational input",
      "Human subject review pending; executable seed tested in code",
    ],
  };
  return {
    id,
    metadata: {
      schemaVersion: 1,
      revision: 1,
      state: "candidate",
      validation: "passed",
      createdAt: "2026-10-08T00:00:00Z",
      updatedAt: "2026-10-08T00:00:00Z",
      author: "Solvy implementation",
      generatedBy: "Codex",
      review: {
        method:
          "Source-grounded algorithm signatures and automated regression checks; not human publication",
        reviewer: "Automated checks only",
        confidence: null,
      },
    },
    taxonomy: [
      {
        id: `${id}-domain`,
        kind: "domain",
        label: "Formal science",
        parent: null,
      },
      {
        id: `${id}-math`,
        kind: "subject",
        label: "Mathematics",
        parent: `${id}-domain`,
      },
      { id: `${id}-topic`, kind: "topic", label: id, parent: `${id}-math` },
    ],
    concepts: [
      ...new Map(
        seeds.map((s) => [
          mathConcept(s.operation),
          {
            id: mathConcept(s.operation),
            topic: `${id}-topic`,
            title: s.title,
            definitions: [s.definition],
            laws: [s.display],
            prerequisites: (s.prerequisites ?? []).map(mathConcept),
            related: [],
            pedagogy,
          },
        ]),
      ).values(),
    ],
    quantities: [
      {
        id: "result",
        meaning:
          "Typed mathematical result; interpreted by the operation signature",
        dimension: [0, 0, 0, 0, 0, 0, 0],
        kind: "mathematical-object",
        domain:
          "Dimensionless mathematical objects; structured results are not physical quantities",
      },
    ],
    variables: [],
    units: [],
    formulas: seeds.map((s) => ({
      id: `formula-${s.operation}`,
      concept: mathConcept(s.operation),
      display: s.display,
      target: "result",
      expression: {
        kind: "algorithm",
        operation: s.operation,
        input: family,
        output: "result",
      },
      bindings: { result: "result" },
      conditions: s.conditions,
      assumptions: [
        "Exact rational input",
        "Real scalar variable where applicable",
      ],
      rearrangements: [],
    })),
    relationships: seeds.flatMap((s) => [
      {
        from: mathConcept(s.operation),
        to: `formula-${s.operation}`,
        kind: "uses" as const,
      },
      ...(s.prerequisites ?? []).map((op) => ({
        from: mathConcept(s.operation),
        to: mathConcept(op),
        kind: "prerequisite" as const,
      })),
    ]),
    patterns: seeds.map((s) => ({
      id: mathPattern(s.operation),
      concept: mathConcept(s.operation),
      known: [],
      unknown: ["result"],
      formula: `formula-${s.operation}`,
      method: `method-${s.operation}`,
      constraints: ["bounded exact mathematics"],
    })),
    methods: seeds.map((s) => ({
      id: `method-${s.operation}`,
      executor: "exact-mathematics-v1",
      operations: s.method,
    })),
    verificationRules: seeds.flatMap((s) => [
      {
        id: `check-${s.operation}`,
        checker: `independent-${s.operation}`,
        appliesTo: mathPattern(s.operation),
        claim: s.verification,
      },
      {
        id: `display-${s.operation}`,
        checker: "explanation-consistency",
        appliesTo: mathPattern(s.operation),
        claim: "Displayed result equals checked result",
      },
    ]),
    commonMistakes: seeds.map((s) => ({
      id: `mistake-${s.operation}`,
      concept: mathConcept(s.operation),
      trigger: s.operation,
      guidance: s.mistake,
    })),
    examples: seeds.map((s) => ({
      id: `example-${s.operation}`,
      pattern: mathPattern(s.operation),
      ...s.example,
    })),
    sources: [
      {
        id: `${id}-source`,
        ...source,
        accessedAt: "2026-10-08",
        supports: [...new Set(seeds.map((s) => mathConcept(s.operation)))],
      },
    ],
  };
}
