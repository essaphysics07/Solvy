import { SolvyError } from "../solving/errors.ts";
export function abortError(signal?: AbortSignal): SolvyError {
  return signal?.reason instanceof SolvyError ? signal.reason :
    new SolvyError("CANCELLED", "The solve request was cancelled.", 499);
}
/** Enforces a deadline even for a transport that does not settle after abort. */
export async function withDeadline<T>(operation: (signal: AbortSignal) => Promise<T>, ms: number, parent?: AbortSignal): Promise<T> {
  const controller = new AbortController();
  const forward = () => controller.abort(abortError(parent));
  if (parent?.aborted) forward();
  else parent?.addEventListener("abort", forward, { once: true });
  const timer = setTimeout(() => controller.abort(new SolvyError("SOLVE_TIMEOUT", "The solver timed out. Please try again.", 504, true)), ms);
  let rejectAbort: (() => void) | undefined;
  try {
    if (controller.signal.aborted) throw abortError(controller.signal);
    const aborted = new Promise<never>((_, reject) => {
      rejectAbort = () => reject(abortError(controller.signal));
      controller.signal.addEventListener("abort", rejectAbort, { once: true });
    });
    return await Promise.race([operation(controller.signal), aborted]);
  } finally {
    clearTimeout(timer);
    parent?.removeEventListener("abort", forward);
    if (rejectAbort) controller.signal.removeEventListener("abort", rejectAbort);
  }
}
export async function backoff(ms: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) throw abortError(signal);
  await new Promise<void>((resolve, reject) => {
    const finish = () => { signal?.removeEventListener("abort", abort); resolve(); };
    const timer = setTimeout(finish, ms);
    const abort = () => { clearTimeout(timer); signal?.removeEventListener("abort", abort); reject(abortError(signal)); };
    signal?.addEventListener("abort", abort, { once: true });
  });
}
