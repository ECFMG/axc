# Training catalog and enrollment storage

## Status

Accepted.

## Context

The sample starts with MongoDB and Cellix mongoose seedwork packages but no business storage. Course queries need database filtering, sorting, and paging. Enrollment creation must prevent concurrent duplicate active requests, and each status update must preserve a consistent audit trail. External services and production configuration are outside this task.

## Decision

Use the existing Mongoose and mongodb-memory-server-core versions. Local API startup creates a single-node in-memory MongoDB 7.0.14 replica set so the vendored MongoUnitOfWork can use transactions. Use its required default Mongoose connection, register the service through Cellix, initialize indexes before serving business requests, and seed 12 courses only when the service has no configured URI. The sample composition root explicitly supplies no URI.

Course read repositories build validated filters field by field, escape literal regex text, and apply MongoDB sort, skip, limit, and count operations. Enrollment repositories persist a domain aggregate through a domain adapter and the seedwork unit of work. A partial unique index on courseId and lowercase learnerEmail applies to pending and approved records. The domain owns enrollment timestamps, transitions, and append-only status history. Mongo transactions retry write conflicts; optimistic concurrency also protects document saves.

The composition root supplies the clock and persistence as required dependencies. HTTP validation and error mapping belong to REST. Tests use real ephemeral MongoDB replica sets without production data; acceptance scenarios exercise the running Azure Functions API.

## Consequences

Data is temporary and disappears when the sample database stops. Local execution needs the MongoDB binary cached or available on first use. No database infrastructure is provisioned. The service can accept a URI through its constructor for existing wiring, but this task adds no environment variables or production settings. An unpaginated enrollment list is sufficient for the specified sample contract. Operator identifiers are audit metadata supplied by clients and are not authenticated identities.
