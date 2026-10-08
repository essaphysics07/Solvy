import "server-only";
import { GoogleGenAI, type GenerateContentParameters } from "@google/genai";
import { isRecord, parseSolutionContent } from "../../shared/contracts/solution.ts";
import { SolvyError } from "../solving/errors.ts";
import { withDeadline, backoff } from "./deadline.ts";
import type { AIProvider, AIRequest, AIResult } from "./provider.ts";
const solutionSchema = {
  type: "object", properties: {
    title: { type: "string" }, answer: { type: "string" }, note: { type: "string" },
    steps: { type: "array", items: { type: "object", properties: {
      title: { type: "string" }, explanation: { type: "string" }, expression: { type: "string" },
    }, required: ["title", "explanation", "expression"] } },
  }, required: ["title", "steps", "answer", "note"],
};
export interface GeminiTransportResult {
  text?: string;
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; totalTokenCount?: number };
}
export type GeminiTransport = (request: GenerateContentParameters) => Promise<GeminiTransportResult>;
export function normalizeGeminiError(error: unknown): SolvyError {
  if (error instanceof SolvyError) return error;
  const status = isRecord(error) && typeof error.status === "number" ? error.status : undefined;
  if (status === 401 || status === 403) return new SolvyError("AI_AUTH", "The AI provider credentials or permissions need attention.");
  if (status === 429) return new SolvyError("AI_RATE_LIMIT", "The AI provider is busy. Please try again shortly.", 503, true);
  if (status === 408 || status === 504) return new SolvyError("SOLVE_TIMEOUT", "The AI provider timed out. Please try again.", 504, true);
  if (status !== undefined && status >= 500) return new SolvyError("AI_UNAVAILABLE", "The AI provider is temporarily unavailable.", 503, true);
  return new SolvyError("AI_ERROR", "The AI provider could not complete this problem. Check its configuration or try again.");
}
interface Options {
  apiKey?: string;
  models?: string[];
  transport?: GeminiTransport;
  attemptTimeoutMs?: number;
  totalTimeoutMs?: number;
  retryDelayMs?: number;
}
export class GeminiProvider implements AIProvider {
  readonly id = "gemini";
  readonly capabilities = { text: true, vision: true, structuredOutput: true, audio: false };
  private readonly options: Options;
  constructor(options: Options = {}) { this.options = options; }
  async generate(request: AIRequest): Promise<AIResult> {
    const key = this.options.apiKey ?? process.env.GEMINI_API_KEY;
    if (!key && !this.options.transport) throw new SolvyError("AI_NOT_CONFIGURED", "AI solving is not configured. Supported linear equations and net-force problems still work.", 503);
    const client = this.options.transport ? undefined : new GoogleGenAI({ apiKey: key! });
    const transport = this.options.transport ?? ((parameters) => client!.models.generateContent(parameters));
    const models = this.options.models ?? [process.env.GEMINI_MODEL || "gemini-3.8-flash", process.env.GEMINI_FALLBACK_MODEL || "gemini-3.7-flash"];
    return withDeadline(async (totalSignal) => {
      let lastError: SolvyError = new SolvyError("AI_ERROR", "No AI model is configured.");
      for (const model of [...new Set(models)].filter(Boolean)) {
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            const response = await withDeadline(signal => transport({
              model,
              contents: [{ role: "user", parts: [
                { text: request.text },
                ...(request.image ? [{ inlineData: request.image }] : []),
              ] }],
              config: { systemInstruction: request.instructions, responseMimeType: "application/json",
                responseSchema: solutionSchema, abortSignal: signal,
                httpOptions: { timeout: this.options.attemptTimeoutMs ?? 35000, retryOptions: { attempts: 1 } } },
            }), this.options.attemptTimeoutMs ?? 35000, totalSignal);
            let content;
            try {
              if (!response.text || response.text.length > 200000) throw new Error("Invalid output size");
              content = parseSolutionContent(JSON.parse(response.text));
            } catch { throw new SolvyError("AI_INVALID_OUTPUT", "The AI returned an invalid solution. Please try again."); }
            const usage = response.usageMetadata;
            return { content, provider: this.id, model,
              ...(usage ? { usage: { inputTokens: usage.promptTokenCount, outputTokens: usage.candidatesTokenCount, totalTokens: usage.totalTokenCount } } : {}) };
          } catch (error) {
            lastError = normalizeGeminiError(error);
            if (totalSignal.aborted || !lastError.retryable) throw lastError;
            if (attempt === 0) await backoff(this.options.retryDelayMs ?? 750 + Math.random() * 250, totalSignal);
          }
        }
      }
      throw lastError;
    }, this.options.totalTimeoutMs ?? 100000, request.signal);
  }
}
