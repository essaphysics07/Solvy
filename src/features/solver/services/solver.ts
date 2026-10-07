import type { ProblemRequest, SolveResponse } from "../types";

/** Browser transport only. Provider credentials and orchestration belong on the server. */
export async function solveProblem(
  request: ProblemRequest,
  signal?: AbortSignal,
): Promise<SolveResponse> {
  const data = new FormData();
  data.set("problem", request.problem);
  data.set("subject", request.subject);
  data.set("explanationLevel", request.explanationLevel);

  if (request.image) {
    data.set("image", request.image);
  }

  const response = await fetch("/api/solve", {
    method: "POST",
    body: data,
    signal,
  });

  const result = (await response.json()) as SolveResponse;

  if (!response.ok) {
    throw new Error(
      "message" in result
        ? result.message
        : "The request could not be completed. Please try again.",
    );
  }

  return result;
}