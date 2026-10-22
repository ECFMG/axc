---
id: 0001-in-memory-catalog
status: accepted
date: 2026-10-22
---

# In-memory catalog and enrollment transactions

## Context and Problem Statement

The sample needs a deterministic course catalog and an enrollment workflow without external systems or database infrastructure.

## Considered Options

- Process local fixtures and transactional in-memory request storage.
- MongoDB backed persistence.

## Decision Outcome

Use twelve fixed courses and an in-memory request map, constructed once in the API composition root and shared across requests. Commands use the Cellix aggregate/repository/unit-of-work contracts. A transaction stages a deep copy and commits only after success. One queue serializes all commands, making duplicate checks and status updates atomic in a process. Reads return copies. Domain and service validation also protect direct callers.

## Consequences

The sample is deterministic and requires no external service. Requests and audit history disappear on restart and are not shared across workers. The queue and full-map copies favor clarity over scale. Email comparison is case insensitive; justification is measured after trimming. Creation uses the system audit identifier; status changes use an unverified caller identifier. No authentication is introduced.
