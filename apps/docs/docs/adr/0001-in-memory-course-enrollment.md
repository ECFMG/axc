---
title: In-memory course enrollment
---

# Use an in-memory catalog for courses and enrollment requests

- Status: accepted
- Date: 2026-10-22

## Context

Course search and enrollment requests need shared storage, but this sample has no production database and must run in unit and acceptance tests without external services. `@axc/service-mongoose` is only an extension point for a future Mongoose adapter.

## Decision

`@axc/persistence` keeps courses and enrollment requests in a process-local catalog. `@apps/api` creates that catalog once at startup and places it on `ApiContext`, next to the clock used for timestamps. Domain rules (email, justification length, active courses, duplicate requests, and status transitions) stay in `@axc/domain`. Application services orchestrate those rules. HTTP stays in `@axc/rest`.

The course fixture is twelve courses with mixed modality, status, and tags. Enrollment ids are allocated in memory as `enroll-001`, `enroll-002`, and so on.

## Consequences

- Restarting the API drops enrollment requests. Course fixtures are recreated from the seed.
- One process does not see another process's requests.
- Tests substitute the catalog and clock through `ApiContext`.
- A later durable adapter can implement the same catalog interface without moving domain rules into Mongoose.
