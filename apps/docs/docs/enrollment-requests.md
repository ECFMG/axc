---
id: enrollment-requests
title: Enrollment requests
---

# Enrollment requests

A learner requests a seat on an **active** course; reviewers approve, reject or cancel it.
Data is held in memory for the lifetime of the API process.

## EnrollmentRequest

| Field | Type | Notes |
| --- | --- | --- |
| `id` | string | `enroll-001`, `enroll-002`, … |
| `courseId` | string | Existing course with status `active` |
| `learnerEmail` | string | Valid email, stored lower-case |
| `justification` | string | 20–500 characters (trimmed) |
| `status` | enum | `pending`, `approved`, `rejected`, `cancelled` |
| `createdAt` / `updatedAt` | ISO string | |
| `statusHistory` | array | One entry per creation and status change |

`statusHistory` entry: `fromStatus` (`null` on creation), `toStatus`, `changedAt`, `changedBy` (`system` on creation), `reason` (`null` unless given).

## POST /api/enrollment-requests

```json
{
  "courseId": "course-001",
  "learnerEmail": "learner@example.org",
  "justification": "I need this course to prepare for upcoming secure development work."
}
```

`201` returns the new request with `status: "pending"`:

```json
{
  "id": "enroll-001",
  "courseId": "course-001",
  "learnerEmail": "learner@example.org",
  "justification": "I need this course to prepare for upcoming secure development work.",
  "status": "pending",
  "createdAt": "2026-06-27T10:00:00.000Z",
  "updatedAt": "2026-06-27T10:00:00.000Z",
  "statusHistory": [
    { "fromStatus": null, "toStatus": "pending", "changedAt": "2026-06-27T10:00:00.000Z", "changedBy": "system", "reason": null }
  ]
}
```

A learner may hold at most one `pending` or `approved` request per course.

## GET /api/enrollment-requests/:id

`200` with the request (including `statusHistory`), or `404`.

## GET /api/enrollment-requests

Optional filters, combined with AND: `status`, `courseId`, `learnerEmail` (case-insensitive).
`200` returns a JSON array of requests.

```bash
curl "http://localhost:7071/api/enrollment-requests?status=pending&courseId=course-001&learnerEmail=learner@example.org"
```

## PATCH /api/enrollment-requests/:id/status

```json
{ "status": "rejected", "changedBy": "reviewer@example.org", "reason": "Learner has not completed the prerequisite course." }
```

`changedBy` is required; `reason` is required (non-blank) for `rejected`, optional otherwise.
`200` returns the updated request with a new `statusHistory` entry.

Allowed transitions:

| From | To |
| --- | --- |
| `pending` | `approved`, `rejected`, `cancelled` |
| `approved` | `cancelled` |

## Errors

```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "The request could not be completed.",
    "details": [{ "field": "justification", "message": "justification must be between 20 and 500 characters." }]
  }
}
```

| Case | Status | Code |
| --- | --- | --- |
| Invalid body, email, justification, status value, missing `changedBy`, rejection without reason, invalid `status` filter | 400 | `INVALID_REQUEST` |
| Course does not exist | 404 | `COURSE_NOT_FOUND` |
| Request does not exist | 404 | `ENROLLMENT_REQUEST_NOT_FOUND` |
| Course is draft or retired | 409 | `COURSE_NOT_ACTIVE` |
| Learner already has a pending/approved request for the course | 409 | `DUPLICATE_ACTIVE_REQUEST` |
| Transition not in the table above | 409 | `INVALID_STATUS_TRANSITION` |
