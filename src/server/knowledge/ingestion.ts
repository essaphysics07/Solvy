import { createHash } from "node:crypto";
import { validateKnowledge, type KnowledgeBundle } from "./schema.ts";
export interface CandidateAssessment {
  candidate: KnowledgeBundle;
  digest: string;
  checks: { id: string; status: "PASS" | "INCONCLUSIVE"; evidence: string }[];
  publicationEligible: false;
}
/** Assess an isolated versioned candidate. This function neither registers executable
 * knowledge nor mutates its input. Schema validity is not a mathematical truth certificate. */
export function assessKnowledgeCandidate(input: unknown): CandidateAssessment {
  const validated = validateKnowledge(input);
  if (validated.metadata.state !== "candidate")
    throw new Error(
      "Ingestion accepts candidates only; publication requires a separate reviewed release",
    );
  const candidate = structuredClone(validated);
  const supported = new Set(candidate.sources.flatMap((s) => s.supports));
  if (candidate.concepts.some((c) => !supported.has(c.id)))
    throw new Error(
      "Every candidate concept must identify a supporting source",
    );
  if (
    candidate.patterns.some(
      (p) => !candidate.verificationRules.some((r) => r.appliesTo === p.id),
    )
  )
    throw new Error(
      "Every executable candidate pattern needs verification rules",
    );
  // A deterministic content hash makes reviewed revisions identifiable. Property order
  // changes produce different hashes, deliberately invalidating any external approval.
  const digest = createHash("sha256")
    .update(JSON.stringify(candidate))
    .digest("hex");
  return {
    candidate,
    digest,
    publicationEligible: false,
    checks: [
      {
        id: "schema-and-references",
        status: "PASS",
        evidence:
          "Bounded schema, typed algorithms and graph references validated.",
      },
      {
        id: "provenance-and-checkers",
        status: "PASS",
        evidence:
          "Source attribution and verification rule links are present, not automatically vouched for.",
      },
      {
        id: "mathematical-review",
        status: "INCONCLUSIVE",
        evidence:
          "Independent domain review, executable examples and release approval are still required. This assessment grants no executable trust.",
      },
    ],
  };
}
