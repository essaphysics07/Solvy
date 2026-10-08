export type ErrorCode = "INVALID_PROBLEM" | "INVALID_IMAGE" | "INVALID_OPTIONS" |
  "INVALID_REQUEST" | "AI_NOT_CONFIGURED" | "AI_AUTH" | "AI_RATE_LIMIT" | "AI_UNAVAILABLE" |
  "AI_INVALID_OUTPUT" | "AI_ERROR" | "SOLVE_TIMEOUT" | "CANCELLED" | "CLARIFICATION_REQUIRED" |
  "UNSUPPORTED" | "VERIFICATION_FAILED";
export class SolvyError extends Error {
  readonly code: ErrorCode;
  readonly httpStatus: number;
  readonly retryable: boolean;
  constructor(code: ErrorCode, message: string, httpStatus = 502, retryable = false) {
    super(message);
    this.name = "SolvyError";
    this.code = code;
    this.httpStatus = httpStatus;
    this.retryable = retryable;
  }
}
export function publicError(error: unknown): SolvyError {
  return error instanceof SolvyError ? error : new SolvyError("AI_ERROR", "The solver could not complete this problem. Please try again.");
}
