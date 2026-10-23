# Enrollment requests

Learners request a seat in an active course. Reviewers approve, reject, or cancel that request. The store is in memory for the life of the process. There is no authentication; `changedBy` is the caller-supplied reviewer id, and creation is recorded as `system`.

A learner email is trimmed and stored in lower case. A learner may have at most one `pending` or `approved` request for the same course. `rejected` and `cancelled` requests do not block a new one.

## Request

Create:

```http
POST /api/enrollment-requests
Content-Type: application/json

{
  "courseId": "course-001",
  "learnerEmail": "learner@example.org",
  "justification": "I need this course to prepare for upcoming secure development work."
}
```

`courseId` must name an existing course. `learnerEmail` must be an email address. `justification` must be 20 to 500 characters. The new status is `pending`.

Read one:

```http
GET /api/enrollment-requests/enroll-001
```

List, with optional filters `status`, `courseId`, and `learnerEmail`:

```http
GET /api/enrollment-requests?status=pending&courseId=course-001&learnerEmail=learner@example.org
```

Change status:

```http
PATCH /api/enrollment-requests/enroll-001/status
Content-Type: application/json

{
  "status": "rejected",
  "changedBy": "reviewer@example.org",
  "reason": "Learner has not completed the prerequisite course."
}
```

Allowed transitions are `pending` to `approved`, `pending` to `rejected`, `pending` to `cancelled`, and `approved` to `cancelled`. Rejection requires a non-empty `reason`. `changedBy` is required.

## Response

`201` creates a request. `200` returns one request or a list. Every creation and status change appends `statusHistory`. `fromStatus` is `null` on creation. `reason` is `null` when none was stored.

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

List body:

```json
{
  "items": []
}
```

Errors use this body. Field messages name the invalid input.

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
| Course does not exist | 404 | `COURSE_NOT_FOUND` |
| Course is not active | 409 | `COURSE_NOT_ACTIVE` |
| Invalid email, justification, status, or missing rejection reason | 400 | `INVALID_REQUEST` |
| Duplicate pending or approved request | 409 | `DUPLICATE_ACTIVE_REQUEST` |
| Request id not found | 404 | `ENROLLMENT_REQUEST_NOT_FOUND` |
| Status transition is not allowed | 409 | `INVALID_STATUS_TRANSITION` |

## Example

`POST /api/enrollment-requests` with the create body above returns `201` and a `pending` request whose first history entry has `fromStatus: null` and `changedBy: "system"`.

`PATCH /api/enrollment-requests/enroll-001/status` with `status: "approved"` and `changedBy: "reviewer@example.org"` returns the same request with status `approved` and a second history entry. A later `cancelled` patch adds a third entry. Patching that approved request to `rejected` returns `409` `INVALID_STATUS_TRANSITION`.
