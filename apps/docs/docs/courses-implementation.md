# Course search implementation decisions

## Decision

Use the existing `apps/api` composition root, `@axc/rest` Hono handler and `@axc/application-services` request factory. The REST boundary validates query strings and returns the documented error envelope. The application service filters, orders and paginates immutable fixture records.

`Course` is an application-service read model, following the existing `HealthStatus` pattern. This feature has no entity lifecycle or write invariants requiring a domain aggregate. Keeping the model and fixed fixtures with the read use case avoids an artificial repository, database implementation or new workspace dependency. The domain package remains independent of REST and infrastructure.

No dependency declarations, lockfile, authentication logic, host configuration, production settings or unrelated feature code are changed. An existing locked installation was copied for local validation after an offline install reported a missing tarball. No packages were downloaded for this delivery.

## Limits

- Twelve immutable fixtures are scanned in memory. There is no persistence or mutation API. Replace the fixture source with indexed storage when catalog size or write requirements justify it.
- Sorting is deterministic code-point ordering, not locale-aware collation. Fixed UTC timestamps sort chronologically as strings.
- Keyword search is a substring within each field; it does not rank, stem words, tokenize phrases or perform fuzzy matching.
- The endpoint exposes the fixture catalog using the same anonymous registration convention as health. This task does not introduce an authorization policy for a real private catalog.
- Hono route tests prove the route contract. Host acceptance checks additionally require the repository's existing local Azure Functions tooling.

## Coverage

Application-service tests check fixture validity, uniqueness, immutability, stable ordering and duplicate-match behavior. Hono route tests cover defaults, all three searchable fields and case folding, every modality/status, positive AI tag matching, two filter combinations, all sorts, page boundaries, invalid numbers and enums, duplicate query parameters, exact errors, no matches and the existing health route. The independent Task A oracle checks the built Azure Functions endpoint through HTTP. Existing Cucumber health scenarios remain unchanged.

Delivery evidence records specification hashes, starting commit, changed-file scope, command exit statuses, logs, and measured Codex token counters. This delivery reuses the prior local Task A implementation at d6153e2 on its pre-feature base fe47c38, with updated test registration and documentation. No controlled optimization experiment or token savings claim is made. Original task usage, including the final response and reviewer, is complete in usage.json. Publication follow-up usage is excluded.

See [validation results](courses-validation.md) for current checks and their evidence locations.
