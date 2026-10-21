---
title: Enrollment Requests API
---

# Enrollment Requests API

This sample API stores requests in memory for the application factory lifetime. A process restart clears requests. Each worker has its own store; this sample does not provide durable or cross-worker uniqueness. No authentication is added. `changedBy` is a supplied operator identifier, not an authenticated identity.

## Create

`POST /api/enrollment-requests` returns **201** with the created request.

```json
{
  "courseId": "course-001",
  "learnerEmail": "learner@example.org",
  "justification": "I need this course to prepare for secure development work."
}
```

The course must exist and be active. Email is trimmed and lowercased for storage, filtering, and duplicate checks. Email validation checks common unquoted ASCII address syntax without checking deliverability. Justification is trimmed and must contain 20–500 JavaScript string units. Client-supplied IDs, status, timestamps, and audit history are ignored. Every request starts pending.

```json
{
  "id": "enroll-2c16e3b2-f0f6-4d30-b5f4-e4d761329965",
  "courseId": "course-001",
  "learnerEmail": "learner@example.org",
  "justification": "I need this course to prepare for secure development work.",
  "status": "pending",
  "createdAt": "2026-10-21T13:00:00.000Z",
  "updatedAt": "2026-10-21T13:00:00.000Z",
  "statusHistory": [
    { "fromStatus": null, "toStatus": "pending", "changedAt": "2026-10-21T13:00:00.000Z", "changedBy": "system", "reason": null }
  ]
}
```

A learner can have only one pending or approved request per course. Rejected or cancelled requests allow a new request. A learner can request different courses.

## Retrieve

`GET /api/enrollment-requests/:id` returns **200** with the complete request, including `statusHistory`, in the same shape as creation.

## List

`GET /api/enrollment-requests?status=pending&courseId=course-001&learnerEmail=learner@example.org` returns **200** with a JSON array of complete requests. Empty results return `[]`.

All filters are optional and combine with AND. Status accepts `pending`, `approved`, `rejected`, or `cancelled`. `courseId` matches exactly after trimming. `learnerEmail` uses the same normalization and validation as creation. Empty, invalid, or repeated recognized filters return 400. Unknown query fields are ignored. Results follow creation order; no pagination is specified for this sample endpoint.

## Change status

`PATCH /api/enrollment-requests/:id/status` returns **200** with the complete updated request.

```json
{ "status": "approved", "changedBy": "reviewer@example.org" }
```

```json
{ "status": "rejected", "changedBy": "reviewer@example.org", "reason": "Prerequisite course is incomplete." }
```

`changedBy` must be a non-empty string. Rejection requires a non-empty reason after trimming. Reason is optional for other transitions; an omitted or null reason is recorded as null. A supplied string reason must be non-empty. Malformed JSON and non-object bodies return 400.

Allowed transitions:

| Current | Allowed next status |
| --- | --- |
| pending | approved, rejected, cancelled |
| approved | cancelled |
| rejected | none |
| cancelled | none |

Every successful change appends one history entry containing `fromStatus`, `toStatus`, `changedAt`, `changedBy`, and `reason`; updates `updatedAt`; and preserves `createdAt` and earlier history. Failed validation, duplicates, and invalid transitions do not change stored requests or history. Same-status updates return 409.

For example, approval appends:

```json
{ "fromStatus": "pending", "toStatus": "approved", "changedAt": "2026-10-21T13:01:00.000Z", "changedBy": "reviewer@example.org", "reason": null }
```

## Errors

All enrollment errors use this envelope:

```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "The request could not be completed.",
    "details": [{ "field": "justification", "message": "justification must be between 20 and 500 characters." }]
  }
}
```

Validation details identify the invalid field. Business-rule errors use an empty `details` array. Unexpected errors return a generic 500 response without internal exception details.

| Scenario | HTTP | Code |
| --- | --- | --- |
| Missing course | 404 | COURSE_NOT_FOUND |
| Draft or retired course | 409 | COURSE_NOT_ACTIVE |
| Invalid body, email, justification, filter, status, operator, or rejection reason | 400 | INVALID_REQUEST |
| Existing pending or approved learner/course request | 409 | DUPLICATE_ACTIVE_REQUEST |
| Missing enrollment request | 404 | ENROLLMENT_REQUEST_NOT_FOUND |
| Disallowed transition, including same status | 409 | INVALID_STATUS_TRANSITION |
| Unexpected server error | 500 | INTERNAL_ERROR |

For updates, body validation precedes request lookup, followed by transition validation. Invalid status values return 400; valid status values used in disallowed transitions return 409.
