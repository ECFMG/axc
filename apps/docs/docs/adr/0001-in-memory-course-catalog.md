---
title: ADR 0001 — In-memory course catalog
sidebar_label: ADR 0001 In-memory catalog
---

# Use an in-memory fixture for course catalog search

## Status

Accepted

## Context and Problem Statement

`GET /api/courses` needs a course model and at least 12 courses with mixed modality, status, and tags. The API host does not start a database, and the feature must be testable without external services or production data.

## Decision Drivers

- Follow the existing Cellix layering: domain model, persistence data, application-service query, Hono route, composition in `@apps/api`.
- Keep `@cellix/*` packages unchanged.
- Avoid new dependencies and production configuration changes.
- Make search, filters, pagination, and validation deterministic in unit and acceptance tests.

## Considered Options

- Store courses in MongoDB through `@axc/service-mongoose` and `mongodb-memory-server-core`.
- Keep a fixed in-memory catalog in `@axc/persistence` and search it in `@axc/application-services`.

## Decision Outcome

Chosen option: "Keep a fixed in-memory catalog", because the current host has no database lifecycle and the catalog is a read-only fixture. The course shape lives in `@axc/domain`. `@axc/service-mongoose` remains the extension point for a later database adapter.

## Consequences

- Search results are stable across processes and tests.
- Restarting the API does not change the catalog.
- A future write API or shared database will replace `loadCourseCatalog()` without changing the HTTP contract.
