# Enrollment requests

Learners request enrollment in an active course. Reviewers approve, reject, or cancel those requests. The API does not authenticate callers. `changedBy` is the reviewer or operator identifier supplied in the status-change body. Creation records `changedBy` as `system`.

Data is stored in memory and is discarded when the API process restarts.

## Create an enrollment request

`POST /api/enrollment-requests`

Request body:

```json
{
  "courseId": "course-001",
  "learnerEmail": "learner@example.org",
  "justification": "I need this course to prepare for upcoming secure development work."
}
```

| Field | Rule |
| --- | --- |
| `courseId` | Required. Must be the id of an existing course whose status is `active`. |
| `learnerEmail` | Required. Must be an email address. Comparison for duplicates and filters is case-insensitive. |
| `justification` | Required. 20–500 characters. Leading and trailing spaces count. |

A supplied `id`, `status`, or `changedBy` is ignored. The new request is always `pending`.

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

Ids are assigned as `enroll-001`, `enroll-002`, and so on for the life of the process.

A learner may have at most one `pending` or `approved` request for the same course. A `rejected` or `cancelled` request does not block a new one. A different course, or a different learner email, is a separate request.

## Get an enrollment request

```http
GET /api/enrollment-requests/enroll-001
```

`200` returns the request, including `statusHistory`. An unknown id returns `404`.

## List enrollment requests

```http
GET /api/enrollment-requests?status=pending&courseId=course-001&learnerEmail=learner@example.org
```

Every filter is optional. Filters combine with AND. `learnerEmail` matches case-insensitively. `status` must be `pending`, `approved`, `rejected`, or `cancelled` when it is present.

`200` response:

```json
{
  "items": []
}
```

Items are ordered by `createdAt`, then `id`. There is no pagination. No matches return `200` and an empty `items` array.

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

| Field | Rule |
| --- | --- |
| `status` | Required. `pending`, `approved`, `rejected`, or `cancelled`. |
| `changedBy` | Required non-empty reviewer or operator identifier. |
| `reason` | Required and non-empty when `status` is `rejected`. Optional otherwise. A blank value is treated as absent. |

`200` returns the updated request. `updatedAt` changes, and one `statusHistory` entry is appended.

| From | To |
| --- | --- |
| `pending` | `approved`, `rejected`, or `cancelled` |
| `approved` | `cancelled` |
| `rejected` | none |
| `cancelled` | none |

Any other transition, including repeating the current status, returns `409` and does not change the request.

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

| Situation | HTTP | `error.code` |
| --- | --- | --- |
| Course does not exist | 404 | `COURSE_NOT_FOUND` |
| Course is not `active` | 409 | `COURSE_NOT_ACTIVE` |
| Invalid email, justification, status, `changedBy`, or JSON body | 400 | `INVALID_REQUEST` |
| Duplicate `pending` or `approved` request for the learner and course | 409 | `DUPLICATE_ACTIVE_REQUEST` |
| Request id does not exist | 404 | `ENROLLMENT_REQUEST_NOT_FOUND` |
| Status transition is not allowed | 409 | `INVALID_STATUS_TRANSITION` |
| Rejection without a non-empty reason | 400 | `INVALID_REQUEST` |

`details` lists the fields that failed. A failed validation or a rejected transition does not add a history entry.

## Examples

```bash
curl -s -X POST https://api.agentcourses.localhost/api/enrollment-requests \
  -H 'content-type: application/json' \
  -d '{"courseId":"course-001","learnerEmail":"learner@example.org","justification":"I need this course to prepare for upcoming secure development work."}'

curl -s https://api.agentcourses.localhost/api/enrollment-requests/enroll-001

curl -s "https://api.agentcourses.localhost/api/enrollment-requests?status=pending&courseId=course-001&learnerEmail=learner@example.org"

curl -s -X PATCH https://api.agentcourses.localhost/api/enrollment-requests/enroll-001/status \
  -H 'content-type: application/json' \
  -d '{"status":"approved","changedBy":"reviewer@example.org"}'
```

Local `pnpm run dev` publishes the API through portless at `https://api.agentcourses.localhost`.
