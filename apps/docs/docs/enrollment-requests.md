# Enrollment requests

A learner submits an enrollment request for an active course; a reviewer approves, rejects or cancels it. Every creation and status change appends an entry to `statusHistory`. Requests live in memory for the lifetime of the API process.

## Model

| Field | Type | Notes |
| --- | --- | --- |
| `id` | string | Generated UUID. |
| `courseId` | string | References an existing course with status `active`. |
| `learnerEmail` | string | Valid email address. |
| `justification` | string | 20–500 characters. |
| `status` | `pending` \| `approved` \| `rejected` \| `cancelled` | Starts as `pending`. |
| `createdAt` / `updatedAt` | string | ISO-8601. |
| `statusHistory` | array | Audit trail, oldest first. |

A `statusHistory` entry carries `fromStatus` (`null` on creation), `toStatus`, `changedAt`, `changedBy` and `reason` (`null` unless supplied; required for rejection).

## Create a request

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

`201` with the created request:

```json
{
  "id": "0f8d6b1c-6f1c-4f7b-9f4d-6a3f0a2c6d11",
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

A learner may hold only one `pending` or `approved` request per course. Once a request is `rejected` or `cancelled`, the learner may submit a new one.

## Retrieve a request

```http
GET /api/enrollment-requests/{id}
```

`200` with the request, including its `statusHistory`. Unknown ids return `404` `ENROLLMENT_REQUEST_NOT_FOUND`.

## List requests

```http
GET /api/enrollment-requests?status=pending&courseId=course-001&learnerEmail=learner@example.org
```

All three filters are optional and combine with AND; `learnerEmail` matches case-insensitively. `200` with `{ "items": [ ... ] }`, oldest first. An unsupported `status` returns `400` `INVALID_QUERY_PARAMETER`.

## Update status

```http
PATCH /api/enrollment-requests/{id}/status
```

```json
{ "status": "approved", "changedBy": "reviewer@example.org" }
```

```json
{ "status": "rejected", "changedBy": "reviewer@example.org", "reason": "Learner has not completed the prerequisite course." }
```

`status` and `changedBy` are required; `reason` is required when `status` is `rejected`. `200` with the updated request, carrying one more `statusHistory` entry.

Allowed transitions:

| From | To |
| --- | --- |
| `pending` | `approved`, `rejected`, `cancelled` |
| `approved` | `cancelled` |
| `rejected`, `cancelled` | — terminal |

## Errors

All errors use the shared envelope `{ "error": { "code", "message", "details" } }`.

| Scenario | Status | Code |
| --- | --- | --- |
| Course does not exist | 404 | `COURSE_NOT_FOUND` |
| Course is not active | 409 | `COURSE_NOT_ACTIVE` |
| Invalid learner email, short/long justification, missing `courseId` | 400 | `INVALID_REQUEST` |
| Duplicate pending or approved request | 409 | `DUPLICATE_ACTIVE_REQUEST` |
| Request not found | 404 | `ENROLLMENT_REQUEST_NOT_FOUND` |
| Invalid status value, missing `changedBy`, rejection without reason | 400 | `INVALID_REQUEST` |
| Unsupported `status` filter | 400 | `INVALID_QUERY_PARAMETER` |
| Invalid status transition | 409 | `INVALID_STATUS_TRANSITION` |

```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "The request could not be completed.",
    "details": [
      { "field": "justification", "message": "justification must be between 20 and 500 characters." }
    ]
  }
}
```

## Example

```bash
curl -s -X POST https://api.agentcourses.localhost/api/enrollment-requests \
  -H 'Content-Type: application/json' \
  -d '{"courseId":"course-001","learnerEmail":"learner@example.org","justification":"I need this course to prepare for upcoming secure development work."}'
```
