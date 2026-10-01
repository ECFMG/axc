# 0001 — Course catalog search lives in the application services layer

## Status

Accepted

## Context

`GET /api/courses` needs a Course model, fixture data, query validation and search.
The repository layers these concerns across `@axc/domain`, `@axc/persistence` and
`@axc/application-services`, so the model and a repository would normally be split
across all three.

Those packages do not currently depend on each other: `@axc/application-services`
declares no workspace dependencies. Adding `@axc/domain` or `@axc/persistence` to its
`package.json` rewrites `pnpm-lock.yaml`, which is outside this task's write boundary.

## Decision

Keep the whole read-side slice in `@axc/application-services/src/course-catalog.ts`:
the `Course` type, the 14-course fixture catalog, query validation and the search
function. `@axc/rest` owns only transport — it passes the raw query string record to
the service and maps the returned `{ status, body }` onto the HTTP response.
`apps/api` registers the route.

## Consequences

- No new package dependencies, no lockfile change, no new directories.
- Search is pure and synchronous, so it is unit-testable without infrastructure.
- Validation lives in one place, so REST and any future caller get the same
  `INVALID_QUERY_PARAMETER` contract.
- When the catalog moves to MongoDB, the `Course` type and a repository contract move
  to `@axc/domain` / `@axc/persistence` and `searchCourses` becomes async against a
  repository. The HTTP contract and its tests do not change.
