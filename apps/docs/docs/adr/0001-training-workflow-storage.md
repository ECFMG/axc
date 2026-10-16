# Training workflow storage

## Status

Accepted for the non-production training sample.

## Context

The starting branch exposes only health, but already includes Mongoose seedwork and `mongodb-memory-server-core`. Course search requires database filtering, sorting and paging. Enrollment requests require an atomic status history and protection against concurrent active duplicates. The task forbids introducing an external database or changing production configuration.

## Decision

Start a local MongoDB 7.0.14 replica set through the existing memory-server package. A replica set permits the Cellix MongoUnitOfWork transactions. The composition root injects the started storage into application services and seeds 12 mixed courses only for this local sample. No environment or production configuration changes are made.

Course and enrollment documents store a typed `record` snapshot behind the Mongoose adapter. Domain code validates and replaces enrollment snapshots; the adapter marks replacements as modified. Read repositories return the public snapshot, keeping MongoDB identifiers and version fields out of the API. Validated criteria are translated field by field into database queries, and search text is regex-escaped. Pagination and sorting happen in MongoDB.

A unique partial compound index on normalized email and course ID applies to pending and approved requests. It is initialized before requests are served. It rejects races without a check-then-insert window. Status and history are persisted in the same transaction; session reads and transaction retries prevent concurrent history loss. Duplicate key errors become a domain conflict, and REST owns HTTP mapping and safe errors.

## Consequences

This uses existing dependencies and Cellix transaction/event infrastructure, with new workspace links and existing test tooling declared where used. No dependency versions are upgraded. A local MongoDB binary must be cached or downloaded on first startup, and the host must allow local process/port creation. The data is ephemeral and is cleared on restart. Snapshot schema validation is owned by the domain and HTTP boundary; adding fields will require considering snapshot compatibility. The sample adds no authentication; client-supplied operator identifiers provide a demonstrative audit trail, not verified attribution. Enrollment lists return all matches because pagination was not requested.
