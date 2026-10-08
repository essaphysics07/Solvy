# Algebra problem representation

This change is based on the uploaded source snapshot at archive commit `8be1769ae0d4ab9cdae06073e84361f43f0266a7`. The archive has no Git remote; no remote checkout, commit or push was performed.

## Scope and design

The original 83-test baseline was run successfully before changes. This change introduces no new solver families, dependencies, database changes, provider behavior or UI changes.

The responsibilities are now:

1. `understand.ts` retains input normalization, image handling, subject dispatch and existing physics understanding.
2. `solving/algebra.ts` owns the existing bounded algebra input grammar and representation-building adapter. The input grammar was moved, not expanded.
3. `computation/affine-equation.ts` extracts semantic facts from the existing parsed `Expression` trees using the existing affine reducer. It does not solve the equation.
4. `problem.ts` exposes an optional typed algebra structure on the existing generic representation. `LinearProblem` extends the shared structure, so the representation references the same problem/AST objects rather than creating a second expression tree.
5. The router validates the structure and its evidence against a fresh bounded parse, then checks the existing executable-knowledge allowlist, concept, pattern, formula, method, constraints, quantities, target and verification relationships.
6. `linear.ts` consumes the exact semantic facts, handles a zero coefficient, and isolates the unknown only when division is valid.
7. The unchanged verifier independently expands/substitutes the original ASTs; it does not trust the cached coefficients.

## Representation example

For `2x + 6 = 14`, the algebra structure contains:

```text
relation: =
numberDomain: real
variable: x
original: 2x + 6 = 14
left/right: original Expression trees (shared by reference)
form.kind: affine
form.left: coefficient = "2", constant = "6"
form.right: coefficient = "0", constant = "14"
```

The generic knowledge projection contains:

| Existing quantity ID | Value | Meaning |
|---|---|---|
| coefficient | 2 | Left coefficient minus right coefficient |
| constant | 6 | Left constant |
| rhs | 14 | Right constant |

These values bind the **existing** knowledge formula `A*x + b = c`. In particular, `rhs` in the representation is `c`, not `c-b`. The solver computes `c-b` when it reduces to `A*x = c-b`. For `3x+2=x+8`, the representation gives `A=2, b=2, c=8`, and the solver obtains `2x=6`.

The unknown remains the input symbol (`x`, `y`, etc.). Routing maps it to the existing semantic knowledge target `unknown`; the knowledge schema, formula and pattern are unchanged.

Exact coefficients are canonical rational strings such as `"1/3"`, not JavaScript floats or executable strings. This keeps the representation JSON-safe, including fractional coefficients. The decoder accepts only bounded canonical integer/fraction data. No `eval`, `Function`, or arbitrary expression-string execution is used.

Constraints identify the supported one-real-variable affine grammar. Assumptions and original-equation evidence are retained. Zero coefficients remain representable: `0x=0` and `0x=5` are classified by the solver, not discarded during extraction.

## Boundaries

- The original ASTs remain authoritative for syntax and independent verification.
- The per-side coefficients are derived summaries. Knowledge quantities are a projection of those summaries; there is no separately maintained normalized equation AST.
- Revalidating at the router prevents forged, stale or missing summaries from authorizing deterministic execution. This boundary check uses the existing parser/analyzer; the independent verifier still uses its separate polynomial/substitution algorithms.
- A valid pattern name alone is insufficient. The previous sole-candidate fallback was removed: an invalid proposed pattern must not silently select the only available pattern.
- Existing trusted-bundle identity restrictions remain. A cloned or arbitrary imported bundle does not become executable knowledge.
- Direct internal callers constructing a `LinearProblem` must supply the analyzed equation structure; application callers should use `understand()`.

## Extension path

The `relation`, `numberDomain` and `form.kind` fields make the present semantics explicit. A future family can introduce another structural variant and semantic analyzer with its own knowledge-backed routing predicate. Parsing, semantic extraction, routing and execution remain distinct. This milestone does not implement inequalities, systems, quadratics, calculus, or new physics.

## Files

Created:

- `src/server/computation/affine-equation.ts`
- `src/server/solving/algebra.ts`
- `tests/algebra-representation.test.ts`
- `docs/ALGEBRA-REPRESENTATION.md`

Modified:

- `src/server/solving/problem.ts`
- `src/server/solving/understand.ts`
- `src/server/solving/router.ts`
- `src/server/solvers/contracts.ts`
- `src/server/solvers/linear.ts`

All original tests, knowledge records/schema/repository, verification code, orchestration, provider, persistence, input validation and UI files remain unchanged.

## Validation

- Baseline: 83 tests passed.
- Added: 22 focused tests covering exact two-sided semantics, all requested representative cases, zero coefficients, fraction/decimal precision, source-AST sharing, JSON round trips, existing knowledge bindings, unsupported syntax, invalid division, forged routing facts, untrusted knowledge, unchanged independent verification, and structural comparison independent of key order.
- Final `npm run typecheck`: passed.
- Final `npm test`: 105 tests passed, zero failures (83 original + 22 new).
- Final `npm run build`: passed, including Next.js production compilation and route generation.
- Final byte comparison confirmed exactly five original source files changed; all original tests and unrelated files were preserved.

The intentionally bounded input grammar is unchanged. Live provider/database/browser validation is not part of this internal representation change; the original regression tests continue to cover their application boundaries.
