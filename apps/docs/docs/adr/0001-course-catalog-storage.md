# 0001: MongoDB read model for the course catalog

- Status: Accepted
- Date: 2026-10-16

## Context

The sample needs a searchable course catalog that can be tested without external services.
Cellix layering puts database queries in persistence and infrastructure lifecycle in
service-mongoose. MongoDB dependencies already exist in the workspace.

## Decision

Use a read-only course model built by the Cellix Mongoose model factory. Domain owns the
course shape, criteria, allowed values and read contract. Application services delegate
typed criteria; REST validates HTTP input. Persistence constructs filters field by field,
escapes literal regex searches, and executes count, sort, skip and limit in MongoDB.
Only public course fields are serialized. Course IDs are unique, independent of Mongo IDs.

The API composition root injects storage explicitly. The infrastructure service uses
MongoDB 7.0.14 locally when no URI is supplied, with a required local initializer that
seeds twelve deterministic courses. Configured databases use the same read model and
are never seeded automatically. No write aggregate or transaction unit of work is needed
for a read-only endpoint.

## Consequences

Integration tests exercise actual MongoDB query semantics without production data.
Local data is ephemeral; a binary cache or initial download is needed. Literal regex
substring search is suitable for this small sample but can scan documents at larger
scale. Count and page reads are separate queries, so concurrent external writes may
change the catalog between the two reads. Title and timestamp sorts use ascending
order and a course-ID tie breaker.
