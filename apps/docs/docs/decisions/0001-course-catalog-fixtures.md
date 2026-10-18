---
id: 0001-course-catalog-fixtures
---

# Use in-memory course fixtures

## Status

Accepted.

## Context

The sample catalog must support repeatable search tests without production data or external services.

## Decision

Use twelve deterministic fixtures behind the readonly Catalog.Course repository, injected through the API composition root. Application services validate queries; REST maps validation errors to the public contract. Filter, sort, then paginate. Copy records and tags on reads to protect fixtures.

## Consequences

No database setup or network access is required. Data does not persist user changes and this endpoint has no write operations. A database repository can later implement the same read contract.
