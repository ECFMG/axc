---
id: 0001-catalog-fixtures
---

# Catalog fixture storage

Status: Accepted

## Context

The sample catalog must be testable without external services or production data. This endpoint only reads courses.

## Decision

Use twelve deterministic in-memory course records behind the catalog read repository, injected by the API composition root. Keep filtering, sorting, and pagination in the repository. Return copies of records and tags to protect fixture state.

## Consequences

Local and acceptance runs see identical data without MongoDB setup. Changes require editing fixtures; this sample has no durable catalog writes. A database-backed repository can implement the same read interface later.
