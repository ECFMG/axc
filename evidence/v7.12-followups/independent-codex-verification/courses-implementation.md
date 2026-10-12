# Course search implementation decisions

## Decision

Use the existing `apps/api` composition root, `@axc/rest` Hono handler and `@axc/application-services` request factory. The REST boundary validates query strings and returns the documented error envelope. The application service filters, orders and paginates immutable fixture records.

`Course` is an application-service read model, following the existing `HealthStatus` pattern. This feature has no entity lifecycle or write invariants requiring a domain aggregate. Keeping the model and fixed fixtures with the read use case avoids an artificial repository, database implementation or new workspace dependency. The domain package remains independent of REST and infrastructure.

No dependency declarations, lockfile, authentication logic, host configuration, production settings or unrelated feature code are changed. The 2026-10-08 validation run used the existing installed dependencies and local test runtimes.

## Limits

- Twelve immutable fixtures are scanned in memory. There is no persistence or mutation API. Replace the fixture source with indexed storage when catalog size or write requirements justify it.
- Sorting is deterministic code-point ordering, not locale-aware collation. Fixed UTC timestamps sort chronologically as strings.
- Keyword search is a substring within each field; it does not rank, stem words, tokenize phrases or perform fuzzy matching.
- The endpoint exposes the fixture catalog using the same anonymous registration convention as health. This task does not introduce an authorization policy for a real private catalog.
- Hono route tests prove the route contract. Host acceptance checks additionally require the repository's existing local Azure Functions tooling.

## Coverage

Application-service tests check fixture validity, uniqueness, immutability, stable ordering and duplicate-match behavior. Hono route tests cover defaults, all three searchable fields and case folding, every modality/status, positive AI tag matching, two filter combinations, all sorts, page boundaries, invalid numbers and enums, duplicate query parameters, exact errors, no matches and the existing health route. Cucumber covers one combined request and the invalid page-size envelope through HTTP.

The 2026-10-08 validation run records command outputs and actual provider token counters in external run artifacts. Its usage record separates the projected estimate from measured Codex cumulative-counter differences and Ollama inference counts. Final-response usage remains pending until the original turn's final counters are recovered. No monetary charge or savings claim is inferred from token counts.

See [validation results](courses-validation.md) for the passing full suite, local Azure-host acceptance scenarios, build, lint, type checks, and architecture checks.
