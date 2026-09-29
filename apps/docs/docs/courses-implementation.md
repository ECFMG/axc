# Course search implementation decisions

## Decision

Use the existing `apps/api` composition root, `@axc/rest` Hono handler and `@axc/application-services` request factory. The REST boundary validates query strings and returns the documented error envelope. The application service filters, orders and paginates immutable fixture records.

`Course` is an application-service read model, following the existing `HealthStatus` pattern. This feature has no entity lifecycle or write invariants requiring a domain aggregate. Keeping the model and fixed fixtures with the read use case avoids an artificial repository, database implementation or new workspace dependency. The domain package remains independent of REST and infrastructure.

No dependency declarations, lockfile, authentication logic, host configuration, production settings or unrelated feature code are changed. Existing locked dependencies were downloaded with the user's explicit permission after the offline cache proved empty; this is test setup, not a new application integration.

## Limits

- Twelve immutable fixtures are scanned in memory. There is no persistence or mutation API. Replace the fixture source with indexed storage when catalog size or write requirements justify it.
- Sorting is deterministic code-point ordering, not locale-aware collation. Fixed UTC timestamps sort chronologically as strings.
- Keyword search is a substring within each field; it does not rank, stem words, tokenize phrases or perform fuzzy matching.
- The endpoint exposes the fixture catalog using the same anonymous registration convention as health. This task does not introduce an authorization policy for a real private catalog.
- Hono route tests prove the route contract. Host acceptance checks additionally require the repository's existing local Azure Functions tooling.

## Coverage

Application-service tests check fixture validity, uniqueness, immutability, stable ordering and duplicate-match behavior. Hono route tests cover defaults, all three searchable fields and case folding, every modality/status, positive AI tag matching, two filter combinations, all sorts, page boundaries, invalid numbers and enums, duplicate query parameters, exact errors, no matches and the existing health route. Cucumber covers one combined request and the invalid page-size envelope through HTTP.

The harness records the task/specification hashes, starting commit, changed-file scope, command exit statuses and logs. The current implementation is an externally recorded Codex development run, not an autonomous paired optimization experiment. Model token usage and cost are unavailable for this session; no savings claim is made.

See [validation results](courses-validation.md) for passed checks and the remaining full-suite blockers.
