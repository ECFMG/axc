---
id: 0001-in-memory-course-catalog
title: In-memory course catalog
status: accepted
date: 2026-10-17
---

## Context and Problem Statement

The sample catalog needs deterministic search and tests without external services or production data.

## Considered Options

- A read repository backed by static in-memory fixtures.
- A MongoDB-backed read repository.

## Decision Outcome

Use twelve in-memory fixtures through the Catalog Course read repository. The API composition root injects the persistence factory. Application services consume persistence types and validate search rules; REST parses HTTP query parameters and maps errors to the specified contract. Domain constants define allowed enum values.

## Consequences

Search and acceptance tests need no database. Results are copied on read. The catalog is fixed and process-local; future persistent storage can implement the same read repository interface. Workspace dependency edges connect API to persistence, application services to domain and persistence, persistence to domain, and REST to domain. REST tests also use persistence to verify the assembled behavior. Vitest tooling uses existing catalog dependencies.
