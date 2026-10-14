# Use an in-memory course catalog

- Status: accepted
- Date: 2026-10-14

## Context and Problem Statement

`GET /api/courses` needs a course catalog that unit tests and acceptance tests can run without external services or production data.

## Considered Options

- Seed a MongoDB memory server through `@axc/service-mongoose`.
- Keep a fixed in-memory fixture in `@axc/persistence`.

## Decision Outcome

Chosen option: the in-memory fixture, because the catalog is read-only and the search contract does not need a database.

`@axc/domain` defines the Course model. `@axc/persistence` holds the 12-course fixture. `@axc/application-services` validates query parameters and applies keyword, modality, status, tag, sort, and pagination rules. `@axc/rest` maps invalid parameters to HTTP 400.

## Consequences

- Search results are the same in every environment.
- The catalog does not persist writes. There is no create or update endpoint.
- A later MongoDB adapter can replace `listSeedCourses` without changing the HTTP contract.

## More Information

The HTTP contract is documented in [Course catalog](../courses.md).
