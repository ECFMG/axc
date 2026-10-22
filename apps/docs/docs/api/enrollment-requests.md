# Enrollment requests

Learners submit a request to enroll in an active course. Reviewers list those requests and approve, reject, or cancel them. Every creation and status change appends a `statusHistory` entry.

This sample does not authenticate callers. `changedBy` is the reviewer or operator identifier supplied in the status update. Creation history uses `changedBy` of `system`. Storage is process-local memory; restarting the API clears requests and starts ids again at `enroll-001`. See [in-memory storage](/adr/in-memory-course-enrollment).

Courses come from [`GET /api/courses`](/api/courses). Only a course with status `active` can receive a new request.

## Create a request

```http
POST /api/enrollment-requests
Content-Type: application/json
```

```json
{
  "courseId": "course-001",
  "learnerEmail": "learner@example.org",
  "justification": "I need this course to prepare for upcoming secure development work."
}
```

| Field | Required | Rules |
| --- | --- | --- |
| `courseId` | Yes | Non-empty string. The course must exist and have status `active`. |
| `learnerEmail` | Yes | Email format. Stored trimmed and lowercased. Comparison for duplicates and filters is case-insensitive. |
| `justification` | Yes | 20 to 500 characters. Length is the raw string length and is not trimmed. |

New requests always start as `pending`.

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

A learner cannot have more than one `pending` or `approved` request for the same course. `rejected` and `cancelled` requests do not block a new request. A different learner may request the same course.

## Retrieve a request

```http
GET /api/enrollment-requests/enroll-001
```

`200` returns the same object shape as create, including the full `statusHistory` from oldest to newest.

## List requests

```http
GET /api/enrollment-requests?status=pending&courseId=course-001&learnerEmail=learner@example.org
```

All filters are optional and combine with AND. Omitted filters are not applied.

| Parameter | Rules |
| --- | --- |
| `status` | `pending`, `approved`, `rejected`, or `cancelled`. |
| `courseId` | Non-empty string when present. Exact match. |
| `learnerEmail` | Non-empty string when present. Trimmed and compared case-insensitively. |

`200` returns:

```json
{
  "items": []
}
```

`items` contains matching requests ordered by `createdAt` ascending, then `id`. The list is not paginated.

## Update status

```http
PATCH /api/enrollment-requests/enroll-001/status
Content-Type: application/json
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

| Field | Required | Rules |
| --- | --- | --- |
| `status` | Yes | `pending`, `approved`, `rejected`, or `cancelled`. The transition must also be allowed. |
| `changedBy` | Yes | Non-empty identifier after trimming. |
| `reason` | Required for `rejected` | Non-empty after trimming. Stored on the new history entry. Optional for other statuses. A blank reason is stored as `null` except when rejecting, which is `400`. |

`200` returns the updated request. `createdAt` stays the same. `updatedAt` matches the new history entry's `changedAt`.

### Allowed transitions

| From | To |
| --- | --- |
| `pending` | `approved`, `rejected`, `cancelled` |
| `approved` | `cancelled` |
| `rejected` | none |
| `cancelled` | none |

Any other pair, including staying in the same status, is `409`.

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
| Course exists but is not `active` | 409 | `COURSE_NOT_ACTIVE` |
| Invalid email, justification length, missing fields, or a body that is not a JSON object | 400 | `INVALID_REQUEST` |
| Invalid JSON | 400 | `INVALID_REQUEST` |
| Duplicate `pending` or `approved` request for the same learner and course | 409 | `DUPLICATE_ACTIVE_REQUEST` |
| Request id does not exist | 404 | `ENROLLMENT_REQUEST_NOT_FOUND` |
| `status` is not one of the four statuses, including on list filters | 400 | `INVALID_REQUEST` |
| Status is known but the transition is not allowed | 409 | `INVALID_STATUS_TRANSITION` |
| Rejection without a non-empty reason | 400 | `INVALID_REQUEST` |

Field validation runs before the course lookup and before the transition check. A rejection that is also an illegal transition still returns `400` when the reason is missing. A legal payload for a missing request returns `404`. An illegal transition for an existing request returns `409`.

## Example

```bash
curl -s -X POST https://api.agentcourses.localhost/api/enrollment-requests \
  -H 'content-type: application/json' \
  -d '{"courseId":"course-001","learnerEmail":"learner@example.org","justification":"I need this course to prepare for upcoming secure development work."}'
```
