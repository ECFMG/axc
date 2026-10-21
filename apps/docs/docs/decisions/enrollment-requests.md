---
title: Keep enrollment requests in memory
sidebar_label: In-memory enrollment requests
description: Why enrollment requests use an in-memory store and an explicit status history.
---

# Keep enrollment requests in memory

- Status: accepted
- Date: 2026-10-21

## Context and Problem Statement

Learners need to request enrollment in an active course, and reviewers need to approve, reject, or cancel those requests. The workflow must reject duplicate active requests and keep an audit trail. The sample still must not depend on a real database.

## Decision Drivers

- Create, read, list, and status changes have to be testable in one process.
- Duplicate detection and status transitions are domain rules, not storage details.
- Every create and status change must append `statusHistory`.
- The course catalog is already an in-memory fixture.

## Considered Options

1. Persist enrollment requests with Mongoose in `@axc/service-mongoose`.
2. Keep an in-memory store behind an `EnrollmentRequestStore` port declared in `@axc/domain`.

## Decision Outcome

Chosen option 2. The domain owns email shape, justification bounds, the duplicate-active rule, the transition table, and the history entries. `@axc/persistence` implements the store. Each application-services factory owns one store, so tests do not share requests and the API process keeps them until it stops.

New requests start as `pending` with `changedBy` set to `system`. Reviewers send `changedBy` on `PATCH /api/enrollment-requests/:id/status`. Rejection requires a non-empty reason. Invalid transitions return `409`.

## Consequences

- Requests disappear when the process stops. Ids start again at `enroll-001` on the next process.
- A second API process does not see the first process's requests.
- Replacing the store with a database does not change the HTTP contract or the transition rules.
