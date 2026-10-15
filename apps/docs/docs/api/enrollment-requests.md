# Enrollment requests

A learner can request enrollment in an active course. Reviewers approve, reject, or cancel that request. The API keeps one `statusHistory` entry for creation and one for every later status change.

Storage is in memory and resets when the API process restarts. `changedBy` is the caller-supplied identifier. This sample does not authenticate it.

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
| `learnerEmail` | Required. Must contain a local part, `@`, and a dotted domain. Compared case-insensitively. |
| `justification` | Required. 20 to 500 characters. Length is the raw string. |

`201` returns the new request. Status is `pending`. The first history entry uses `fromStatus: null`, `toStatus: "pending"`, and `changedBy: "system"`.

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

Ids are `enroll-001`, `enroll-002`, and so on for the life of the process.

A learner cannot hold more than one `pending` or `approved` request for the same course. A `rejected` or `cancelled` request does not block a new one.

## Read one

```http
GET /api/enrollment-requests/enroll-001
```

`200` returns the request, including `statusHistory`.

## List

```http
GET /api/enrollment-requests?status=pending&courseId=course-001&learnerEmail=learner@example.org
```

Every filter is optional. Filters combine with AND. `learnerEmail` matches case-insensitively.

`200`:

```json
{
  "items": []
}
```

`status` must be `pending`, `approved`, `rejected`, or `cancelled` when present.

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
| `changedBy` | Required non-empty string. |
| `reason` | Required and non-empty when `status` is `rejected`. Optional otherwise. Stored as `null` when omitted. |

Valid transitions:

| From | To |
| --- | --- |
| `pending` | `approved`, `rejected`, `cancelled` |
| `approved` | `cancelled` |

`200` returns the updated request. `updatedAt` changes, and one history entry is appended.

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
| Course does not exist | 404 | `COURSE_NOT_FOUND` |
| Course is not `active` | 409 | `COURSE_NOT_ACTIVE` |
| Invalid email, justification, or status | 400 | `INVALID_REQUEST` |
| Duplicate `pending` or `approved` request | 409 | `DUPLICATE_ACTIVE_REQUEST` |
| Request does not exist | 404 | `ENROLLMENT_REQUEST_NOT_FOUND` |
| Status transition is not allowed | 409 | `INVALID_STATUS_TRANSITION` |
| Rejection without a reason | 400 | `INVALID_REQUEST` |

## Example

```bash
curl -s -X POST https://api.agentcourses.localhost/api/enrollment-requests \
  -H 'content-type: application/json' \
  -d '{"courseId":"course-001","learnerEmail":"learner@example.org","justification":"I need this course to prepare for upcoming secure development work."}'
```
