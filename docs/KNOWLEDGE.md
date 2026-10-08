# Knowledge foundation

The first knowledge bundle is `src/server/knowledge/foundation.ts`. It is typed as `KnowledgeBundle` and runtime-validated by `validateKnowledge()` before being deeply frozen for retrieval.

## Supported records

- Taxonomy: domain, subject, branch, topic, with stable IDs and parent links.
- Concepts: definitions, laws, prerequisites and related references.
- Quantities and variables: semantic IDs, symbols, domain restrictions and scalar/component interpretation.
- Dimensions: seven SI exponents ordered mass, length, time, current, temperature, amount, luminous intensity.
- Units: aliases, scale and offset. The initial force solver permits zero-offset conversions only.
- Formulas: display LaTeX, executable expression tree, quantity bindings, assumptions, conditions and conditional rearrangements.
- Relationships, known/unknown problem patterns, method executor IDs, verification-rule references, common mistakes and examples.
- Sources: title, HTTPS URL, exact section locator, access date, supported record IDs.
- Metadata: schema version, revision, publication/validation states, author/generated-by provenance, timestamps and review/confidence meaning.

The validator checks shapes, enum values, expression operators, references, IDs, taxonomy cycles, dimension vectors and conversion fields. It is an ingestion foundation, not a general theorem prover or automated editorial reviewer.

## Display versus execution

`F_net = ma` is displayed as LaTeX but executed from a bounded AST containing multiplication and semantic variables `m` and `a`. The evaluator permits only literals, variables, unary negation and four arithmetic operators. It never uses `eval`, `Function`, shell execution, or generated programs.

Linear equations are parsed into the same AST family and solved by an explicit affine algorithm. The verifier independently expands polynomials for classification and substitutes into the original AST for unique solutions.

## Publication and review

These initial records are source-grounded candidates, not claimed to be human-reviewed. Automated tests check the bundled methods and numerical examples. `validation: passed` is distinct from editorial publication. The records retain `generatedBy: Codex`, a review description indicating that human review is pending, and no fabricated confidence score.

The executable repository returns only the deeply frozen code-shipped bundle. A separate object with the same ID/revision is not enough to make an imported candidate executable. There is no runtime ingestion or automatic AI publishing endpoint.

To extend coverage:

1. Add a source-backed candidate with a new stable identity/revision and validate all references.
2. Implement a bounded method and an independent verifier.
3. Add positive, negative, boundary, metamorphic and routing tests.
4. Have a subject reviewer review definitions, units, assumptions and examples; record that real review without inventing metadata.
5. Explicitly update the released bundle and executor registry in a reviewed code change.
6. Pin the new release revision in persisted solution provenance.

A future database-backed repository can implement `KnowledgeRepository`; retain immutable releases and an explicit promotion workflow. Full-text/vector search and a large curriculum are not required for the two initial families.

## Source grounding

The authored concise definitions and method conditions were cross-checked against:

- OpenStax, University Physics Volume 1, §5.3, Newton's Second Law: https://openstax.org/books/university-physics-volume-1/pages/5-3-newtons-second-law
- OpenStax, Elementary Algebra 2e, §2.3, Solve Equations with Variables and Constants on Both Sides: https://openstax.org/books/elementary-algebra-2e/pages/2-3-solve-equations-with-variables-and-constants-on-both-sides

Only source references and short original summaries are bundled, not copied textbook chapters. Verification scope remains conditional on the parsed problem and stated assumptions.
