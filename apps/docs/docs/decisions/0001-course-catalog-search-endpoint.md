# 1. Course catalog search endpoint

- Status: accepted
- Date: 2026-09-29
- Deciders: agentCourses maintainers

## Context and Problem Statement

agentCourses needed its first read capability beyond the healthcheck: a searchable training course
catalog at `GET /api/courses` with keyword search, filtering, pagination, sorting, and consistent
validation errors. The scaffold has no provisioned database and no authenticated caller, and the
feature has to be testable without external services. How should the catalog be layered across the
existing Cellix-style packages, and where should query semantics live?

## Decision Drivers

- The Cellix layering already in place: `@axc/domain` → `@axc/persistence` / `@axc/application-services` → `@axc/rest`, composed by `@apps/api`.
- Architecture fitness tests forbid the domain from importing delivery or persistence implementations, and forbid REST and application services from reaching infrastructure directly.
- Tests must run without a database, a network, or production data.
- The endpoint must be swappable onto a real data source later without rewriting the route or the use case.
- No new runtime dependencies.

## Considered Options

1. **Layered read model with an injected read repository.** Catalog vocabulary and query semantics in `@axc/domain`; a fixture-backed adapter in `@axc/persistence`; validation and orchestration in `@axc/application-services`; HTTP mapping in `@axc/rest`; wiring in `@apps/api`.
2. **Query logic in the Hono route.** Filter, sort, and paginate an array directly in `@axc/rest`.
3. **Mongoose-backed read model now.** Model the catalog in `@axc/service-mongoose` and run `mongodb-memory-server-core` for tests.

## Decision Outcome

Chosen option: **1, layered read model with an injected read repository.**

`@axc/domain` owns the `Course` model, the `modality`/`status`/`sort` vocabularies, the pagination
bounds, the `CourseReadRepository` contract, and `queryCourseCatalog` — the pure function that
defines what filtering, ordering, and pagination mean. `@axc/persistence` supplies the fixture
catalog and an in-memory adapter that delegates to that function. `@axc/application-services`
validates raw query parameters and orchestrates the repository call, returning validation failures
as data rather than throwing. `@axc/rest` maps an outcome to `200` or to `400` with the shared
error envelope. `@apps/api` injects the repository into the API context.

### Consequences

- Good: query semantics have one definition, so any future adapter answers identically.
- Good: the use case is free of HTTP concepts and the route is free of query semantics, so each is unit-testable in isolation.
- Good: no new dependencies, and the whole feature runs in-process.
- Good: replacing the data source is a one-line change in the composition root.
- Bad: one more indirection than putting the logic in the route.
- Bad: the fixture is compiled into `@axc/persistence`, so catalog content changes require a build.

## Rejected Options

**Query logic in the Hono route** keeps the diff small but puts domain rules in the delivery layer,
makes the rules untestable without HTTP, and would have to be rewritten the moment a real data
source appears.

**Mongoose-backed read model now** would exercise the eventual production path, but it buys an
in-memory MongoDB process for every test run, a schema for data that is still a fixture, and
startup coupling in the Azure Functions host — none of which the current requirement needs. The
`CourseReadRepository` contract keeps this option open.

## Other Decisions

These smaller choices were settled while implementing the endpoint and are recorded here rather
than in separate records.

### Route path is `api/courses`, not `courses`

`apps/api/host.json` sets `routePrefix` to `""`, so the Azure Functions route string is the full
path. The function is therefore registered as `api/courses` and the Hono route is `/api/courses`.
The existing healthcheck stays at `/health`. Changing `routePrefix` to `api` would have moved the
healthcheck and broken its acceptance test, and `host.json` is host configuration.

### Sorting is ascending for all sort fields

The specification names the sort fields but not a direction. Ascending is consistent across all
three and is the literal reading of "sorted by `createdAt`". Ordering is made total by tie-breaking
on `title` and then `id` so that paging is stable when two courses share a sort key. A future
`sortDirection` parameter can add descending order without changing the existing contract.

### Unrecognised query parameters are ignored

Only the documented parameters are validated. An unknown parameter such as a cache-buster or a
trace identifier is ignored rather than rejected, which is the conventional REST behaviour and
keeps the contract additive. Every documented parameter is still validated, and all failures are
reported in one response rather than stopping at the first.

### Empty values mean "not supplied"

`?page=` and `?q=%20` resolve to the defaults rather than failing validation, so a caller clearing
a form field gets the default page instead of a `400`.

### Validation failures are returned as data

`CourseSearchApplicationService.search` returns a discriminated outcome instead of throwing. The
transport layer decides the status code and wire format, which keeps `@axc/application-services`
free of HTTP concepts and makes the validation matrix testable without a server.
