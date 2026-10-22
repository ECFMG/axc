# Enrollment requests

A learner can request enrollment in an active course. Reviewers can list requests and approve, reject, or cancel them. Each creation and status change appends a `statusHistory` entry.

## Decision

The sample API keeps courses and enrollment requests in process memory inside `@axc/persistence`. It does not call the Mongoose adapter. That keeps the workflow runnable without an external database. Status changes are allowed only along `pending` to `approved`, `pending` to `rejected`, `pending` to `cancelled`, and `approved` to `cancelled`. A learner may hold only one `pending` or `approved` request for a given course. Rejected and cancelled requests do not block a later request.

`changedBy` is a caller-supplied identifier. This API does not add authentication.

## Create an enrollment request

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
| `courseId` | Required string. The course must exist and have status `active`. |
| `learnerEmail` | Required valid email address. Leading and trailing spaces are removed. Comparison for duplicates is case-insensitive. |
| `justification` | Required string of 20 to 500 characters. Length uses the raw string. |

`201` returns the new request. The first request created in a process uses id `enroll-001`. Later ids increment. `status` is `pending`. The first history entry uses `changedBy` `system` and `reason` null.

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

The timestamps above are illustrative. A running API uses the current time.

## Get an enrollment request

```http
GET /api/enrollment-requests/enroll-001
```

`200` returns the same object shape as create, including `statusHistory`.

## List enrollment requests

```http
GET /api/enrollment-requests?status=pending&courseId=course-001&learnerEmail=learner@example.org
```

All three filters are optional and combine with AND. `learnerEmail` matches case-insensitively. Results are sorted by `createdAt` ascending, then `id`.

`200`:

```json
{
  "items": []
}
```

Each item has the full enrollment request shape. An empty match is `200` with `"items": []`.

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
| `changedBy` | Required non-empty string. |
| `reason` | Required non-empty string when `status` is `rejected`. Optional otherwise. A blank optional reason is stored as null. |

`200` returns the updated request. `updatedAt` changes, and one history entry is appended with `fromStatus` set to the previous status.

Valid transitions:

| From | To |
| --- | --- |
| `pending` | `approved` |
| `pending` | `rejected` |
| `pending` | `cancelled` |
| `approved` | `cancelled` |

Any other pair, including staying on the same status, is invalid.

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
| Course is not `active` | 409 | `COURSE_NOT_ACTIVE` |
| Invalid email, justification length, JSON body, or status value | 400 | `INVALID_REQUEST` |
| Rejection without a non-empty reason | 400 | `INVALID_REQUEST` |
| Invalid list filter, including an unknown query parameter | 400 | `INVALID_REQUEST` |
| Duplicate `pending` or `approved` request for the same learner and course | 409 | `DUPLICATE_ACTIVE_REQUEST` |
| Request id does not exist | 404 | `ENROLLMENT_REQUEST_NOT_FOUND` |
| Status value is valid but the transition is not allowed | 409 | `INVALID_STATUS_TRANSITION` |

Body validation runs before the course or request lookup. A malformed body returns 400 even when the id or course is also unknown.

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

## Limitations

- Data lives in the API process. Restarting the process clears enrollment requests and restores the seeded courses.
- Two API processes do not share requests.
- There is no authentication. Clients choose `changedBy`.
- The duplicate rule treats email addresses as equal when they differ only by case.
- Course ids and enrollment request ids are matched exactly.
