---
id: 0001-in-memory-enrollment
title: In-memory enrollment transactions
status: accepted
date: 2026-10-18
---

## Context and Problem Statement

The sample starts without a database or catalog. Enrollment requires atomic duplicate prevention, immutable read snapshots, and an auditable status workflow without external integrations.

## Considered Options

- A database with unique indexes and transactions.
- A process-local store with serialized, staged transactions.

## Decision Outcome

Use a seeded catalog and a process-local enrollment store injected by the API composition root. Commands operate on Cellix aggregates through an initialized unit of work. A queue serializes transactions; each transaction stages copies and publishes changes only on success. Repository saves also check active-request uniqueness. Queries return deep copies. Email identity uses lowercase comparison. Creation audits use `system`; operator labels are provided in status-change bodies.

## Consequences

No database or external package is required. Failed operations roll back and concurrent requests in one host cannot create duplicate active enrollments. Data is lost on restart and is not shared across processes or instances. The workflow provides no real authentication, durable storage, notification, or external enrollment integration. A durable implementation would need database-level concurrency enforcement.
