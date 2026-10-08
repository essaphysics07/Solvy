# Supabase compatibility and future migration

No live database connection, table definition, key type or RLS policy was supplied. This milestone therefore makes **no schema or policy changes**.

`SupabaseSolutionRepository` retains the existing REST write:

- POST `<NEXT_PUBLIC_SUPABASE_URL>/rest/v1/solutions`
- Existing `apikey` and bearer headers using the configured key.
- Columns: `problem`, `subject`, `solution`.
- `solution` remains a JSON-stringified string; this does not assume the actual database column is JSONB.
- `Prefer: return=minimal` remains unchanged.

New solution metadata is inside that serialized solution. A client-generated solution ID is for tracing; it is not claimed to be the database primary key. Missing configuration skips storage. Failed or slow writes do not destroy the solution; the save has a four-second deadline and logs only a sanitized failure marker.

The key variable's name does not prove whether its value is a publishable key or a legacy anon JWT. Confirm the existing accepted credentials and policies locally. Do not place service-role credentials into a `NEXT_PUBLIC_*` variable.

## Manual validation

1. Retain the existing `.env.local` values.
2. Submit a deterministic equation, then an AI/image problem with your configured Gemini account.
3. Confirm the corresponding `solutions` rows contain the expected problem, subject and serialized solution.
4. Verify access policies do not allow users to read or modify other users' records.
5. If a write fails, inspect its server status and configuration without exposing keys. Do not disable RLS to force a successful test.

## Future additive migration plan (not executed)

1. Export and inspect current table DDL, grants, indexes and policies.
2. Add new versioned knowledge tables alongside `solutions`; do not drop or rewrite it.
3. Add solve-run and verification tables only when ownership and retention requirements are established.
4. Backfill to new fields/tables idempotently while retaining the legacy payload.
5. Dual-read or dual-write through repository adapters during a bounded migration window.
6. Validate row counts, access isolation, provenance and rollback before switching reads.
7. Roll back application adapter selection first; remove only newly introduced objects after confirming they have no required data.

No migration SQL is invented without the actual schema. Current saves are best-effort, not a durable queue; retries can still create duplicate database records. Durable idempotency and ownership need verified database support.
