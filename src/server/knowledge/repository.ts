import "server-only";
import { statisticsKnowledge, sequencesKnowledge, countingKnowledge } from "./mathematics/finite-data.ts";
import { algebraKnowledge } from "./mathematics/algebra.ts";
import { calculusKnowledge } from "./mathematics/calculus.ts";
import { linearAlgebraKnowledge } from "./mathematics/linear-algebra.ts";
import { foundation } from "./foundation.ts";
import { validateKnowledge, type KnowledgeBundle } from "./schema.ts";
function freeze<T>(value: T): T {
  if (value && typeof value === "object") { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}
// Explicit code-shipped seed. This is NOT an auto-publishing ingestion path.
// Candidate provenance is retained; passing computations does not imply human content review.
const bundled = freeze(validateKnowledge(foundation));
const mathematics = [algebraKnowledge, calculusKnowledge, linearAlgebraKnowledge, statisticsKnowledge, sequencesKnowledge, countingKnowledge].map(b => freeze(validateKnowledge(b)));
const shipped = new Set([bundled, ...mathematics]);
export interface KnowledgeRepository {
  retrieve(concept: string): KnowledgeBundle | undefined;
}
export class BundledKnowledgeRepository implements KnowledgeRepository {
  private readonly index: Map<string, KnowledgeBundle>;
  /** The legacy profile remains useful to explicitly exercise provider fallback.
   * The application composition root enables the complete shipped catalog. */
  constructor(profile: "foundation" | "mathematics" = "foundation") {
    const packages = profile === "mathematics" ? [bundled, ...mathematics] : [bundled];
    this.index = new Map();
    for (const bundle of packages) for (const concept of bundle.concepts) {
      if(this.index.has(concept.id)) throw new Error("Duplicate concept across packages");
      this.index.set(concept.id, bundle);
    }
  }
  retrieve(concept: string): KnowledgeBundle | undefined { return this.index.get(concept); }
  /** Structural graph traversal, never keyword ranking. References remain package scoped. */
  context(concept: string) {
    const bundle = this.retrieve(concept); if(!bundle) return undefined;
    const selected = new Set<string>(), pending = [concept];
    while(pending.length) {
      const id = pending.pop()!; if(selected.has(id)) continue; selected.add(id);
      if(selected.size > 256) throw new Error("Retrieval graph limit");
      const item=bundle.concepts.find(c=>c.id===id);
      pending.push(...(item?.prerequisites??[]), ...(item?.related??[]));
      pending.push(...bundle.relationships.filter(r=>r.from===id).map(r=>r.to));
    }
    const patterns=bundle.patterns.filter(p=>selected.has(p.concept));
    return {bundle, concepts:bundle.concepts.filter(c=>selected.has(c.id)),
      formulas:bundle.formulas.filter(f=>selected.has(f.concept)||selected.has(f.id)), patterns,
      methods:bundle.methods.filter(m=>patterns.some(p=>p.method===m.id)),
      verificationRules:bundle.verificationRules.filter(r=>patterns.some(p=>p.id===r.appliesTo)),
      relationships:bundle.relationships.filter(r=>selected.has(r.from))};
  }
}
export function executablePattern(bundle: KnowledgeBundle, patternId: string) {
  if (bundle.metadata.validation !== "passed" || bundle.metadata.state === "deprecated") return undefined;
  // Only these reviewed-in-code seed identities are eligible without a publishing workflow.
  if (!shipped.has(bundle)) return undefined;
  return bundle.patterns.find(pattern => pattern.id === patternId);
}
