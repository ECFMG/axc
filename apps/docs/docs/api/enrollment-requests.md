# Enrollment requests

A learner can request enrollment in an active course. Reviewers approve, reject, or cancel that request. Storage is in-memory and resets when the API process restarts. These routes are anonymous, same as the rest of this sample API.

New requests start as `pending`. Creation and every status change append a `statusHistory` entry. `changedBy` is `system` on creation.

A learner cannot have more than one `pending` or `approved` request for the same course. `rejected` and `cancelled` requests do not block a new request. Email comparison is case-insensitive.

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
| `learnerEmail` | Required valid email address. |
| `justification` | Required. 20 to 500 characters. |

`201` returns the created request:

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

## Read one

```http
GET /api/enrollment-requests/enroll-001
```

`200` returns the request, including `statusHistory`.

## List

```http
GET /api/enrollment-requests?status=pending&courseId=course-001&learnerEmail=learner@example.org
```

All filters are optional and combine with and. `status` must be `pending`, `approved`, `rejected`, or `cancelled` when present. `200` returns a JSON array. An empty result is `[]`.

## Update status

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
| `status` | Required. `pending`, `approved`, `rejected`, or `cancelled`. |
| `changedBy` | Required non-empty reviewer or operator id. |
| `reason` | Required non-empty text when status is `rejected`. |

Allowed transitions:

| From | To |
| --- | --- |
| `pending` | `approved`, `rejected`, `cancelled` |
| `approved` | `cancelled` |

`200` returns the updated request. The new `statusHistory` entry records `fromStatus`, `toStatus`, `changedAt`, `changedBy`, and `reason` (`null` when no reason was stored).

## Errors

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
| Invalid email, justification, status, or missing rejection reason | 400 | `INVALID_REQUEST` |
| Course does not exist | 404 | `COURSE_NOT_FOUND` |
| Enrollment request does not exist | 404 | `ENROLLMENT_REQUEST_NOT_FOUND` |
| Course is not active | 409 | `COURSE_NOT_ACTIVE` |
| Duplicate pending or approved request | 409 | `DUPLICATE_ACTIVE_REQUEST` |
| Status transition is not allowed | 409 | `INVALID_STATUS_TRANSITION` |
