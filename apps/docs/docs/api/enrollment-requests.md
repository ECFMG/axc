# Enrollment Requests API

A learner submits an enrollment request for an active course. Reviewers then approve, reject, or
cancel it. Every change — including creation — appends an entry to the request's `statusHistory`,
so the audit trail is complete from the moment the request exists.

## Enrollment request

| Field | Type | Notes |
| --- | --- | --- |
| `id` | string | Unique request identifier, allocated by the API (`enroll-001`, `enroll-002`, …). |
| `courseId` | string | References a course that existed and was `active` at creation time. |
| `learnerEmail` | string | Stored lowercased and trimmed. |
| `justification` | string | 20–500 characters, trimmed. |
| `status` | enum | `pending`, `approved`, `rejected`, or `cancelled`. |
| `createdAt` | string | ISO-8601 date string. |
| `updatedAt` | string | ISO-8601 date string. Moves with every status change. |
| `statusHistory` | array | Audit trail. See below. |

### Status history entry

| Field | Type | Notes |
| --- | --- | --- |
| `fromStatus` | string or null | `null` on the entry written at creation. |
| `toStatus` | string | The status the request moved to. |
| `changedAt` | string | ISO-8601 date string. |
| `changedBy` | string | Reviewer or operator identifier. `system` for the creation entry. |
| `reason` | string or null | Required when rejecting; `null` otherwise. |

### Lifecycle

```
            ┌────────── approved ──────────┐
            │                              ▼
pending ────┼────────── rejected        cancelled
            │                              ▲
            └────────── cancelled ─────────┘
```

| From | Allowed to |
| --- | --- |
| `pending` | `approved`, `rejected`, `cancelled` |
| `approved` | `cancelled` |
| `rejected` | — terminal |
| `cancelled` | — terminal |

Any other move, including a no-op such as `pending` → `pending`, is rejected with `409`.

---

## Create an enrollment request

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

### Rules

- The course must exist and its `status` must be `active`.
- `learnerEmail` must be a syntactically valid email address.
- `justification` must be 20–500 characters after trimming.
- The learner must not already hold a `pending` or `approved` request for the same course. Email
  comparison is case-insensitive, so `Learner@Example.org` and `learner@example.org` are the same
  learner.

### Success response

`201` with the created request, already carrying its opening audit entry:

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

---

## Retrieve an enrollment request

```http
GET /api/enrollment-requests/enroll-001
```

`200` with the same body shape as the create response, including the full `statusHistory`.
`404` with `ENROLLMENT_REQUEST_NOT_FOUND` when no request carries that identifier.

---

## List enrollment requests

```http
GET /api/enrollment-requests?status=pending&courseId=course-001&learnerEmail=learner@example.org
```

All three filters are optional and combine with AND. `learnerEmail` is matched
case-insensitively. Results are returned most recently created first.

`200`:

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
  ],
  "totalItems": 1
}
```

No matches returns `200` with an empty `items` array.

---

## Update an enrollment request status

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

Rejection — `reason` is required and must be non-empty:

```json
{
  "status": "rejected",
  "changedBy": "reviewer@example.org",
  "reason": "Learner has not completed the prerequisite course."
}
```

`changedBy` is optional; it defaults to `system` when omitted, matching the actor recorded for the
creation entry.

`200` returns the updated request with a freshly appended `statusHistory` entry:

```json
{
  "id": "enroll-001",
  "courseId": "course-001",
  "learnerEmail": "learner@example.org",
  "justification": "I need this course to prepare for upcoming secure development work.",
  "status": "approved",
  "createdAt": "2026-06-27T10:00:00.000Z",
  "updatedAt": "2026-06-28T09:15:00.000Z",
  "statusHistory": [
    {
      "fromStatus": null,
      "toStatus": "pending",
      "changedAt": "2026-06-27T10:00:00.000Z",
      "changedBy": "system",
      "reason": null
    },
    {
      "fromStatus": "pending",
      "toStatus": "approved",
      "changedAt": "2026-06-28T09:15:00.000Z",
      "changedBy": "reviewer@example.org",
      "reason": null
    }
  ]
}
```

---

## Errors

Every endpoint uses the shared error envelope:

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
| Course does not exist | `404` | `COURSE_NOT_FOUND` |
| Course is `draft` or `retired` | `409` | `COURSE_NOT_ACTIVE` |
| Invalid `learnerEmail` | `400` | `INVALID_REQUEST` |
| `justification` shorter than 20 or longer than 500 characters | `400` | `INVALID_REQUEST` |
| Missing or non-string `courseId`, `learnerEmail`, or `justification` | `400` | `INVALID_REQUEST` |
| Body is absent or is not a JSON object | `400` | `INVALID_REQUEST` |
| Learner already has a `pending` request for the course | `409` | `DUPLICATE_ACTIVE_REQUEST` |
| Learner already has an `approved` request for the course | `409` | `DUPLICATE_ACTIVE_REQUEST` |
| Request not found | `404` | `ENROLLMENT_REQUEST_NOT_FOUND` |
| `status` missing or outside the four allowed values | `400` | `INVALID_REQUEST` |
| Rejection without a non-empty `reason` | `400` | `INVALID_REQUEST` |
| Status move outside the lifecycle | `409` | `INVALID_STATUS_TRANSITION` |
| `status` filter on the list endpoint outside the four allowed values | `400` | `INVALID_QUERY_PARAMETER` |

Body validation runs before the request is loaded, so a malformed body on an unknown request
returns `400` rather than `404`. Validation failures report every offending field in a single
`details` array.

## Examples

```bash
curl -s -X POST 'https://api.agentcourses.localhost/api/enrollment-requests' \
  -H 'content-type: application/json' \
  -d '{"courseId":"course-001","learnerEmail":"learner@example.org","justification":"I need this course to prepare for upcoming secure development work."}'

curl -s 'https://api.agentcourses.localhost/api/enrollment-requests/enroll-001'

curl -s 'https://api.agentcourses.localhost/api/enrollment-requests?status=pending&courseId=course-001'

curl -s -X PATCH 'https://api.agentcourses.localhost/api/enrollment-requests/enroll-001/status' \
  -H 'content-type: application/json' \
  -d '{"status":"approved","changedBy":"reviewer@example.org"}'
```
