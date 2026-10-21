---
title: Serve course search from an in-memory catalog
sidebar_label: In-memory course catalog
description: Why GET /api/courses reads a fixed fixture instead of a database.
---

# Serve course search from an in-memory catalog

- Status: accepted
- Date: 2026-10-21

## Context and Problem Statement

The sample API needs `GET /api/courses` with keyword search, filters, pagination, and sorting. The catalog must be testable without external services, and the task forbids introducing a real database when the sample already uses fixtures.

## Decision Drivers

- Course search has to work in unit tests and in the local Azure Functions host.
- `@axc/domain` must not depend on Mongoose or on persistence implementations.
- `@axc/service-mongoose` is the infrastructure extension point and is not required for this fixture.
- The fixture needs a stable mix of modality, status, and tags so filters are observable.

## Considered Options

1. Store courses in MongoDB through `@axc/service-mongoose`.
2. Keep a fixed 13-course fixture in `@axc/persistence` and search it in memory.

## Decision Outcome

Chosen option 2. `@axc/persistence` exports `readCourseCatalog()`. `@axc/application-services` filters that snapshot. `@axc/rest` maps `GET /api/courses` onto the use case, and `@apps/api` registers the Azure Functions route.

The fixture is copied on read so a caller cannot change later search results. Invalid query parameters stay in the application service and return `400` with `INVALID_QUERY_PARAMETER`.

## Consequences

- Search does not survive a process restart, and every process serves the same 13 courses.
- Adding a real database later means replacing `readCourseCatalog()` without changing the HTTP contract.
- `@axc/service-mongoose` stays available and is not wired into this feature.
