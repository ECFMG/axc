# 1. In-memory repositories for the course catalog and enrollment requests

- Status: accepted
- Date: 2026-10-12
- Deciders: agentCourses maintainers

## Context and problem statement

`GET /api/courses` and the `/api/enrollment-requests` workflow need somewhere to read and write
data. The scaffold ships `@axc/service-mongoose` and `mongodb-memory-server-core`, but no database
is provisioned, no connection string exists, and nothing in the application currently opens a
Mongo connection. Standing one up would mean new runtime configuration and a new failure mode in
the acceptance suite, which runs the real Azure Functions host.

How should the catalog and the enrollment request workflow be stored so that the API, the unit
suites, and the Serenity acceptance suite all work without provisioning infrastructure?

## Considered options

1. **In-memory repository adapters in `@axc/persistence`**, seeded with a fixture catalog.
2. **Mongoose adapters over `mongodb-memory-server-core`**, started by the composition root.
3. **A JSON fixture file read from disk on every request.**

## Decision outcome

Chosen option: **in-memory repository adapters in `@axc/persistence`**.

The repository *ports* (`CourseRepository`, `EnrollmentRequestRepository`) live in `@axc/domain`.
`@axc/persistence` supplies the adapters, and `@apps/api` injects them through the Cellix
infrastructure context. Swapping in Mongoose-backed adapters later is a change to
`@axc/persistence` and the composition root only — the domain, the application services, and the
REST layer stay untouched.

### Consequences

- **Good:** no provisioned database, no connection string, no new runtime configuration. The
  acceptance suite stays fast and deterministic.
- **Good:** unit suites construct a fresh repository per test, so there is no shared state to
  reset and no test ordering coupling.
- **Good:** the seam that a real database would plug into already exists and is exercised.
- **Bad:** enrollment requests do not survive an API process restart. Acceptable for a sample
  application; it would not be for production.
- **Bad:** state is per-process, so a multi-instance deployment would not share enrollment
  requests. The scaffold runs a single host.

## Pros and cons of the options

### Mongoose over `mongodb-memory-server-core`

- Good, because it exercises the deployed runtime's real storage technology.
- Bad, because it adds a startup dependency (downloading and booting a Mongo binary) to every
  acceptance run, and adds configuration the task set is not allowed to introduce.

### JSON fixture file on disk

- Good, because the catalog would be editable without a rebuild.
- Bad, because enrollment requests are written, not just read, which would mean writing to the
  working tree during tests.
