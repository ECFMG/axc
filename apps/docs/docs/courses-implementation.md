# Course search implementation decisions

## Decision

Use the existing `apps/api` composition root, `@axc/rest` Hono handler and `@axc/application-services` request factory. The REST boundary validates query strings and returns the documented error envelope. The application service filters, orders and paginates immutable fixture records.

`Course` is an application-service read model, following the existing `HealthStatus` pattern. This feature has no entity lifecycle or write invariants requiring a domain aggregate. Keeping the model and fixed fixtures with the read use case avoids an artificial repository, database implementation or new workspace dependency. The domain package remains independent of REST and infrastructure.

The integrated publication preserves the branch's locked dependencies, authentication logic, host configuration, production settings and unrelated features. The course-search implementation adds no dependencies.

## Limits

- Twelve immutable fixtures are scanned in memory. There is no persistence or mutation API. Replace the fixture source with indexed storage when catalog size or write requirements justify it.
- Sorting is deterministic code-point ordering, not locale-aware collation. Fixed UTC timestamps sort chronologically as strings.
- Keyword search is a substring within each field; it does not rank, stem words, tokenize phrases or perform fuzzy matching.
- The endpoint exposes the fixture catalog using the same anonymous registration convention as health. This task does not introduce an authorization policy for a real private catalog.
- Hono route tests prove the route contract. Host acceptance checks additionally require the repository's existing local Azure Functions tooling.

## Coverage

Application-service tests check fixture validity, uniqueness, immutability, stable ordering and duplicate-match behavior. Hono route tests cover defaults, all three searchable fields and case folding, every modality/status, positive AI tag matching, two filter combinations, all sorts, page boundaries, invalid numbers and enums, duplicate query parameters, exact errors, no matches and the existing health route. Cucumber covers one combined request and the invalid page-size envelope through HTTP.

The repository root evaluation record identifies the measured source, recorded original-task usage, estimated cost and validation evidence. The publication also includes the enrollment workflow described in the enrollment requests API documentation. Integration validation runs against the branch's existing locked dependencies; historical source archives and measurements remain separate from publication follow-up work.
