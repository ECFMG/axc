# Enrollment requests

A learner asks to enroll in an active course. A reviewer approves, rejects, or cancels the request. Each create and status change appends `statusHistory`.

These routes are anonymous, same as the sample healthcheck. Do not send secrets in `justification`.

## Create

`POST /api/enrollment-requests`

```json
{
  "courseId": "course-001",
  "learnerEmail": "learner@example.org",
  "justification": "I need this course to prepare for upcoming secure development work."
}
```

| Field | Rule |
| --- | --- |
| `courseId` | Required. The course must exist and have status `active`. |
| `learnerEmail` | Required valid email. Stored lowercased, with surrounding space removed. |
| `justification` | Required. 20 to 500 characters. |

`201` returns the pending request:

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

A learner cannot hold more than one `pending` or `approved` request for the same course. `rejected` and `cancelled` requests do not block a new request. Email comparison is case-insensitive.

## Read one

```http
GET /api/enrollment-requests/enroll-001
```

`200` returns the request, including `statusHistory`.

## List

```http
GET /api/enrollment-requests?status=pending&courseId=course-001&learnerEmail=learner@example.org
```

All filters are optional. They combine with AND. `learnerEmail` is compared after lowercasing. `200` returns:

```json
{
  "items": []
}
```

Items are ordered by `createdAt`, then `id`.

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
| `status` | `pending`, `approved`, `rejected`, or `cancelled`. |
| `changedBy` | Required reviewer or operator identifier. |
| `reason` | Required and non-empty when `status` is `rejected`. Optional otherwise. |

Allowed transitions:

| From | To |
| --- | --- |
| `pending` | `approved`, `rejected`, `cancelled` |
| `approved` | `cancelled` |

`200` returns the updated request. The new `statusHistory` entry records `fromStatus`, `toStatus`, `changedAt`, `changedBy`, and `reason`.

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

| Situation | HTTP | `error.code` |
| --- | --- | --- |
| Invalid email, justification, status, or missing rejection reason | 400 | `INVALID_REQUEST` |
| Course does not exist | 404 | `COURSE_NOT_FOUND` |
| Request does not exist | 404 | `ENROLLMENT_REQUEST_NOT_FOUND` |
| Course is not active | 409 | `COURSE_NOT_ACTIVE` |
| Learner already has a pending or approved request for the course | 409 | `DUPLICATE_ACTIVE_REQUEST` |
| Status transition is not allowed | 409 | `INVALID_STATUS_TRANSITION` |

A body that is not JSON returns 400 with field `body`.

Data lives in process memory and is cleared when the API process stops. See [enrollment request storage](../adr/enrollment-request-storage).
