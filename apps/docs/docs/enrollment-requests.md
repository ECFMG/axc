# Enrollment requests

Enrollment requests let a learner ask to join an active course. Reviewers approve, reject, or cancel those requests. The in-memory store is composed by `@apps/api`.

## Create an enrollment request

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
| `justification` | Yes | 20 to 500 characters after trimming. |

Successful response is `201` with the created request. New requests start as `pending` and include a `statusHistory` entry from `null` to `pending` by `system`.

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

A learner may not have more than one `pending` or `approved` request for the same course.

## Get an enrollment request by ID

```http
GET /api/enrollment-requests/enroll-001
```

Successful response is `200` with the request, including `statusHistory`.

## List enrollment requests

```http
GET /api/enrollment-requests?status=pending&courseId=course-001&learnerEmail=learner@example.org
```

| Query parameter | Required | Notes |
| --- | --- | --- |
| `status` | No | `pending`, `approved`, `rejected`, or `cancelled`. |
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

| Field | Required | Notes |
| --- | --- | --- |
| `status` | Yes | Target status. |
| `changedBy` | Yes | Reviewer or operator identifier. |
| `reason` | Required when `status` is `rejected` | Non-empty string. Optional for other transitions. |

Valid transitions:

- `pending` → `approved`
- `pending` → `rejected`
- `pending` → `cancelled`
- `approved` → `cancelled`

Every status change appends a `statusHistory` entry.

## Error response

Errors use the same envelope as course search:

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

| Scenario | Status | Code |
| --- | --- | --- |
| Invalid body, email, justification, or status value | 400 | `INVALID_REQUEST` |
| Invalid list query `status` | 400 | `INVALID_QUERY_PARAMETER` |
| Course does not exist | 404 | `COURSE_NOT_FOUND` |
| Enrollment request does not exist | 404 | `ENROLLMENT_REQUEST_NOT_FOUND` |
| Course is not `active` | 409 | `COURSE_NOT_ACTIVE` |
| Duplicate pending or approved request | 409 | `DUPLICATE_ACTIVE_REQUEST` |
| Invalid status transition | 409 | `INVALID_STATUS_TRANSITION` |
| Rejection without a non-empty reason | 400 | `INVALID_REQUEST` |

## Examples

```bash
curl -s -X POST "https://api.agentcourses.localhost/api/enrollment-requests" \
  -H "content-type: application/json" \
  -d '{"courseId":"course-001","learnerEmail":"learner@example.org","justification":"I need this course to prepare for upcoming secure development work."}'

curl -s "https://api.agentcourses.localhost/api/enrollment-requests/enroll-001"

curl -s "https://api.agentcourses.localhost/api/enrollment-requests?status=pending"

curl -s -X PATCH "https://api.agentcourses.localhost/api/enrollment-requests/enroll-001/status" \
  -H "content-type: application/json" \
  -d '{"status":"approved","changedBy":"reviewer@example.org"}'
```

Local `pnpm run dev` publishes the API through portless at `https://api.agentcourses.localhost`. A git worktree named `feature-a` uses `https://api.agentcourses.feature-a.localhost` when `WORKTREE_NAME=feature-a`.
