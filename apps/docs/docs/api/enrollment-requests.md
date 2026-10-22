---
title: Enrollment requests
---

# Enrollment requests

A learner asks to enroll in an active course. Reviewers approve, reject, or cancel the request. Each create and status change appends `statusHistory`.

The catalog is process-local memory. Restarting the API clears requests. Course fixtures stay.

## Create

```http
POST /api/enrollment-requests
```

```json
{
  "courseId": "course-001",
  "learnerEmail": "learner@example.org",
  "justification": "I need this course to prepare for upcoming secure development work."
}
```

| Field | Rule |
| --- | --- |
| `courseId` | Required. Must be an existing course with status `active`. |
| `learnerEmail` | Required valid email. Stored trimmed. Compared case-insensitively. |
| `justification` | Required. 20 to 500 characters after trimming. |

Only these three fields are accepted. A new request is `pending`. The first history entry uses `changedBy: "system"`, `fromStatus: null`, and `reason: null`. Identifiers look like `enroll-001`.

`200` returns the created request:

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
    {
      "fromStatus": null,
      "toStatus": "pending",
      "changedAt": "2026-06-27T10:00:00.000Z",
      "changedBy": "system",
      "reason": null
    }
  ]
}
```

A learner may have at most one `pending` or `approved` request for the same course. `rejected` and `cancelled` do not block a new request.

## Read one

```http
GET /api/enrollment-requests/enroll-001
```

`200` returns the same object shape as create, including `statusHistory`.

## List

```http
GET /api/enrollment-requests?status=pending&courseId=course-001&learnerEmail=learner@example.org
```

All filters are optional and combine with AND. `status` is `pending`, `approved`, `rejected`, or `cancelled`. `courseId` and `learnerEmail` match one value; email is case-insensitive. Results are ordered by `createdAt`, then `id`.

```json
{
  "items": []
}
```

An unknown course id or email returns an empty `items` array, not an error.

## Change status

```http
PATCH /api/enrollment-requests/enroll-001/status
```

Approval:

```json
{
  "status": "approved",
  "changedBy": "reviewer@example.org"
}
```

Rejection:

```json
{
  "status": "rejected",
  "changedBy": "reviewer@example.org",
  "reason": "Learner has not completed the prerequisite course."
}
```

| Field | Rule |
| --- | --- |
| `status` | `pending`, `approved`, `rejected`, or `cancelled`. |
| `changedBy` | Required non-empty reviewer or operator id. |
| `reason` | Required and non-empty when rejecting. Optional otherwise. Stored trimmed, or `null` when omitted. |

Allowed transitions:

| From | To |
| --- | --- |
| `pending` | `approved`, `rejected`, `cancelled` |
| `approved` | `cancelled` |
| `rejected` | none |
| `cancelled` | none |

`200` returns the updated request. The new history entry records the previous status, the new status, `changedBy`, and `reason`.

## Errors

Every error uses this body. `message` is `The request could not be completed.`

```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "The request could not be completed.",
    "details": [
      {
        "field": "justification",
        "message": "justification must be between 20 and 500 characters."
      }
    ]
  }
}
```

| Situation | Status | Code |
| --- | --- | --- |
| Invalid email, justification, status, body, or list filter | 400 | `INVALID_REQUEST` |
| Course does not exist | 404 | `COURSE_NOT_FOUND` |
| Request does not exist | 404 | `ENROLLMENT_REQUEST_NOT_FOUND` |
| Course is draft or retired | 409 | `COURSE_NOT_ACTIVE` |
| Learner already has a pending or approved request for the course | 409 | `DUPLICATE_ACTIVE_REQUEST` |
| Status change is not one of the allowed transitions | 409 | `INVALID_STATUS_TRANSITION` |
| Rejection omits `reason` or sends a blank reason | 400 | `INVALID_REQUEST` |

Body validation runs before the request lookup. A malformed status change for an unknown id returns 400.

## Example

```bash
curl -s -X POST https://api.agentcourses.localhost/api/enrollment-requests \
  -H 'content-type: application/json' \
  -d '{"courseId":"course-001","learnerEmail":"learner@example.org","justification":"I need this course to prepare for upcoming secure development work."}'
```
