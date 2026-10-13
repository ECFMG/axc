# Enrollment requests

Enrollment requests let a learner ask to join an active course. Reviewers approve, reject, or cancel those requests. HTTP capabilities are composed by `@apps/api` and served through Hono routes in `@axc/rest`.

New requests start as `pending`. A learner may not have more than one `pending` or `approved` request for the same course. Every create and status change appends a `statusHistory` entry.

## Create enrollment request

```http
POST /api/enrollment-requests
```

Request body:

```json
{
  "courseId": "course-001",
  "learnerEmail": "learner@example.org",
  "justification": "I need this course to prepare for upcoming secure development work."
}
```

| Field | Required | Notes |
| --- | --- | --- |
| `courseId` | Yes | Must reference an existing course with status `active`. |
| `learnerEmail` | Yes | Valid email address. Stored in lowercase. |
| `justification` | Yes | 20–500 characters after trimming. |

Successful response is `201`:

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

## Get enrollment request by ID

```http
GET /api/enrollment-requests/enroll-001
```

Successful response is `200` with the enrollment request, including `statusHistory`.

## List enrollment requests

```http
GET /api/enrollment-requests?status=pending&courseId=course-001&learnerEmail=learner@example.org
```

| Query parameter | Required | Notes |
| --- | --- | --- |
| `status` | No | One of `pending`, `approved`, `rejected`, `cancelled`. |
| `courseId` | No | Exact course id. |
| `learnerEmail` | No | Case-insensitive email match. |

Successful response is `200`:

```json
{
  "items": [
    {
      "id": "enroll-001",
      "courseId": "course-001",
      "learnerEmail": "learner@example.org",
      "justification": "I need this course to prepare for upcoming secure development work.",
      "status": "pending",
      "createdAt": "2026-06-27T10:00:00.000Z",
      "updatedAt": "2026-06-27T10:00:00.000Z",
      "statusHistory": []
    }
  ]
}
```

## Update enrollment request status

```http
PATCH /api/enrollment-requests/enroll-001/status
```

Valid transitions:

| From | To |
| --- | --- |
| `pending` | `approved` |
| `pending` | `rejected` |
| `pending` | `cancelled` |
| `approved` | `cancelled` |

Request body for approval:

```json
{
  "status": "approved",
  "changedBy": "reviewer@example.org"
}
```

Request body for rejection:

```json
{
  "status": "rejected",
  "changedBy": "reviewer@example.org",
  "reason": "Learner has not completed the prerequisite course."
}
```

| Field | Required | Notes |
| --- | --- | --- |
| `status` | Yes | Target status. |
| `changedBy` | Yes | Reviewer or operator identifier stored on the history entry. |
| `reason` | Required when `status` is `rejected` | Non-empty string. Optional for other transitions. |

Successful response is `200` with the updated enrollment request. The new `statusHistory` entry uses `fromStatus` of the previous status and `toStatus` of the requested status.

## Error response

All enrollment request errors use the same envelope as course search:

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

| Scenario | HTTP status | Error code |
| --- | --- | --- |
| Invalid JSON or field validation (`learnerEmail`, `justification`, `status`, `reason`) | `400` | `INVALID_REQUEST` |
| Invalid list `status` query parameter | `400` | `INVALID_QUERY_PARAMETER` |
| Course does not exist | `404` | `COURSE_NOT_FOUND` |
| Enrollment request does not exist | `404` | `ENROLLMENT_REQUEST_NOT_FOUND` |
| Course is not `active` | `409` | `COURSE_NOT_ACTIVE` |
| Duplicate pending or approved request for the same learner and course | `409` | `DUPLICATE_ACTIVE_REQUEST` |
| Invalid status transition | `409` | `INVALID_STATUS_TRANSITION` |

## Example

```bash
curl -s -X POST 'https://api.agentcourses.localhost/api/enrollment-requests' \
  -H 'Content-Type: application/json' \
  -d '{"courseId":"course-001","learnerEmail":"learner@example.org","justification":"I need this course to prepare for upcoming secure development work."}'
```

Local `pnpm run dev` publishes the API through portless at `https://api.agentcourses.localhost`. A git worktree named `feature-a` uses `https://api.agentcourses.feature-a.localhost` when `WORKTREE_NAME=feature-a`.
