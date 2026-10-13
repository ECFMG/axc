# Serve course search from the existing Hono API

## Context and Problem Statement

The training catalog needs `GET /api/courses` with keyword search, modality, status, and tag filters, pagination, and sorting. The sample must stay testable without external services. How should the endpoint fit the Cellix layering already used by the healthcheck?

## Decision Drivers

* The route has to live in `@axc/rest` and be registered by `@apps/api`.
* Domain code cannot import Hono, Azure Functions, Mongoose, or persistence.
* Application services cannot import `@axc/service-mongoose`.
* Invalid query parameters need one consistent HTTP 400 body.
* The catalog needs at least 12 mixed courses without a production database.

## Considered Options

* In-memory fixture behind a domain `CourseCatalog` port.
* Mongoose model on `mongodb-memory-server` inside `@axc/service-mongoose`.

## Decision Outcome

Chosen option: "in-memory fixture", because the catalog is read-only sample data and the search rules are application logic.

`Course` and `CourseCatalog` live in `@axc/domain`. `@axc/persistence` holds the 13 frozen fixtures and implements the port. `@axc/application-services` validates query parameters and applies filters, pagination, and ascending sort. `@axc/rest` maps `GET /api/courses` onto that use case. `@apps/api` registers the Azure Functions route `api/courses` because `host.json` sets `routePrefix` to an empty string, which makes the public path `/api/courses`.

## Consequences

* Search is covered by application-service tests, Hono tests, and Serenity acceptance scenarios.
* Restarting the API does not change the catalog. There is no write endpoint.
* A later MongoDB adapter can implement `CourseCatalog` without changing the HTTP contract.
* Sort order is ascending for `title`, `createdAt`, and `updatedAt`.
* Unknown query parameters and repeated parameters return HTTP 400.
