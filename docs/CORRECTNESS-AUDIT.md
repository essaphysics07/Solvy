# Focused mathematical correctness audit — 2026-10-11

## Baseline and isolation

This patch targets the available `Solvy-mathematics-foundation.zip`, SHA-256:

`8d83d96133b31bb2344cc90fb7f85eb57ab4c5c5d84bb03eb793cbb79c043924`

That archive contains the mathematics expansion built from checkpoint `4311a67`; it is **not** the unmodified checkpoint, and no assumption is made that it has been merged anywhere. Work was performed in a new extracted directory, with a fresh `npm ci` and no copied node_modules/build artifacts. Original archives, original working directories, backup repositories and remote repositories were not changed. No commit or push was performed.

## Findings and minimal corrections

1. **Negative-slope verifier allegation was not reproducible in this archive.** Before editing, `solve -2x+3<=7` returned a verified result. Parsing subtracts RHS from LHS; solving produces the reversed relation and bound. The independent verifier already compares the original affine inequality against `(x-bound) result_relation 0`, at `bound-1`, `bound`, and `bound+1`. Once affine structure and the unique zero are established, those checks determine both sides and endpoint inclusion. This logic is retained, rather than replaced with an unnecessary second sign-reversal formula. A real adjacent issue was found: its catch-all relation branch treated any unrecognized operator as `>=`. The verifier now uses an exhaustive operator switch and fails closed on malformed operators. Verification evidence now explicitly describes the inequality checks.

2. **Zero-power domain loss was reproduced.** Before the fix, both `solve x^0=1` and `solve (x-1)^0=1` were understood and marked verified. The parser erased their bases to a constant 1, leaving neither an AST base nor exclusions for verification. Under this solver's real-algebra convention, zero-to-zero is undefined. Because exclusion sets do not exist in the representation, nonconstant polynomial bases raised to zero are now rejected before erasure. Literal/identically zero bases remain rejected. Provably nonzero constant reductions such as `2^0`, `(2-1)^0`, `(x-x+1)^0` remain valid. The bounded base parser already rejects variable denominators; cancellation cannot hide a discarded denominator restriction. Nonconstant everywhere-nonzero bases such as `(x^2+1)^0` are conservatively unsupported too; proving general nonvanishing is outside this patch.

3. **Calculation error classification hid internal failures.** The executor catch previously labeled every exception `UNSUPPORTED`, including programming errors. Expected rational precision-limit failures now have a specific `RationalPrecisionError` type and retain `UNSUPPORTED`/422. Unexpected executor and public-route exceptions produce sanitized `INTERNAL_ERROR`/500. Explicit provider errors retain their existing codes. Mathematically rejected results remain `VERIFICATION_FAILED`/422. Verifier exceptions remain INCONCLUSIVE/PARTIAL and cannot pass the orchestrator's strict success gate. None of these failure paths persists a deterministic solution.

## Regression coverage

Added `tests/correctness-audit.test.ts` with 25 named tests, including parameterized loops:

- All four relations, 288 signed/fractional affine cases, positive/zero/negative constants and right sides.
- Every incorrect alternative operator (direction and endpoint inclusion), and incorrect bounds, rejected.
- 72 constant/cancellation cases, all-real/empty sets, and forged classifications.
- Full orchestration of `-2x + 3 <= 7` to `x >= -2`.
- Malformed result/original operators cannot be silently interpreted as `>=`.
- Zero-power expressions, equations/identities, inequalities, derivatives and integrals cannot erase their domain.
- Valid constant zero powers and positive powers remain supported.
- Old representations containing erased zero-power evidence cannot pass routing.
- Unsupported zero powers use unverified AI fallback; provider-supplied verification is ignored.
- Injected wrong solver bounds produce VERIFICATION_FAILED without saving; precision and internal exceptions have distinct codes; verifier exceptions stay inconclusive.

The existing generated degree-zero polynomial test now uses a constant coefficient instead of `coefficient*x^0`. Its original purpose (degree-zero polynomial differentiation/integration/simplification) and iteration count are preserved. `x^0` is explicitly tested as unsupported in the new tests. No tests were deleted, skipped or disabled.

Runtime smoke checks retain the existing 15 deterministic cases and add three zero-power requests that must reach the missing-provider error, never a verified identity.

## Executed validation

Environment: Node v24.19.0, npm 11.9.0. Baseline: 236/236 tests passed before edits.

| Command | Observed result |
|---|---|
| `npm ci` | Exit 0; 107 packages installed into clean extracted project |
| `npm run typecheck` | Exit 0 |
| `node --conditions=react-server --experimental-strip-types --test tests/correctness-audit.test.ts` | Exit 0; 25 passed, 0 failed/skipped |
| `npm test` | Exit 0; 261 passed, 0 failed/skipped |
| `npm run build` | Exit 0; production compilation, TypeScript and page generation succeeded |
| `npm run test:runtime` | Exit 0; homepage/startup, 15 deterministic requests, zero-power rejection/fallback, validation and clarification passed |

Raw logs are included in the delivery's `validation/` directory. npm emitted existing proxy-config and deprecated-package warnings; these did not fail installation or checks. No dependency versions or lockfile entries were changed. Live Gemini, Supabase and microphone/browser hardware were not exercised; the production smoke script blanks service credentials.

## Changed files and reasons

| Exact project-relative path | Reason |
|---|---|
| `src/server/computation/polynomials.ts` | Reject zero powers unless the base is provably constant and nonzero |
| `src/server/verification/mathematics.ts` | Exhaustive relation validation; accurate inequality-check evidence; retain correct independent truth-set comparison |
| `src/server/computation/rational.ts` | Distinguishable precision-limit exception |
| `src/server/solving/orchestrator.ts` | Separate expected precision failures from unexpected internal calculation failures |
| `src/server/solving/errors.ts` | Sanitized INTERNAL_ERROR/500 public classification |
| `tests/correctness-audit.test.ts` | New focused domain, inequality, fallback and failure-path regressions |
| `tests/mathematics.test.ts` | Correct the generated constant-polynomial fixture without dropping coverage |
| `scripts/runtime-smoke.mjs` | Assert zero powers cannot bypass the deterministic/AI boundary |
| `README.md` | Correct stale two-solver and nonlinear-coverage statements; document domain boundary |
| `docs/KNOWLEDGE.md` | Correct single-bundle description and document zero-power restriction |
| `docs/mathematics-foundation.md` | Add domain limitation and distinguish historical validation from current results |
| `docs/IMPLEMENTATION.md` | Label old solver/test counts as historical and link current audit |
| `docs/ALGEBRA-REPRESENTATION.md` | Label old solver/test counts as historical and link current audit |
| `docs/CORRECTNESS-AUDIT.md` | This audit, reproducible commands and file manifest |

No UI, provider adapter, persistence adapter, API input schema, database, dependencies or original inequality solver algorithm changed.

## Applying the delivery safely

The delivery contains `solvy-correctness.patch`, `files/` with the complete changed files at their project-relative paths, and `validation/` logs. Apply to a **separate working copy containing the mathematics expansion**, not either backup repository:

```sh
git apply --check /absolute/path/to/solvy-correctness.patch
git apply /absolute/path/to/solvy-correctness.patch
npm ci
npm run typecheck
node --conditions=react-server --experimental-strip-types --test tests/correctness-audit.test.ts
npm test
npm run build
npm run test:runtime
```

The check/apply operations do not commit or push. If the check fails, stop and reconcile the differing source; do not force the patch or overwrite newer working files blindly. Alternatively review the complete files against the manifest. The patch was checked and applied to another clean extraction, then byte-compared with the corrected files.

## Remaining scope limits

No representation of excluded real values was added. Unsupported variable-dependent zero powers therefore remain on the unverified provider path, or fail with a missing-provider error when AI is unavailable. No automatic repair/reverification of previously persisted answers is performed. Older verified answers obtained from the faulty zero-power path should not be treated as revalidated by this patch.

Existing coverage remains bounded: one-axis net force; affine equations/inequalities; polynomial algebra, real quadratics and polynomial calculus; small rational matrices/systems; finite sequences, counting/binomial probability and descriptive statistics. This patch does not add general mathematical or physics coverage, or certify AI-generated reasoning.
