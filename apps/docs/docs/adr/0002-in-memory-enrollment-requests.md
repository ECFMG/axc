# ADR 0002: In-memory enrollment requests

## Status

Accepted

## Context

Enrollment requests are a write workflow on top of the read-only course catalog. A request can be created only for an active course, must start as `pending`, must reject duplicates while a request is `pending` or `approved`, and must follow a fixed set of status transitions. Every create and status change needs a `statusHistory` entry.

The course catalog ADR keeps course fixtures in `@axc/persistence` and leaves `@axc/service-mongoose` off the read path. The task also forbids introducing a real database when the sample uses in-memory fixtures.

## Decision

Keep enrollment rules in `@axc/domain`: email shape, justification length, the active-course rule, duplicate detection, and the transition table. Those functions return new request values. They do not know about HTTP.

Store requests in an in-memory repository created by `@axc/persistence`. `@apps/api` creates one repository when it builds application services and passes it into the factory, so every request in the process shares the store. `@axc/application-services` loads the course fixture, calls the domain rules, and maps failures to the API error codes and HTTP statuses. `@axc/rest` parses JSON and delegates to those use cases.

`@axc/service-mongoose` stays unused on this path.

Considered options:

- Memory Mongo through `@axc/service-mongoose`. Rejected. It would start a database the catalog path deliberately avoided, and the task says not to add one.
- A JSON file. Rejected. The sample has no write-fixture pattern, and a file would outlive the test process.
- In-memory repository. Chosen. It matches the catalog fixture, resets with the process, and keeps the domain free of Mongoose.

Ids are process-local (`enroll-001`, `enroll-002`, ...). Creation records `changedBy` as `system`. Later changes store the caller-supplied `changedBy` label. This sample does not authenticate that label.

## Consequences

- Acceptance tests call the real `@apps/api` host. Scenarios that create requests use distinct learner and course pairs because the store lives for the process.
- Restarting the host drops every enrollment request. The course fixture does not change.
- A later durable store can implement the same repository interface. This decision does not add that store.
