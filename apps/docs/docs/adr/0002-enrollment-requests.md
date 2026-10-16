# Enrollment requests keep status changes on the aggregate

* Status: accepted
* Date: 2026-10-16

## Context and Problem Statement

A learner needs to request enrollment in an active course. Reviewers need to approve, reject, or cancel that request, and the API needs a record of each status change. A learner must not hold more than one pending or approved request for the same course.

## Decision Drivers

* Course search from the catalog endpoint stays a read of the Course collection.
* Creating and changing a request are mutations, so they run inside `EnrollmentRequestUnitOfWork`.
* Listing and fetching a request are reads, so they use `EnrollmentRequestReadRepo`.
* HTTP status codes stay in the REST adapter. The application service throws a stable error code.

## Considered Options

* Store enrollment requests in the REST handler.
* Model `EnrollmentRequest` as its own aggregate with `statusHistory` on the document.

## Decision Outcome

Chosen option: "Model EnrollmentRequest as its own aggregate", because duplicate checks, status transitions, and the audit trail belong on the request, not on the course.

`POST /api/enrollment-requests` creates a `pending` request only when the course exists and is `active`. `PATCH /api/enrollment-requests/:id/status` allows `pending` to `approved`, `rejected`, or `cancelled`, and `approved` to `cancelled`. Rejection requires a reason. Each creation and status change appends a `statusHistory` entry.

## Consequences

* The API inserts `enrollmentRequestSeed` into the EnrollmentRequest collection at startup and reads it back through `GET /api/enrollment-requests/:id`.
* `changedBy` is the identifier sent by the caller. This sample does not authenticate reviewers.
* The duplicate check reads the collection, then inserts. Two simultaneous creates for the same learner and course can both succeed.
* Request and course ids are MongoDB ObjectId strings.
