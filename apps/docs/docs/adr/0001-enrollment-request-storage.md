---
status: accepted
date: 2026-10-21
---

# Store courses and enrollment requests in memory

## Context and Problem Statement

The sample API must search a course catalog and keep enrollment requests, including a status audit trail, without a production database or an external service.

## Decision Drivers

* The API must start from the existing composition root.
* Duplicate pending and approved requests must be rejected inside one process.
* Every create and status change must keep a history entry.

## Considered Options

* In-memory repositories owned by `@axc/persistence` and constructed in `@apps/api`.
* Mongoose models backed by a memory MongoDB server.

## Decision Outcome

Chosen option: in-memory repositories. `@axc/domain` holds the course page rules and enrollment transition rules. `@axc/application-services` orchestrates them. `@apps/api` constructs one course catalog and one enrollment store for the process lifetime.

### Consequences

* Good, because the sample needs no database process and the catalog is a fixed set of 12 courses.
* Bad, because a restart drops enrollment requests.
* Bad, because the duplicate check is safe only inside one API process.

## More Information

Replace the in-memory stores when enrollment requests must survive a restart.
