import { NextResponse } from "next/server";
import { readInput } from "../../../server/solving/input.ts";
import { solveProblem } from "../../../server/solving/service.ts";
import { publicError } from "../../../server/solving/errors.ts";
import { withDeadline } from "../../../server/ai/deadline.ts";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const result = await withDeadline(async signal => {
      const input = await readInput(request);
      const solution = await solveProblem(input, signal);
      return { ok: true as const, solution, subject: input.subject, explanationLevel: input.explanationLevel };
    }, 110000, request.signal);
    return NextResponse.json(result);
  } catch (error) {
    const safe = publicError(error);
    console.warn("solvy.solve.failed", { code: safe.code });
    return NextResponse.json({ ok: false, code: safe.code, message: safe.message }, { status: safe.httpStatus });
  }
}
