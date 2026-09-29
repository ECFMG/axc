# 1. Course catalog is a fixture-backed read model

- Status: accepted
- Date: 2026-09-29
- Deciders: agentCourses maintainers

## Context and Problem Statement

`GET /api/courses` has to search, filter, sort, and paginate a course catalog.
The feature must be exercisable by unit and acceptance tests without an external
datastore and without production data. Where should the catalog live, and what
shape should the search contract take?

## Decision Drivers

- The acceptance suite starts the real Azure Functions host; it must not also
  need a database process.
- Validation rules have to be identical no matter which delivery mechanism calls
  them.
- The write boundary for this change forbids new dependencies, because adding
  one rewrites the root `pnpm-lock.yaml`.

## Considered Options

1. **Fixture-backed read model behind a repository port** in
   `@axc/application-services`.
2. **Mongoose collection** seeded through `@axc/service-mongoose` and
   `mongodb-memory-server-core`.
3. **Search logic in the Hono route**, reading a fixture module directly.

## Decision Outcome

Chosen option: **1, a fixture-backed read model behind a repository port**.

`CourseCatalogRepository` is a read port with a single `search(criteria)` method.
`createInMemoryCourseCatalogRepository` implements it over `courseCatalogFixture`
by delegating to `searchCourseCatalog`, a pure filter/sort/paginate function.
`createCourseCatalogApplicationService` owns validation and returns a
discriminated outcome — `{ status: 'ok' }` or `{ status: 'invalid' }` — so the
REST layer only chooses a status code.

### Consequences

- Good: the whole contract is unit-testable in milliseconds, and the acceptance
  suite needs nothing beyond the API host.
- Good: swapping in a Mongoose-backed repository later means implementing one
  interface; no route, validation, or response shape changes.
- Good: validation lives in one place, so a future GraphQL or CLI caller rejects
  exactly the same inputs.
- Bad: the catalog is read-only and resets with the process. There is no write
  path, and results are not durable.
- Bad: filtering happens in memory, so this does not scale past a fixture-sized
  catalog.

## Pros and Cons of the Options

### Mongoose collection

- Good: exercises the persistence stack that production would use.
- Bad: `@axc/persistence` and `@axc/service-mongoose` are not yet linked into the
  `@apps/api` dependency graph. Wiring them means editing `package.json` files and
  regenerating the root lockfile, which is outside this change's write boundary.
- Bad: the acceptance host would need to start and seed a MongoDB process,
  adding minutes to every run.

### Search logic in the Hono route

- Good: the smallest possible diff.
- Bad: validation and paging rules become untestable without HTTP, and a second
  delivery mechanism would have to duplicate them.

## More Information

The endpoint contract is documented in [Courses](../courses.md).
