import "server-only";
import type { Solution, Subject } from "../../shared/contracts/solution.ts";
import { withDeadline } from "../ai/deadline.ts";
export interface SaveSolution { problem: string; subject: Subject; solution: Solution }
export interface SolutionRepository {
  save(record: SaveSolution, signal?: AbortSignal): Promise<"saved" | "skipped" | "failed">;
}
export class SupabaseSolutionRepository implements SolutionRepository {
  private readonly url: string | undefined;
  private readonly key: string | undefined;
  private readonly request: typeof fetch;
  constructor(options: { url?: string; key?: string; request?: typeof fetch } = {}) {
    this.url = options.url ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
    this.key = options.key ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    this.request = options.request ?? fetch;
  }
  async save(record: SaveSolution, signal?: AbortSignal): Promise<"saved" | "skipped" | "failed"> {
    if (!this.url || !this.key) return "skipped";
    try {
      const response = await withDeadline(abortSignal => this.request(`${this.url!.replace(/\/$/, "")}/rest/v1/solutions`, {
        method: "POST", signal: abortSignal,
        // Preserve the existing integration until the live schema and key type can be inspected.
        headers: { apikey: this.key!, Authorization: `Bearer ${this.key}`, "Content-Type": "application/json", Prefer: "return=minimal" },
        body: JSON.stringify({ problem: record.problem, subject: record.subject, solution: JSON.stringify(record.solution) }),
      }), 4000, signal);
      return response.ok ? "saved" : "failed";
    } catch { return "failed"; }
  }
}
