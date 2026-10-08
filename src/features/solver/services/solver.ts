import { parseSolveResponse } from "../../../shared/contracts/solution.ts";
import type { ProblemRequest, SolveResponse } from "../types";
/** Browser transport only. Provider credentials and orchestration belong on the server. */
export async function solveProblem(request: ProblemRequest, signal?: AbortSignal): Promise<SolveResponse> {
  const data = new FormData();
  data.set("problem", request.problem);
  data.set("subject", request.subject);
  data.set("explanationLevel", request.explanationLevel);
  if (request.image) data.set("image", request.image);
  const response = await fetch("/api/solve", { method: "POST", body: data, signal });
  let result: SolveResponse;
  try { result = parseSolveResponse(await response.json()); }
  catch { throw new Error("The server returned an unreadable solution. Please try again."); }
  if (!response.ok) throw new Error(!result.ok ? result.message : "The request could not be completed. Please try again.");
  return result;
}
