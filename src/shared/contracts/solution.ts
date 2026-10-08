/** Browser-safe public contract. Provider SDK and executable knowledge types stay server-side. */
export type Subject = "mathematics" | "physics";
export type ExplanationLevel = "simple" | "step-by-step" | "deep-dive";
export type InputMode = "text" | "image" | "voice";
export interface ProblemRequest {
  problem: string;
  subject: Subject;
  explanationLevel: ExplanationLevel;
  image?: File;
}
export type CheckStatus = "PASS" | "FAIL" | "INCONCLUSIVE" | "NOT_APPLICABLE";
export interface VerificationCheck {
  checkerId: string;
  checkerVersion: string;
  claim: string;
  expected: string;
  observed: string;
  tolerance?: string;
  status: CheckStatus;
  evidence: string;
}
export interface VerificationReport {
  status: "VERIFIED_WITHIN_SCOPE" | "PARTIAL" | "FAILED" | "UNVERIFIED";
  scope: string;
  checks: VerificationCheck[];
}
export interface SolutionStep { title: string; explanation: string; expression?: string }
export interface Solution {
  id: string;
  title: string;
  answer: string;
  steps: SolutionStep[];
  note?: string;
  verification?: VerificationReport;
  provenance?: {
    engine: "deterministic" | "ai";
    engineVersion: string;
    knowledge?: { id: string; revision: number }[];
    provider?: string;
    model?: string;
  };
}
export type SolutionContent = Pick<Solution, "title" | "steps" | "answer" | "note">;
export type SolveResponse =
  | { ok: true; solution: Solution; subject?: Subject; explanationLevel?: ExplanationLevel }
  | { ok: false; code: string; message: string };

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
const text = (value: unknown, maximum = 12000): value is string =>
  typeof value === "string" && value.length <= maximum;
/** Validate unknown model data; never accept model-supplied verification or provenance. */
export function parseSolutionContent(value: unknown): SolutionContent {
  if (!isRecord(value) || !text(value.title, 500) || !value.title.trim() ||
      !text(value.answer) || !value.answer.trim() || !Array.isArray(value.steps) ||
      value.steps.length < 1 || value.steps.length > 60 ||
      (value.note !== undefined && !text(value.note))) {
    throw new Error("Invalid solution structure");
  }
  const steps = value.steps.map((step: unknown) => {
    if (!isRecord(step) || !text(step.title, 500) || !step.title.trim() ||
        !text(step.explanation) || (step.expression !== undefined && !text(step.expression))) {
      throw new Error("Invalid solution step");
    }
    return { title: step.title, explanation: step.explanation,
      ...(step.expression === undefined ? {} : { expression: step.expression }) };
  });
  return { title: value.title, answer: value.answer, steps,
    ...(value.note === undefined ? {} : { note: value.note }) };
}
export function parseVerification(value: unknown): VerificationReport {
  const statuses: VerificationReport["status"][] = ["VERIFIED_WITHIN_SCOPE", "PARTIAL", "FAILED", "UNVERIFIED"];
  const checks: CheckStatus[] = ["PASS", "FAIL", "INCONCLUSIVE", "NOT_APPLICABLE"];
  if (!isRecord(value) || !statuses.includes(value.status as VerificationReport["status"]) ||
      !text(value.scope) || !Array.isArray(value.checks) || value.checks.length > 50) throw new Error("Invalid verification report");
  for (const check of value.checks) {
    if (!isRecord(check) || !checks.includes(check.status as CheckStatus) ||
        !["checkerId", "checkerVersion", "claim", "expected", "observed", "evidence"].every(k => text(check[k])) ||
        (check.tolerance !== undefined && !text(check.tolerance))) throw new Error("Invalid verification check");
  }
  return value as unknown as VerificationReport;
}
/** Checks network data at the browser boundary as well as provider data on the server. */
export function parseSolveResponse(value: unknown): SolveResponse {
  if (!isRecord(value)) throw new Error("Invalid solver response");
  if (value.ok === false && text(value.code, 100) && text(value.message)) {
    return { ok: false, code: value.code, message: value.message };
  }
  if (value.ok !== true || !isRecord(value.solution)) throw new Error("Invalid solver response");
  const content = parseSolutionContent(value.solution);
  // Older deployments did not supply IDs. Keep their response renderable during rollout.
  const id = text(value.solution.id, 200) ? value.solution.id : "legacy-solution";
  const verification = value.solution.verification === undefined ? undefined : parseVerification(value.solution.verification);
  return { ok: true, solution: { id, ...content, ...(verification ? { verification } : {}) } };
}
