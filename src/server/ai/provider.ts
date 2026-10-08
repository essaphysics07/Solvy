import type { SolutionContent } from "../../shared/contracts/solution.ts";
export interface AIRequest {
  task: "solve";
  instructions: string;
  text: string;
  image?: { mimeType: string; data: string };
  signal?: AbortSignal;
}
export interface AIResult {
  content: SolutionContent;
  provider: string;
  model: string;
  usage?: { inputTokens?: number; outputTokens?: number; totalTokens?: number };
}
export interface AIProvider {
  readonly id: string;
  readonly capabilities: { text: boolean; vision: boolean; structuredOutput: boolean; audio: boolean };
  generate(request: AIRequest): Promise<AIResult>;
}
