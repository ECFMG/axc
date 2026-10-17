# ADR 0001: In-memory course catalog

## Status

Accepted

## Context

`GET /api/courses` needs a course model, a fixture of at least 12 courses, and search behavior that tests can run without external services or production data.

`@axc/service-mongoose` is the Mongoose extension point. Starting a memory MongoDB server inside the Azure Functions host would add runtime setup the healthcheck path does not need. The catalog for this endpoint is read-only fixture data.

## Decision

Keep the course shape and search rules in `@axc/domain`. Store the seeded courses in `@axc/persistence` as an in-memory collection. `@axc/application-services` validates query parameters and calls the domain search. `@axc/rest` maps `GET /api/courses` to that use case. `@apps/api` injects the seeded catalog when it builds application services and registers the Azure Functions route.

`@axc/service-mongoose` stays the Mongoose extension point and is not on the catalog read path.

Query validation failures use one error document: `INVALID_QUERY_PARAMETER`, a stable message, and a `details` array. An empty match is a successful empty page.

## Consequences

- Acceptance tests can call the real `@apps/api` host without a database.
- The catalog resets with the process. It is not a durable store.
- A later write model can add a repository behind the same domain course type. This decision does not add that repository.
