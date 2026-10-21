# Serve course search from an in-memory catalog

- Status: accepted
- Date: 2026-10-21

## Context and Problem Statement

Learners need to search the training catalog by keyword, modality, status, and tag, with pagination and sorting. The endpoint has to be testable without external services or production data. How should `GET /api/courses` store and read courses?

## Decision Drivers

- `@axc/domain`, `@axc/persistence`, `@axc/application-services`, and `@axc/rest` already split the application by layer.
- `@apps/api` composes the healthcheck without a database.
- `@axc/service-mongoose` is present and unused. Calling it would be the first use of that adapter.
- The feature must run without MongoDB or any other external service.

## Considered Options

- Keep a fixed course fixture in memory in `@axc/persistence`.
- Add a Mongoose model in `@axc/service-mongoose` and start `mongodb-memory-server-core` for local and test runs.

## Decision Outcome

Chosen option: in-memory fixture in `@axc/persistence`, because the catalog must be readable without external services and the composition root does not use the Mongoose adapter.

`@axc/domain` defines the course read model. `@axc/application-services` validates the query, filters, sorts, and paginates. `@axc/rest` maps `GET /api/courses`. `@apps/api` registers an Azure Functions HTTP function named `courses` with route `api/courses`, because `host.json` sets `routePrefix` to an empty string and each function owns one route. The handler is the same Hono application that serves `GET /health`.

The request and response contract is documented in [Course catalog](../courses.md).

## Consequences

- Good, because unit and acceptance tests do not start MongoDB.
- Good, because the domain model does not import REST, Hono, Azure Functions, Mongoose, or persistence.
- Bad, because the catalog is a fixed 13-course fixture, not a writable store.
- Bad, because sort order is always ascending. There is no direction parameter.
