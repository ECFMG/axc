# Keep the course catalog in memory

## Status

Accepted. 2026-10-09.

## Context and problem statement

`GET /api/courses` needs a course model, at least 12 seeded courses, and search that tests can run without production data or an external service. The API host currently starts Azure Functions with no database.

## Decision drivers

- The catalog must be available in unit tests and in the Serenity acceptance host.
- Domain code must not import Mongoose, REST, or persistence implementations.
- The composition root stays in `@apps/api`.
- No new external service, secret, or production setting.

## Considered options

1. In-memory seed behind a domain catalog port.
2. Mongoose model in `@axc/service-mongoose`, backed by `mongodb-memory-server` at startup.

## Decision outcome

Option 1. `@axc/domain` defines `Course` and `CourseCatalog`. `@axc/persistence` stores the seed and returns copies. `@axc/application-services` parses the query, filters, sorts, and pages. `@axc/rest` maps a failed parse to HTTP 400. `@apps/api` injects `createSeedCourseCatalog()`.

Option 2 stays available for a later durable catalog. It is a poor fit for this endpoint because the Functions host has no Mongo lifecycle and the feature must not add external services.

## Consequences

- The catalog resets when the process starts. There is no create, update, or delete API.
- Sort direction is ascending only. `title` uses a case-insensitive English compare. Dates compare as ISO-8601 strings.
- `totalPages` is 0 when no course matches.
- Unknown and repeated query parameters are HTTP 400.
- `@axc/service-mongoose` is unchanged.
- The workspace lockfile records the new links from `@axc/application-services` and `@axc/persistence` to `@axc/domain`, and from `@apps/api` to `@axc/persistence`. Those are internal workspace packages, not new third-party dependencies.
