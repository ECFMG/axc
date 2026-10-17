# Catalog storage

## Status

Accepted.

## Context

The sample needs a catalog that can be searched and tested without production data or external services. The repository uses CellixJS layers and provides Mongoose seedwork. Filtering, counting, sorting and pagination must run in MongoDB.

## Decision

Use a read-only course entity and a Mongoose model, exposed through a required typed repository dependency. Register the Mongoose lifecycle service in the API composition root. Without a configured MongoDB URI, start MongoDB 7.0.14 locally and upsert 12 deterministic sample courses before accepting requests. With a URI, connect without seeding. Keep HTTP parsing and error mapping in REST.

Escape search text before constructing regexes. Match keywords as substrings and tags as whole tags. Build filters field by field, sort ascending with a unique course ID tie breaker, and count the complete matching set independently of the requested page.

## Consequences

Queries exercise real MongoDB in both local use and repository tests. A cached MongoDB binary or a first-use download is required. Local data is ephemeral. Literal regex search is adequate for this small sample but can scan a large catalog; a future production search index would require a separate decision. Concurrent writes can change counts between the count and list queries; this read-only sample does not require snapshot transactions.

Existing workspace packages and catalog versions are declared as direct dependencies where used. Vitest, vitest-cucumber and the in-memory MongoDB test utility are already present in the workspace; no new package version is introduced.
