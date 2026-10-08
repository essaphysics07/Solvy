import "server-only";
import { foundation } from "./foundation.ts";
import { validateKnowledge, type KnowledgeBundle } from "./schema.ts";
function freeze<T>(value: T): T {
  if (value && typeof value === "object") { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}
// Explicit code-shipped seed. This is NOT an auto-publishing ingestion path.
// Candidate provenance is retained; passing computations does not imply human content review.
const bundled = freeze(validateKnowledge(foundation));
export interface KnowledgeRepository {
  retrieve(concept: string): KnowledgeBundle | undefined;
}
export class BundledKnowledgeRepository implements KnowledgeRepository {
  retrieve(concept: string): KnowledgeBundle | undefined {
    return bundled.concepts.some(item => item.id === concept) ? bundled : undefined;
  }
}
export function executablePattern(bundle: KnowledgeBundle, patternId: string) {
  if (bundle.metadata.validation !== "passed" || bundle.metadata.state === "deprecated") return undefined;
  // Only these reviewed-in-code seed identities are eligible without a publishing workflow.
  if (bundle !== bundled) return undefined;
  return bundle.patterns.find(pattern => pattern.id === patternId);
}
