# Solvy implementation milestone

## Authoritative-source reconciliation

Work began from the newly supplied `Solvy-main (1).zip`, whose archive comment identifies commit `03133101537427f78ff22877f7513938a1286c63`. The archive has no `.git` directory or remote URL, and no GitHub repository address was available in this session. Live `main` therefore could not be fetched or independently verified. No remote branch was modified or pushed. Reconcile this patch with current `main` before committing it.

Compared with the previous archive:

- KaTeX/react-katex and type packages are present.
- `solution-card.tsx` uses `BlockMath` and imports KaTeX CSS.
- `math-text.tsx` exists, but is not imported by the current solution renderer. It was retained byte-for-byte.
- The frontend abort timer is 120 seconds.
- `solver.ts` throws API error messages for unsuccessful HTTP responses.
- The central API, shared feature types, Supabase save code and Gemini code remained unchanged.

The new baseline passed typecheck and production build before architecture changes.

## Implemented architecture

The API route now handles HTTP input/output and calls a server composition root. Dependencies are interfaces rather than provider SDKs in the orchestrator:

1. Validate multipart inputs and normalize text.
2. Understand a bounded deterministic grammar; retain attached images for the vision path.
3. Retrieve immutable source-backed knowledge by concept.
4. Match a problem pattern and method executor.
5. Calculate with exact bounded rational arithmetic, or call the AI provider for broader problems.
6. Independently verify supported deterministic results.
7. Generate deterministic educational explanations and check result consistency.
8. Return the existing solution fields plus ID, verification and provenance.
9. Save through the persistence repository without making successful solving depend on database availability.

The main public result fields remain `title`, `steps`, `answer`, `note`. Clarification uses the existing error envelope with `CLARIFICATION_REQUIRED` and HTTP 422, which the existing editor now displays accurately. No new navigation or input workflow was introduced.

## Knowledge, solvers and verification

The structured bundle supports taxonomy, concepts, definitions, laws, quantities, variables, units, SI dimensions, conditions, assumptions, executable formulas, display LaTeX, rearrangements, relationships, known/unknown patterns, methods, verification rules, mistakes, examples, sources and version/review metadata.

Only two initial domains are implemented:

- Newton's second law: net force from positive mass and signed one-axis acceleration; kg/g and m/s²/cm/s²; exact integer and decimal inputs; zero acceleration supported. Applied-force or richer contexts are not mislabeled as checked net-force answers.
- Real linear equations: bounded affine expressions on both sides; parentheses; exact fractional/decimal values; unique, none or infinitely many solutions. No division by zero or variable denominators in the deterministic path.

The verifier does not call the solving function to confirm its answer. Newton verification independently recomputes converted input arithmetic and checks unit/dimension/model constraints. Linear verification independently expands polynomials for solution-set classification and evaluates both original sides for unique solutions. The shared rational primitives are used by both, while their algorithms differ.

Every check records an ID, version, claim, expected/observed value, tolerance policy, status and evidence. Reports use scoped verification rather than an unconditional correctness claim. AI fallback answers are explicitly unverified. Computation does not independently certify a natural-language interpretation, image transcription, or physical assumption.

Knowledge remains marked candidate pending human review. Only the explicit immutable code-shipped seed is executable; no runtime AI output can publish or alter it. See KNOWLEDGE.md.

AI explanations for deterministic results were deliberately omitted: templates give an accurate educational explanation without extra latency or allowing model-generated numbers to overwrite a checked result. AI reasoning/explanations remain available for the broader fallback path.

## AI and persistence

`AIProvider` exposes capabilities and a generate contract with text/image input, output content, model/provider identity and usage metadata. Only `GeminiProvider` is implemented. It retains structured JSON, vision, two-attempt retries and primary/fallback models, with bounded deadlines and sanitized errors. The original model defaults are retained and can be overridden by environment variables. All provider responses are runtime-validated, and provider-supplied verification/provenance is discarded.

`SolutionRepository` separates saving from solving. `SupabaseSolutionRepository` preserves the exact original three-column REST payload and serialized solution. No table definitions or policies were guessed, and no migrations were run. See DATABASE.md for manual checks and a future additive migration plan.

Only `server-only` was added as a production dependency; existing dependency versions remained locked. Test execution uses Node's built-in runner. The unused pre-existing OpenAI dependency was retained rather than changed as unrelated cleanup; no OpenAI implementation was added.

## Validation results

Environment: Node.js 24.19.0, npm 11.9.0.

| Check | Result |
|---|---|
| Baseline `npm run typecheck` | Passed |
| Baseline `npm run build` | Passed |
| Final `npm test` | 83 tests passed; zero failures |
| Final `npm run typecheck` | Passed |
| Final `npm run build` | Passed |
| `npm run test:runtime` | Passed: production start, homepage, six deterministic HTTP cases, clarification and validation errors, missing-AI configuration |
| Strict KaTeX rendering | Passed for generated Newton/linear expressions, including fractions, signs and degenerate solution sets |
| Full Playwright browser checks | BLOCKED before page launch: environment denies Chromium's required socket operation; not claimed as passed |
| Live Gemini account call | Not performed; credentials/model availability not supplied |
| Live Supabase row insertion/RLS | Not performed; credentials/schema/policies not supplied |
| Real microphone recognition | Not performed |

Provider tests use an injected transport and cover successful structured image/text calls, retry/fallback, total and attempt timeout, cancellation, malformed responses, authentication failures and bounded quota failures. Persistence tests cover legacy payload compatibility and failure isolation. Solver tests include generated numerical variations as well as individual boundary cases. Verification tests deliberately corrupt answers, units, dimensions, formulas, explanations and solution classifications.

`npm run test:browser` is included for local execution. It exercises the real deterministic API and frontend, plus mock speech recognition and a mock image-provider response. Because Chromium could not launch here, no screenshot or fully interactive browser success is claimed.

## Remaining limitations

- Live `main` must be reconciled using the actual GitHub remote.
- Deterministic language recognition is intentionally narrow; equivalent phrasing outside the grammar uses Gemini. There is no general symbolic algebra system or image-to-deterministic extraction yet.
- There is no standalone audio-upload API; the existing browser transcription flow is retained.
- No additional AI providers, vector database, microservices, large curriculum or question bank were added.
- Seed source/editorial review still needs a human subject expert.
- Gemini-generated reasoning outside supported patterns has no independent mathematics verification.
- Database persistence remains best-effort and may duplicate records on user retries; ownership, idempotency and durable queues require verified database design.
- Authentication, quotas, edge-level request size enforcement and production operations remain deployment work.
- Image signature checks improve validation but are not full image decoding; enforce request limits before multipart buffering in production.

## Manual setup and checks

1. Fetch the actual repository's current `main`. Create a feature branch. Compare the archive baseline commit and apply these changes while preserving any newer work; do not overwrite newer source wholesale.
2. Use Node.js 22.18+ and `npm ci`. Keep `.env.local` private and retain existing Gemini/Supabase values. `.env.example` contains placeholders only.
3. Run `npm test`, `npm run typecheck`, `npm run build`, `npm run test:runtime`.
4. Start the app and test text, image and actual microphone transcription in your browser. Confirm KaTeX and the verification details expand correctly.
5. With your existing Gemini key, try an unsupported deterministic question and an image question. Confirm the configured primary/fallback models exist in your account.
6. Confirm new rows in the existing `solutions` table. Do not change its schema or disable RLS merely to pass a test.
7. Review `git diff` and ensure no `.env.local`, keys, `node_modules`, `.next` or test artifacts are staged.

Suggested commit message:

`feat(solver): add deterministic physics and algebra pipeline with verification`

Suggested commit body:

- Separate validated contracts, Gemini provider and Supabase persistence.
- Add versioned source-backed knowledge and bounded deterministic net-force/linear-equation solvers.
- Independently verify computations and preserve authoritative template explanations.
- Preserve existing inputs and KaTeX; expose scoped verification and safe errors.
- Add solver, provider, persistence, rendering and runtime regression coverage.

No Git commit was created because the upload is not a checkout of a verified remote branch.

## File inventory

The lists below are generated against the newly uploaded baseline; `next-env.d.ts` is automatically regenerated by Next.js during the production build.

Created:

- `.env.example`
- `docs/DATABASE.md`
- `docs/IMPLEMENTATION.md`
- `docs/KNOWLEDGE.md`
- `scripts/browser-smoke.mjs`
- `scripts/runtime-smoke.mjs`
- `src/features/solver/components/verification-status.tsx`
- `src/server/ai/deadline.ts`
- `src/server/ai/gemini-provider.ts`
- `src/server/ai/provider.ts`
- `src/server/computation/expression.ts`
- `src/server/computation/rational.ts`
- `src/server/knowledge/foundation.ts`
- `src/server/knowledge/repository.ts`
- `src/server/knowledge/schema.ts`
- `src/server/persistence/solutions.ts`
- `src/server/solvers/contracts.ts`
- `src/server/solvers/linear.ts`
- `src/server/solvers/newton.ts`
- `src/server/solving/errors.ts`
- `src/server/solving/explain.ts`
- `src/server/solving/input.ts`
- `src/server/solving/orchestrator.ts`
- `src/server/solving/service.ts`
- `src/server/solving/understand.ts`
- `src/server/verification/verify.ts`
- `src/shared/contracts/solution.ts`
- `tests/orchestrator.test.ts`
- `tests/provider.test.ts`
- `tests/rendering.test.ts`
- `tests/solvers.test.ts`

Modified:

- `README.md`
- `next-env.d.ts`
- `package-lock.json`
- `package.json`
- `src/app/api/solve/route.ts`
- `src/app/globals.css`
- `src/features/solver/components/solution-card.tsx`
- `src/features/solver/components/solver-workspace.tsx`
- `src/features/solver/services/solver.ts`
- `src/features/solver/types/index.ts`
- `tsconfig.json`

Preserved byte-for-byte: `math-text.tsx`, `use-voice-input.ts`, `page.tsx`, `layout.tsx`, `brand.tsx`, and `icon.svg`. The workspace and result card received only integration/error/status changes; their layout was retained.
