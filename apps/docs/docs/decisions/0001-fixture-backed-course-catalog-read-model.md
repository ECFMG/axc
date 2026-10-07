# 1. Fixture-backed course catalog read model

- Status: accepted
- Date: 2026-09-29
- Deciders: agentCourses engineering

## Context and problem statement

`GET /api/courses` needs a course catalog to search. The scaffold has a Mongoose extension point
(`@axc/service-mongoose`) but no database wiring, no models, and no seeded data, and the feature
must be testable without external services or production data.

How should the catalog be stored so the endpoint is real, verifiable in CI, and cheap to move onto
MongoDB later?

## Decision drivers

- The endpoint must run in unit tests, the Serenity acceptance suite, and `pnpm run dev` with no
  database process and no network access.
- Dependency script execution is disabled (`.npmrc` sets `ignore-scripts=true`), so
  `mongodb-memory-server` cannot download a `mongod` binary during install.
- Search, filtering, sorting, and pagination semantics should be owned by the application, not by a
  specific data store, so the store can change without changing the contract.
- No new runtime dependencies.

## Considered options

1. **Fixture-backed in-memory read repository in `@axc/persistence`.**
2. **Mongoose models in `@axc/service-mongoose` plus `mongodb-memory-server` for tests.**
3. **Hard-code the catalog inside the REST route or the application service.**

## Decision outcome

Option 1. `@axc/domain` owns the `Course` model, the catalog search policy (defaults, maximum page
size, allowed sort fields), and the `CourseCatalogReadRepository` contract.
`@axc/persistence` provides `buildCourseCatalogFixtureRepository`, an in-memory implementation over
a fourteen-course fixture. `@apps/api` injects it as part of the infrastructure context.

### Consequences

- Good: the endpoint is exercised end to end over HTTP by the acceptance suite with no database,
  no downloads, and no new dependencies.
- Good: replacing the fixture with a Mongoose-backed implementation of the same contract touches
  only `@axc/service-mongoose`, `@axc/persistence`, and the one line in `@apps/api` that builds the
  repository. The REST layer, the application service, and the API contract are unchanged.
- Bad: the catalog is read-only and identical in every environment. There is no write path, no
  index-backed query plan, and the whole catalog is filtered in process, which will not scale past
  fixture-sized data.
- Bad: query semantics implemented as JavaScript predicates will have to be re-expressed as a
  database query, and that translation needs its own tests.

Option 2 was rejected for this task because the install policy blocks the `mongod` download, which
would make the gate depend on network access. Option 3 was rejected because it puts data and query
semantics in the delivery layer and leaves no seam for a real store.
