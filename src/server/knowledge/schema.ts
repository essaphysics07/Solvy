import type { Expression } from "../computation/expression.ts";
import { isRecord } from "../../shared/contracts/solution.ts";
export type Dimension = readonly [number, number, number, number, number, number, number]; // M L T I Θ N J
export interface KnowledgeMetadata {
  schemaVersion: 1; revision: number; state: "candidate" | "published" | "deprecated";
  validation: "passed" | "failed" | "unchecked";
  createdAt: string; updatedAt: string; author: string; generatedBy: string | null;
  review: { method: string; reviewer: string; confidence: { value: number; meaning: string } | null };
}
export interface KnowledgeBundle {
  id: string;
  metadata: KnowledgeMetadata;
  taxonomy: { id: string; kind: "domain" | "subject" | "branch" | "topic"; label: string; parent: string | null }[];
  concepts: { id: string; topic: string; title: string; definitions: string[]; laws: string[]; prerequisites: string[]; related: string[] }[];
  quantities: { id: string; meaning: string; dimension: Dimension; kind: "scalar" | "component"; domain: string }[];
  variables: { id: string; symbol: string; quantity: string }[];
  units: { id: string; symbol: string; aliases: string[]; dimension: Dimension; scale: string; offset: string }[];
  formulas: { id: string; concept: string; display: string; target: string; expression: Expression;
    bindings: Record<string, string>; conditions: string[]; assumptions: string[];
    rearrangements: { target: string; expression: Expression; conditions: string[] }[] }[];
  relationships: { from: string; to: string; kind: "prerequisite" | "related" | "uses" }[];
  patterns: { id: string; concept: string; known: string[]; unknown: string[]; formula: string; method: string; constraints: string[] }[];
  methods: { id: string; executor: "newton-net-force-v1" | "linear-affine-v1"; operations: string[] }[];
  verificationRules: { id: string; checker: string; appliesTo: string; claim: string }[];
  commonMistakes: { id: string; concept: string; trigger: string; guidance: string }[];
  examples: { id: string; problem: string; pattern: string; answer: string }[];
  sources: { id: string; title: string; url: string; locator: string; accessedAt: string; supports: string[] }[];
}
const listKeys = ["taxonomy", "concepts", "quantities", "variables", "units", "formulas", "relationships", "patterns", "methods", "verificationRules", "commonMistakes", "examples", "sources"] as const;
function ensure(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(`Invalid knowledge: ${message}`); }
function strings(value: unknown): value is string[] { return Array.isArray(value) && value.every(v => typeof v === "string"); }
function record(value: unknown): asserts value is Record<string, unknown> { ensure(isRecord(value), "object expected"); }
function fields(value: Record<string, unknown>, names: string[]) { ensure(names.every(key => typeof value[key] === "string" && value[key] !== ""), names.join(",")); }
function dimensions(value: unknown) { ensure(Array.isArray(value) && value.length === 7 && value.every(Number.isInteger), "seven dimension exponents required"); }
function expression(value: unknown, depth = 0): string[] {
  record(value); ensure(depth < 20, "expression depth");
  if (value.kind === "number") { ensure(typeof value.value === "string" && /^[+-]?\d+(?:\.\d+)?$/.test(value.value), "numeric literal"); return []; }
  if (value.kind === "variable") { fields(value, ["name"]); return [value.name as string]; }
  if (value.kind === "negate") return expression(value.value, depth + 1);
  ensure(value.kind === "binary" && ["+", "-", "*", "/"].includes(String(value.op)), "allowed operation");
  return [...expression(value.left, depth + 1), ...expression(value.right, depth + 1)];
}
/** Used for built-in records and future ingestion. Shape, references, dimensions, and executable grammar are checked. */
export function validateKnowledge(value: unknown): KnowledgeBundle {
  record(value); fields(value, ["id"]); record(value.metadata);
  const meta = value.metadata;
  ensure(meta.schemaVersion === 1 && Number.isInteger(meta.revision) && Number(meta.revision) > 0, "version");
  ensure(["candidate", "published", "deprecated"].includes(String(meta.state)), "publication state");
  ensure(["passed", "failed", "unchecked"].includes(String(meta.validation)), "validation state");
  fields(meta, ["createdAt", "updatedAt", "author"]);
  ensure([meta.createdAt, meta.updatedAt].every(v => Number.isFinite(Date.parse(String(v)))), "dates");
  ensure(meta.generatedBy === null || typeof meta.generatedBy === "string", "provenance");
  record(meta.review); fields(meta.review, ["method", "reviewer"]);
  if (meta.review.confidence !== null) {
    record(meta.review.confidence); fields(meta.review.confidence, ["meaning"]);
    ensure(typeof meta.review.confidence.value === "number" && meta.review.confidence.value >= 0 && meta.review.confidence.value <= 1, "confidence");
  }
  for (const key of listKeys) ensure(Array.isArray(value[key]), key);
  const rows = (key: typeof listKeys[number]) => value[key] as Record<string, unknown>[];
  const ids = new Set<string>();
  for (const key of listKeys.filter(k => k !== "relationships")) {
    for (const row of rows(key)) { record(row); fields(row, ["id"]); ensure(!ids.has(String(row.id)), "duplicate ID"); ids.add(String(row.id)); }
  }
  const refs = (items: unknown, key?: typeof listKeys[number]) => {
    ensure(strings(items), "reference list");
    const allowed = key ? new Set(rows(key).map(row => row.id)) : ids;
    for (const item of items) ensure(allowed.has(item), `missing ${key ?? "record"}: ${item}`);
  };
  for (const row of rows("taxonomy")) {
    fields(row, ["label"]); ensure(["domain", "subject", "branch", "topic"].includes(String(row.kind)), "taxonomy kind");
    if (row.parent !== null) refs([row.parent], "taxonomy");
    const seen = new Set<unknown>([row.id]); let parent = row.parent;
    while (parent !== null) { ensure(!seen.has(parent), "taxonomy cycle"); seen.add(parent); parent = rows("taxonomy").find(r => r.id === parent)?.parent ?? null; }
  }
  for (const row of rows("concepts")) {
    fields(row, ["title"]); refs([row.topic], "taxonomy");
    ensure(strings(row.definitions) && strings(row.laws), "concept content"); refs(row.prerequisites); refs(row.related);
  }
  for (const row of rows("quantities")) { fields(row, ["meaning", "domain"]); dimensions(row.dimension); ensure(row.kind === "scalar" || row.kind === "component", "quantity kind"); }
  for (const row of rows("variables")) { fields(row, ["symbol"]); refs([row.quantity], "quantities"); }
  for (const row of rows("units")) {
    fields(row, ["symbol", "scale", "offset"]); dimensions(row.dimension); ensure(strings(row.aliases), "unit aliases");
    ensure(Number.isFinite(Number(row.scale)) && Number(row.scale) > 0 && Number.isFinite(Number(row.offset)), "unit conversion");
  }
  for (const row of rows("formulas")) {
    fields(row, ["display", "target"]); refs([row.concept], "concepts"); record(row.bindings); refs(Object.values(row.bindings), "quantities");
    ensure(String(row.target) in row.bindings, "target binding");
    ensure(expression(row.expression).every(v => v in (row.bindings as object)), "formula bindings");
    ensure(strings(row.conditions) && strings(row.assumptions) && Array.isArray(row.rearrangements), "formula conditions");
    for (const item of row.rearrangements) { record(item); fields(item, ["target"]); ensure(String(item.target) in row.bindings && strings(item.conditions), "rearrangement"); ensure(expression(item.expression).every(v => v in (row.bindings as object)), "rearrangement binding"); }
  }
  for (const row of rows("relationships")) { record(row); refs([row.from, row.to]); ensure(["prerequisite", "related", "uses"].includes(String(row.kind)), "relationship kind"); }
  for (const row of rows("patterns")) { refs([row.concept], "concepts"); refs([row.formula], "formulas"); refs([row.method], "methods"); refs(row.known, "quantities"); refs(row.unknown, "quantities"); ensure(strings(row.constraints), "pattern constraints"); }
  for (const row of rows("methods")) { ensure(["newton-net-force-v1", "linear-affine-v1"].includes(String(row.executor)) && strings(row.operations), "method executor"); }
  for (const row of rows("verificationRules")) { fields(row, ["checker", "claim"]); refs([row.appliesTo], "patterns"); }
  for (const row of rows("commonMistakes")) { fields(row, ["trigger", "guidance"]); refs([row.concept], "concepts"); }
  for (const row of rows("examples")) { fields(row, ["problem", "answer"]); refs([row.pattern], "patterns"); }
  for (const row of rows("sources")) { fields(row, ["title", "url", "locator", "accessedAt"]); ensure(String(row.url).startsWith("https://"), "source URL"); refs(row.supports); }
  return value as unknown as KnowledgeBundle;
}
