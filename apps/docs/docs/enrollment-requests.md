# Enrollment requests

Learners can request enrollment in an active course. Reviewers can approve, reject, or cancel those requests. Duplicate pending or approved requests for the same learner and course are not allowed.

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

| Field | Required | Description |
| --- | --- | --- |
| `courseId` | Yes | Must reference an existing course with status `active`. |
| `learnerEmail` | Yes | Valid email address. |
| `justification` | Yes | 20–500 characters. |

Successful response: `201` with the created request. New requests start as `pending` and include an initial `statusHistory` entry.

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

Successful response: `200` with the request, including `statusHistory`.

## List enrollment requests

```http
GET /api/enrollment-requests?status=pending&courseId=course-001&learnerEmail=learner@example.org
```

| Parameter | Required | Description |
| --- | --- | --- |
| `status` | No | `pending`, `approved`, `rejected`, or `cancelled`. |
| `courseId` | No | Exact course identifier. |
| `learnerEmail` | No | Case-insensitive learner email. |

Successful response: `200` with `{ "items": [ ... ] }`.

## Update enrollment request status

```http
PATCH /api/enrollment-requests/enroll-001/status
```

Valid transitions: `pending` → `approved`, `pending` → `rejected`, `pending` → `cancelled`, and `approved` → `cancelled`.

Approval body:

```json
{
  "status": "approved",
  "changedBy": "reviewer@example.org"
}
```

Rejection body:

```json
{
  "status": "rejected",
  "changedBy": "reviewer@example.org",
  "reason": "Learner has not completed the prerequisite course."
}
```

| Field | Required | Description |
| --- | --- | --- |
| `status` | Yes | Target status. |
| `changedBy` | Yes | Reviewer or operator identifier. |
| `reason` | Required for rejection | Non-empty reason recorded on the history entry. |

Successful response: `200` with the updated request. Every status change appends a `statusHistory` entry.

## Error response

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
| Course does not exist | 404 | `COURSE_NOT_FOUND` |
| Course is not active | 409 | `COURSE_NOT_ACTIVE` |
| Invalid learner email | 400 | `INVALID_REQUEST` |
| Justification too short or too long | 400 | `INVALID_REQUEST` |
| Duplicate pending or approved request | 409 | `DUPLICATE_ACTIVE_REQUEST` |
| Request not found | 404 | `ENROLLMENT_REQUEST_NOT_FOUND` |
| Invalid status value | 400 | `INVALID_REQUEST` |
| Invalid status transition | 409 | `INVALID_STATUS_TRANSITION` |
| Rejection without reason | 400 | `INVALID_REQUEST` |

## Examples

```bash
curl -s -X POST "https://api.agentcourses.localhost/api/enrollment-requests" \
  -H "Content-Type: application/json" \
  -d '{"courseId":"course-001","learnerEmail":"learner@example.org","justification":"I need this course to prepare for upcoming secure development work."}'

curl -s "https://api.agentcourses.localhost/api/enrollment-requests?status=pending&courseId=course-001"

curl -s -X PATCH "https://api.agentcourses.localhost/api/enrollment-requests/enroll-001/status" \
  -H "Content-Type: application/json" \
  -d '{"status":"approved","changedBy":"reviewer@example.org"}'
```
