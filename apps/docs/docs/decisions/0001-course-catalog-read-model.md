# ADR 0001 — Course catalog read model

## Context and problem statement

`GET /api/courses` must search a course catalog by keyword, filter by modality, status and
tag, paginate and sort. The catalog is small, read-only from the API's point of view, and
the endpoint has to be runnable and testable without any external service — the acceptance
suite starts the real Azure Functions host in CI.

The workspace already carries `@axc/service-mongoose`, which wraps the Cellix Mongoose
seedwork and `mongodb-memory-server-core`. The question is where the catalog is read from,
and where the search itself is evaluated.

## Decision drivers

- The endpoint must work with no external service, in tests and in local development.
- The catalog contract belongs to the domain; `test:arch` fails if `@axc/domain` reaches for
  Hono, Azure, Mongoose or any package above it.
- The search semantics are the interesting part and should be unit-testable without I/O.
- The repository should be replaceable without touching the route or the application service.

## Considered options

1. **Fixture-backed in-memory read repository** behind a domain-owned port.
2. **Mongoose-backed repository** using `@axc/service-mongoose` and `mongodb-memory-server`.
3. **Search logic in the route handler**, reading a fixture array directly.

## Decision outcome

Chosen: **option 1**, a fixture-backed in-memory repository behind a domain-owned port.

- `@axc/domain` owns `Course`, the `CourseSearchCriteria` value and its validation, the pure
  `searchCourses` evaluation, and the `CourseReadRepository` port.
- `@axc/persistence` owns `COURSE_SEED_DATA` (14 courses) and `InMemoryCourseReadRepository`,
  which delegates to `searchCourses`.
- `@axc/application-services` validates the untrusted query and returns either a result page
  or the shared error envelope. It never throws for bad input.
- `@axc/rest` maps that outcome onto HTTP: `200` with the page, or `400` with the envelope.
- `@apps/api` registers the Azure Function. `host.json` sets `routePrefix` to `""`, so the
  function's route is `api/courses` rather than `courses`.

### Consequences

- Good: the endpoint runs with no database, so unit, integration and acceptance suites are
  all hermetic and fast.
- Good: search semantics are pure functions and are tested directly, independent of delivery
  and storage.
- Good: swapping in a Mongoose repository means implementing `CourseReadRepository` in
  `@axc/service-mongoose` and passing it through `ApiContext.courseRepository`. No route,
  application service or domain change is required.
- Bad: the catalog is not persistent and cannot be written to. There is no index, so search
  is a linear scan — acceptable for a fixture of this size, not for a real catalog.
- Bad: query semantics that a database would provide (collation, text indexes, accent
  folding) are approximated in TypeScript.

## Validation semantics

Validation lives in the domain, not in the route, so the same rules apply to any future
delivery mechanism. Two choices are worth recording:

- **Every invalid parameter is reported**, not just the first, so a client can fix a whole
  query in one round trip.
- **Unrecognised query parameters are ignored** rather than rejected. `RawCourseSearchQuery`
  declares one named property per supported parameter, so the delivery layer drops anything
  else before it reaches the domain. Rejecting unknown parameters would break clients that
  append cache-busting or tracking parameters, and the specification only requires the named
  parameters to be validated.
- **`pageSize` above the maximum is rejected rather than clamped.** Silently serving a
  different page size than the one asked for makes client-side paging arithmetic wrong.
