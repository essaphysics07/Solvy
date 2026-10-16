# Mathematics foundation implementation

## Source and inspection

Implemented against the supplied `Solvy-main 3.zip`, whose archive comment identifies commit `4311a671eebd814728106660028439533964ba1d`. The available source is an archive, not a Git checkout with a configured remote. No commit, push, remote update, or database change was performed.

Inspected the computation/affine representation, understanding, router, orchestrator, knowledge schema/foundation/repository, solver contracts, independent verifier, provider and persistence boundaries, API/input contracts, frontend solution rendering, package scripts, tests, and production smoke checks. The initial unmodified suite passed **105/105** tests.

## What changed and why

The existing pipeline remains: input -> understanding -> semantic representation -> code-shipped knowledge -> pattern/formula/method -> deterministic computation -> independent verification -> deterministic explanation -> existing solution contract -> persistence.

- Existing affine and Newton parsers, calculation behavior, independent checks and public API remain compatible. `understand()` retains its original bounded contract. When it returns unsupported for text mathematics, orchestration also consults `understandMathematics()`. Images never take that text-only path.
- New mathematical families share the existing `UnderstoodProblem`, `ProblemRepresentation`, router, executor registry, verifier, explanation dispatcher and persistence pipeline. They are not a second application or independent knowledge store.
- The polynomial parser compiles bounded integer powers into the existing arithmetic `Expression` AST. Exact rational coefficient arrays are derived semantic data; original trees remain available to independent checks. Input parsing, semantic extraction, computation and verification have separate modules.
- Matrix and finite-data representations retain canonical rational strings and explicit semantic parameters. No BigInt objects leak into JSON representations. Numeric JSON syntax is checked before parsing: quote decimal/fraction entries, e.g. `mean ["0.1", "1/3"]`, to avoid silent JavaScript number rounding. Unquoted safe integers are accepted.
- The application composition root explicitly enables the `mathematics` catalog. `new BundledKnowledgeRepository()` intentionally retains the original two-concept foundation profile for existing integrations and provider-fallback regression tests; use `new BundledKnowledgeRepository("mathematics")` for the full shipped catalog.
- Formula records support typed algorithm signatures as well as scalar arithmetic ASTs. A matrix or derivative algorithm is not falsely encoded as a scalar LaTeX formula. Pattern/formula/concept/method/input-family bindings are validated. The router reparses evidence and rejects changed summaries, constraints, semantics, or operation labels.
- Lookup uses an indexed concept map. `context()` traverses package-local prerequisites and relationships to retrieve concepts, formulas and conditions, patterns, methods, and verification rules. Packages remain small and eagerly loaded; large-corpus lazy loading and cross-package reference resolution are not implemented.
- New result variants explicitly classify root sets, interval sets, extrema, singularity, and linear-system affine solution sets. Educational text cannot change calculated values. The current simple/step-by-step/deep-dive presentation still works; concept metadata also records school/college/exam/advanced applicability, difficulty, pitfalls and limitations. A separate competitive-exam UI/projection is not implemented.

No frontend, KaTeX, voice, provider, persistence, API request/response, package dependency, or database schema changes were needed. The only Newton code change narrows the newly extended formula union before evaluating its existing arithmetic AST.

## Implemented coverage

All rows describe bounded deterministic capability, not complete coverage of the domain.

| Area | Working capabilities | Example input |
|---|---|---|
| Foundations | Exact rational arithmetic, decimal arithmetic, nonnegative integer powers, numeric percentages | `calculate 0.1+0.2`; `calculate 15% of 200` |
| Polynomial algebra | Expansion and collection of like powers | `expand (x+1)^2` |
| Equations | Existing affine solver; real roots of degree <=2 including degeneracy, rational roots and exact unsimplified radicals | `solve x^2-5x+6=0`; `solve x^2=2` |
| Inequalities | One real affine inequality; strict/non-strict half-lines, empty/all-real classifications | `solve -2x+3 <= 7` |
| Functions | Global quadratic extrema over the unrestricted real line; constant and unbounded cases | `find the maximum of x² - 4x + 3` correctly reports no maximum |
| Calculus | Polynomial differentiation, antiderivatives with C, signed definite integrals | `differentiate x^3`; `integrate x^2 from 0 to 3` |
| Linear algebra | Exact determinant, inverse, rank | `inverse [[1,2],[3,4]]` |
| Simultaneous equations | Augmented rational matrix input; unique, inconsistent and infinite solution sets with a complete nullspace basis | `solve linear system [[2,1,5],[1,-1,1]]` |
| Sequences | Finite arithmetic/geometric sums, including empty sums and ratio 1 | `arithmetic sum a=2, d=3, n=5`; `geometric sum a=2, r=1/2, n=3` |
| Counting | Combinations and permutations without replacement | `combinations n=5, k=2` |
| Probability | Explicit binomial mass and inclusive upper tails | `binomial at least n=3, k=2, p=1/2` |
| Statistics | Mean, population variance, sample variance, exact decimal data | `sample variance [1,2,3]` |

Resource bounds: mathematics request 1,000 characters; polynomial expression 400 characters, 100 tokens, depth 24, 400 allocated / 800 expanded AST nodes, syntactic degree <=12. Equations/extrema require reduced degree <=2; inequalities reduced degree <=1. Indefinite integration can produce degree 13. Matrices are at most 5x5, augmented systems at most 5x6. Samples contain 1–100 values (sample variance requires >=2). Finite sequence counts and counting n <=100; binomial n <=50. Existing rational precision limits still apply; large intermediate values fail safely rather than being approximated or marked verified.

Zero powers of nonconstant polynomial bases are conservatively rejected, including `x^0` and `(x-1)^0`; `0^0` is also rejected. A provably nonzero constant base such as `(x-x+1)^0` remains valid. No exclusion-set representation is implemented.

No variable denominators, arbitrary functions, chained/negative/fractional powers, multidimensional polynomial parsing, implicit constraints, or arbitrary executable input are accepted by these new parsers. Complex roots are not returned; negative quadratic discriminants are explicitly **no real solution**. General unsupported/ambiguous inputs retain the unverified provider path. Resource exhaustion after deterministic routing produces the existing safe unsupported/verification error, not an unchecked answer.

## Knowledge and trust

**Six new modular packages: 20 concepts, 22 formula/algorithm signatures, 22 patterns, 22 methods, 44 verification rules, 22 executable examples, and six package source records.** These are in addition to the existing two-concept foundation. The packages are polynomial algebra, polynomial calculus, rational linear algebra, descriptive statistics, finite sequences, and counting/binomial probability.

Records carry taxonomy, definitions, display formulas, typed executable semantics, conditions, assumptions, relationships/prerequisites, methods, verification, pitfalls, examples, educational metadata, source attribution, revision and review state. Sources point to OpenStax sections; mathematical descriptions were written for the implementation rather than copied as a curriculum corpus. Some rules (such as exact-minor rank checks) are standard implementation mathematics rather than content copied from the cited introductory section.

New packages deliberately remain **candidate**, generated-by metadata retained, confidence unset, automated validation passed, human subject review pending. They are explicit, immutable, tested code-shipped seeds, using the existing allowlisted identity trust model. A cloned bundle—even one marked passed/published—cannot authorize execution. Passing a schema check does not establish mathematical truth.

`assessKnowledgeCandidate()` validates shape, resource bounds, references, algorithm bindings, source coverage and checker links; clones the input; records a content digest; and leaves mathematical review inconclusive and publication eligibility false. It never mutates trusted records or registers/publishes a candidate. A release/review workflow, automatic source ingestion and automatic test generation from arbitrary candidate content remain future work. All 22 shipped examples are executed and compared with their recorded answers by the test suite.

## Independent verification

- Arithmetic evaluates the original AST rather than trusting reduced coefficients.
- Polynomial identities use enough distinct exact rational points to establish equality under a proven degree bound; these are not probabilistic floating-point spot checks.
- Differentiation uses a separate original-AST product/quotient-rule oracle, not the solver's coefficient derivative routine.
- Antiderivatives are independently differentiated; the integration constant is required.
- Definite integrals are recomputed through exact Lagrange interpolation and basis integration, not the solver's antiderivative implementation.
- Quadratic checks reconstruct original-expression coefficients, establish any higher-degree cancellation by identity checks, classify the discriminant, and check substitution/root counts or exact Vieta identities for symbolic radicals.
- Affine inequalities check the unique boundary, each side and endpoint inclusion. Degenerate constant relations are classified without division.
- Extrema check original values, derivative zero, curvature and global domain.
- Determinants use independent cofactor expansion; rank uses minors. Inverses check both multiplication orders. Linear systems check independent original/augmented rank, residuals, nullspace independence and dimension, covering completeness as well as individual solutions.
- Sequence formulas are checked by enumeration. Combination formulas use Pascal recursion as their oracle. Binomial formulas use independent Bernoulli convolution. Variance uses raw second moments as an alternative to centered moments.
- Every explanation field is checked against the deterministic authoritative result. No provider is asked to rewrite verified calculations.

## Historical milestone validation

These results describe the mathematics expansion before the subsequent [correctness audit](CORRECTNESS-AUDIT.md). The current corrected suite has 261 tests; the audit records executed checks and changed files.

- `npm run typecheck`: PASS.
- `npm test`: **236/236 PASS** (original 105 retained, 131 new named tests; generated parameter loops run within several named tests).
- `npm run build`: PASS.
- `npm run test:runtime`: PASS: production startup/homepage, 15 deterministic POST cases, malformed input, clarification, option validation and missing-provider fallback.
- New mathematical expressions also pass strict KaTeX rendering checks.
- Generated tests cover roots, derivative/integral identities, matrices, inequalities, sequence/counting/statistics variations; tampering, cloned knowledge, malformed candidates, unsupported domains, limits, and precision-sensitive inputs are covered.
- The original runtime fallback probe `Differentiate x^3` is now supported. Its HTTP smoke assertion was upgraded to a verified derivative case; the missing-provider probe now uses the genuinely unsupported `integrate x^2 sin x`. No original unit tests were removed or weakened.
- UI source, image handling, voice/transcription flow, Gemini adapter and Supabase adapter remain unchanged. No live provider/database calls or new manual-browser validation were performed. Production HTTP and strict rendering checks are not a claim of live service validation.

## Explicitly unsupported/planned

The machine-readable `coverage.ts` records partial or unsupported status. General trigonometry, Euclidean/coordinate geometry, vector operations, complex-number computation, transcendental calculus (including `integrate x² sin x`), eigenvalues/eigenvectors, general function analysis, multivariable calculus, differential equations, numerical methods, analysis, abstract algebra, PDEs, Fourier analysis and tensors have no new deterministic implementation. Images and broader word problems still require AI; AI output is not promoted to verified knowledge. This is not universal mathematics.

## Applying and extending

Apply these source changes to a branch based on checkpoint `4311a67`, preserving your deployment environment. Run `npm ci`, typecheck, tests, build and runtime smoke checks. No new environment variables, runtime dependencies or database migrations are required. Human content review is still needed before publishing the candidate knowledge as editorially trusted.

Recommended next Physics milestone: reuse exact linear systems for bounded one-axis force-balance problems, but first add explicit free-body representations, signed force directions, known/unknown quantities and unit/dimension checks. Preserve the distinction between net force and applied forces. Add independent residual and dimensional verification before enabling broader natural-language routing.

Suggested commit after review: `feat: extend knowledge-backed exact mathematics and verification`. No commit or push has been made.

## File manifest

Created (21):

- `docs/mathematics-foundation.md`
- `src/server/computation/finite-data.ts`
- `src/server/computation/matrices.ts`
- `src/server/computation/polynomials.ts`
- `src/server/knowledge/ingestion.ts`
- `src/server/knowledge/mathematics/algebra.ts`
- `src/server/knowledge/mathematics/calculus.ts`
- `src/server/knowledge/mathematics/coverage.ts`
- `src/server/knowledge/mathematics/finite-data.ts`
- `src/server/knowledge/mathematics/linear-algebra.ts`
- `src/server/knowledge/mathematics/package.ts`
- `src/server/solvers/finite-data.ts`
- `src/server/solvers/mathematics-contracts.ts`
- `src/server/solvers/mathematics.ts`
- `src/server/solving/finite-data.ts`
- `src/server/solving/mathematics-explanation.ts`
- `src/server/solving/mathematics.ts`
- `src/server/solving/numeric-data.ts`
- `src/server/verification/finite-data.ts`
- `src/server/verification/mathematics.ts`
- `tests/mathematics.test.ts`

Modified (12):

- `scripts/runtime-smoke.mjs`
- `src/server/knowledge/repository.ts`
- `src/server/knowledge/schema.ts`
- `src/server/solvers/contracts.ts`
- `src/server/solvers/newton.ts`
- `src/server/solving/explain.ts`
- `src/server/solving/orchestrator.ts`
- `src/server/solving/problem.ts`
- `src/server/solving/router.ts`
- `src/server/solving/service.ts`
- `src/server/solving/understand.ts`
- `src/server/verification/verify.ts`
