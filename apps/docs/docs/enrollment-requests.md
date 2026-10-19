# Enrollment requests

Learners request a seat in an active course. Reviewers approve, reject, or cancel those requests. `@apps/api` composes the routes, `@axc/rest` maps HTTP, and `@axc/application-services` applies the rules.

Requests are stored in process memory. Restarting the API clears them. `changedBy` is the caller-supplied reviewer label. This sample does not authenticate that label.

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
| `courseId` | Required non-empty string. Must be an existing course with status `active`. |
| `learnerEmail` | Required valid email address. Stored trimmed. Compared case-insensitively. |
| `justification` | Required. 20–500 characters after trimming. |

Unknown JSON fields are ignored. A non-object JSON body is invalid.

`201` returns the created request. New requests start as `pending`. Creation adds the first `statusHistory` entry with `changedBy` set to `system`.

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

| Field | Meaning |
| --- | --- |
| `id` | Process-local id, `enroll-001` then `enroll-002`, and so on. |
| `courseId` | Course the learner asked to join. |
| `learnerEmail` | Learner email, trimmed. |
| `justification` | Trimmed justification. |
| `status` | `pending`, `approved`, `rejected`, or `cancelled`. |
| `createdAt` | ISO-8601 creation time. |
| `updatedAt` | ISO-8601 time of the latest create or status change. |
| `statusHistory` | Audit trail. Creation and every status change append one entry. |

| History field | Meaning |
| --- | --- |
| `fromStatus` | Previous status. `null` on creation. |
| `toStatus` | Status after the change. |
| `changedAt` | ISO-8601 time of the change. |
| `changedBy` | `system` on creation. Reviewer label on later changes. |
| `reason` | Required when rejecting. `null` when omitted. |

A learner cannot have more than one `pending` or `approved` request for the same course. `rejected` and `cancelled` requests do not block a new request. Email matching ignores case.

## Retrieve one

```http
GET /api/enrollment-requests/enroll-001
```

`200` returns the same request object as create, including `statusHistory`.

## List

```http
GET /api/enrollment-requests?status=pending&courseId=course-001&learnerEmail=learner@example.org
```

| Query parameter | Rule |
| --- | --- |
| `status` | Optional. `pending`, `approved`, `rejected`, or `cancelled`. Case-sensitive. |
| `courseId` | Optional exact course id. |
| `learnerEmail` | Optional exact email. Case-insensitive. |

Omitted filters are not applied. Present filters combine with AND. Results keep insertion order. A filter that matches nothing returns `200` and an empty `items` array.

```json
{
  "items": []
}
```

Unknown query parameters, repeated parameters, and invalid `status` values are rejected.

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
| `changedBy` | Required non-empty reviewer label. Stored trimmed. |
| `reason` | Required non-empty string when the new status is `rejected` and the transition is allowed. Optional otherwise. Blank values are treated as omitted. |

Allowed transitions:

| From | To |
| --- | --- |
| `pending` | `approved`, `rejected`, `cancelled` |
| `approved` | `cancelled` |

`rejected` and `cancelled` are terminal. Repeating the current status is not a transition.

`200` returns the updated request. `updatedAt` changes, `createdAt` does not, and `statusHistory` gains one entry.

A transition that is not allowed returns `409` even when a rejection reason is missing. A missing reason is reported only when the transition would otherwise be allowed.

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
| Invalid JSON, a non-object body, an invalid email, a justification outside 20–500 characters, an invalid status, a missing reviewer, or a rejection without a reason | `400` | `INVALID_REQUEST` |
| Course id does not exist | `404` | `COURSE_NOT_FOUND` |
| Course exists but is not `active` | `409` | `COURSE_NOT_ACTIVE` |
| Learner already has a `pending` or `approved` request for the course | `409` | `DUPLICATE_ACTIVE_REQUEST` |
| Enrollment request id does not exist | `404` | `ENROLLMENT_REQUEST_NOT_FOUND` |
| Status transition is not allowed | `409` | `INVALID_STATUS_TRANSITION` |

Body field checks run before the course lookup. On status updates, an unknown status value or a missing `changedBy` is `400` before the id is loaded. The rejection-reason check runs after the transition check.

## Example

```bash
curl -s -X POST "https://api.agentcourses.localhost/api/enrollment-requests" \
  -H "content-type: application/json" \
  -d '{"courseId":"course-001","learnerEmail":"learner@example.org","justification":"I need this course to prepare for upcoming secure development work."}'
```

Course search remains `GET /api/courses`. See [Course catalog](./courses.md).
