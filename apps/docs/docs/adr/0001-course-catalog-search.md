# Use an in-memory course fixture for catalog search

## Status

Accepted

## Context

`GET /api/courses` must filter, paginate, and sort a training catalog without production data or an external service. The API is composed by `@apps/api`, with domain types in `@axc/domain`, storage behind `@axc/persistence`, use cases in `@axc/application-services`, and Hono routes in `@axc/rest`.

## Decision

Represent a course as a domain entity with `id`, `title`, `summary`, `modality`, `status`, `tags`, `createdAt`, and `updatedAt`. Store twelve seeded courses in an in-memory catalog inside `@axc/persistence`. `@axc/application-services` validates query parameters and applies keyword, modality, status, tag, pagination, and sort rules. `@axc/rest` exposes `GET /api/courses`, and `@apps/api` registers that route on the Azure Functions host.

`@axc/service-mongoose` stays the Mongoose extension point. This read path does not open a database connection.

## Consequences

- Catalog search runs in unit tests and the local API process without MongoDB.
- The fixture resets when the process starts. It is not shared across scaled instances.
- A later write model can replace `InMemoryCourseCatalog` without changing the HTTP contract.
