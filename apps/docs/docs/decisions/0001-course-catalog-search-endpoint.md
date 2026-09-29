# 1. Course catalog search endpoint

- Status: accepted
- Date: 2026-09-29

## Context and Problem Statement

agentCourses needs a first read capability beyond the healthcheck: users must be able to
search a training course catalog by keyword and narrow it by modality, status, and tag,
with pagination and sorting. The scaffold has Cellix layers in place (`@axc/domain`,
`@axc/persistence`, `@axc/application-services`, `@axc/rest`) but no domain model in any
of them. Where should search semantics, validation, and catalog data live, and what should
back the catalog?

## Decision Drivers

- The endpoint must be testable with no database and no external services.
- Architecture fitness tests forbid the domain layer from importing delivery or persistence
  implementations, and forbid REST and application services from reaching infrastructure.
- Invalid query parameters need one consistent error contract.
- No new third-party dependencies.

## Considered Options

1. **In-memory read model in `@axc/persistence`, search semantics in `@axc/domain`.**
2. **Mongo-backed repository via `@axc/service-mongoose`,** seeded through
   `mongodb-memory-server-core` for local and test runs.
3. **Everything in `@axc/rest`** — fixture array, filtering, and validation in the route.

## Decision Outcome

Chosen: **option 1**.

- `@axc/domain` owns the `Course` model, the allowed enum values, pagination bounds, and
  `searchCourses`, the pure function that defines what filtering, ordering, and paging mean.
  It also declares the `CourseReadRepository` port.
- `@axc/persistence` holds the seeded catalog and `createInMemoryCourseReadRepository`,
  which adapts the port onto that collection.
- `@axc/application-services` validates raw query parameters into a `CourseSearchCriteria`
  and returns a discriminated outcome — either a page or the list of rejected fields.
- `@axc/rest` maps that outcome onto HTTP: `200` with the page, or `400` with the
  `INVALID_QUERY_PARAMETER` envelope.
- `@apps/api`, the composition root, builds the repository and injects it through `ApiContext`.

### Consequences

- Good: the endpoint runs anywhere `pnpm test` runs, with no database process, and the
  acceptance suite exercises the real HTTP path end to end.
- Good: swapping in a Mongo-backed repository later means implementing
  `CourseReadRepository` in `@axc/service-mongoose` and changing one line in the
  composition root. Nothing in the domain, application, or REST layers moves.
- Good: search semantics are defined once, so every repository implementation must answer a
  given `CourseSearchCriteria` the same way.
- Bad: a future Mongo implementation cannot reuse `searchCourses` — it must translate
  `CourseSearchCriteria` into a database query, and keep those two in step. The domain unit
  tests are the shared specification for that.
- Bad: the catalog is fixture data. There is no write path, and the data resets with the process.

## Pros and Cons of the Options

### Option 1 — in-memory read model

- Good, because it needs no database and keeps every layer boundary intact.
- Good, because the port makes the storage choice reversible.
- Bad, because the catalog is not persistent or writable.

### Option 2 — Mongo-backed repository

- Good, because it exercises `@axc/service-mongoose` and models real persistence.
- Bad, because the Azure Functions host used by the acceptance suite would have to start and
  seed a MongoDB process, which adds startup cost and a failure mode for an endpoint that
  serves reference data.
- Bad, because it is a large step for a catalog with no write path.

### Option 3 — everything in `@axc/rest`

- Good, because it is the smallest amount of code.
- Bad, because it puts business rules in the delivery layer, leaves the domain and
  persistence packages empty, and makes the storage choice irreversible without a rewrite.

## More Information

The endpoint contract is documented in [Course catalog search](../courses.md).
