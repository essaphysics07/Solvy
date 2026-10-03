export type Subject = "mathematics" | "physics";
export type ExplanationLevel = "simple" | "step-by-step" | "deep-dive";
export type InputMode = "text" | "image" | "voice";
export interface ProblemRequest {
  problem: string;
  subject: Subject;
  explanationLevel: ExplanationLevel;
  image?: File;
}
export interface SolutionStep {
  title: string;
  explanation: string;
  expression?: string;
}
export interface Solution {
  id: string;
  title: string;
  answer: string;
  steps: SolutionStep[];
  note?: string;
}
export type SolveResponse =
  | { ok: true; solution: Solution }
  | { ok: false; code: string; message: string };
