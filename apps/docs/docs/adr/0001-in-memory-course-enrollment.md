# Use in-memory repositories for courses and enrollment requests

* Status: accepted
* Date: 2026-10-21

## Context and Problem Statement

The course catalog and enrollment workflow need searchable course data and enrollment requests with validation, duplicate prevention, status transitions, and a status history. The API already has a Mongoose extension point in `@axc/service-mongoose`, and Cellix persistence conventions target MongoDB. The sample must stay runnable without a real database, external services, or new production configuration.

How should course and enrollment data be stored?

## Decision Drivers

* Tests and local runs must work without MongoDB or other external services.
* Domain rules must not depend on Hono, Azure Functions, or Mongoose.
* Application services must not import infrastructure.
* Restarting the sample can discard data. This is not a production enrollment system.
* The catalog is a fixed fixture of at least 12 courses.

## Considered Options

* In-memory repositories behind domain ports, composed in `@axc/application-services`.
* Mongoose models in `@axc/service-mongoose` with `mongodb-memory-server`.
* A file written under the API package.

## Decision Outcome

Chosen option: in-memory repositories, because the sample forbids introducing a real database and the data does not need to survive a process restart.

`@axc/domain` holds the course and enrollment types, the course fixture, and the transition and validation rules. `@axc/persistence` holds the in-memory course catalog and enrollment request store. `@axc/application-services` orchestrates search and enrollment. `@axc/rest` maps those operations to Hono routes, and `@apps/api` registers the routes on the Azure Functions host. `@axc/service-mongoose` is unchanged so a later MongoDB adapter can replace the in-memory store without rewriting the HTTP contract.

Each call to `buildApplicationServicesFactory` creates one catalog and one request store. Requests inside that factory share the store, so duplicate detection and status history survive across HTTP calls in the same process. A new factory, including each test, starts empty of enrollment requests and reloads the course fixture.

## Consequences

* Good, because unit and HTTP tests do not start a database.
* Good, because domain code stays free of Mongoose and HTTP types.
* Bad, because enrollment requests disappear when the process stops.
* Bad, because two API processes do not share requests.
* Bad, because ids begin at `enroll-001` for every new store.

## Confirmation

`@axc/application-services` catalog tests and `@axc/rest` route tests cover search, creation, duplicate prevention, retrieval, filtering, transitions, history, and error status codes. The existing healthcheck acceptance test still starts the API host.

## Pros and Cons of the Options

### In-memory repositories

* Good, because it matches a fixture catalog and a process-local workflow.
* Good, because it follows the existing package boundaries without new dependencies.
* Bad, because it does not exercise the Mongoose seedwork.

### Mongoose with mongodb-memory-server

* Good, because it matches the Cellix repository and unit-of-work conventions.
* Bad, because application services are not allowed to depend on `@axc/service-mongoose`.
* Bad, because it adds database startup to every test and to the API host for data that is still discarded.
* Bad, because the task says not to introduce a real database while the sample can use fixtures.

### A JSON file

* Good, because data would survive a restart of one process.
* Bad, because concurrent test processes would race on the file.
* Bad, because the sample would then need a writable data directory that is not part of the current API layout.

## More Information

* [Course catalog](/api/courses)
* [Enrollment requests](/api/enrollment-requests)
