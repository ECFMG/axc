# Search the course catalog from an in-memory seed

* Status: accepted
* Date: 2026-10-07

## Context and Problem Statement

The sample API needs `GET /api/courses` with keyword search, modality, status, and tag filters, plus pagination and sorting. The catalog must be testable without production data or an external service. The application already separates domain, application services, persistence, and Hono delivery.

## Decision Drivers

* The endpoint has to run in unit tests and in the Azure Functions host.
* Domain code must stay free of Hono, Azure Functions, and Mongoose.
* Invalid query parameters need one consistent HTTP 400 body.
* A MongoDB process would add startup cost and a binary download for a read-only sample.

## Considered Options

* Seed courses in `@axc/persistence` and search them in `@axc/application-services`.
* Store courses in MongoDB through `@axc/service-mongoose` and `mongodb-memory-server-core`.
* Filter the catalog inside the Hono route.

## Decision Outcome

Chosen option: "Seed courses in `@axc/persistence` and search them in `@axc/application-services`."

`Course` is a domain entity. `CourseCatalog` is the read port. Persistence supplies 13 seeded courses through an in-memory adapter. The application service parses the query, applies filters, sorts, and paginates. `@axc/rest` maps a failed parse to HTTP 400 and a successful page to HTTP 200. `@apps/api` injects the seeded catalog and registers the `api/courses` function.

`@axc/service-mongoose` stays the Mongoose extension point and is not on this read path.

### Consequences

* Good, because tests do not start a database.
* Good, because the query rules live in one use case.
* Bad, because the catalog does not survive a process restart except by reseeding.
* Bad, because a later MongoDB adapter must implement the same `CourseCatalog` port.

## Pros and Cons of the Options

### Seed courses in persistence

* Good, because the sample stays free of external services.
* Good, because the composition root can inject the catalog.
* Bad, because it is not a durable store.

### MongoDB memory server

* Good, because it exercises Mongoose.
* Bad, because the Functions host would wait on a database binary before serving `/api/courses`.
* Bad, because the search behavior does not require a database.

### Filter inside the Hono route

* Good, because fewer types cross the route boundary.
* Bad, because query rules would be harder to test without HTTP.
* Bad, because the route would own catalog data.

## More Information

The HTTP contract is documented in [Course catalog](../courses).
