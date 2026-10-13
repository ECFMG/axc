# Enrollment requests

Learners request enrollment in an active course; reviewers approve, reject or cancel. State is in memory for the life of the API process.

## Model

| Field | Type | Notes |
| --- | --- | --- |
| `id` | string | `enroll-001`, `enroll-002`, … |
| `courseId` | string | Existing course with status `active` at creation. |
| `learnerEmail` | string | Valid email, stored lower-cased. |
| `justification` | string | 20–500 characters (trimmed). |
| `status` | enum | `pending`, `approved`, `rejected`, `cancelled`. |
| `createdAt`, `updatedAt` | string | ISO-8601. |
| `statusHistory` | array | One entry per creation and status change, oldest first. |

`statusHistory` entry: `fromStatus` (`null` on creation), `toStatus`, `changedAt`, `changedBy` (`system` on creation), `reason` (`null` unless given).

## `POST /api/enrollment-requests`

```json
{
  "courseId": "course-001",
  "learnerEmail": "learner@example.org",
  "justification": "I need this course to prepare for upcoming secure development work."
}
```

`201` returns the new request with `status: "pending"`:

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
    { "fromStatus": null, "toStatus": "pending", "changedAt": "2026-06-27T10:00:00.000Z", "changedBy": "system", "reason": null }
  ]
}
```

A learner may hold at most one `pending` or `approved` request per course; after rejection or cancellation they may request again.

## `GET /api/enrollment-requests/:id`

`200` returns the request (shape above, including `statusHistory`).

## `GET /api/enrollment-requests`

Optional filters, combined with AND: `status` (one of the four statuses), `courseId`, `learnerEmail` (case-insensitive).

```http
GET /api/enrollment-requests?status=pending&courseId=course-001&learnerEmail=learner@example.org
```

`200` returns `{ "items": [ …requests… ] }` in creation order.

## `PATCH /api/enrollment-requests/:id/status`

```json
{ "status": "rejected", "changedBy": "reviewer@example.org", "reason": "Learner has not completed the prerequisite course." }
```

`changedBy` is required. `reason` is required (non-blank) for `rejected`, optional otherwise. `200` returns the updated request with a new `statusHistory` entry.

| From | Allowed to |
| --- | --- |
| `pending` | `approved`, `rejected`, `cancelled` |
| `approved` | `cancelled` |
| `rejected`, `cancelled` | — (terminal) |

## Errors

Same shape as course search:

```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "The request could not be completed.",
    "details": [{ "field": "justification", "message": "justification must be between 20 and 500 characters." }]
  }
}
```

| Scenario | Status | Code |
| --- | --- | --- |
| Missing/invalid `courseId`, `learnerEmail`, `justification`, malformed JSON | 400 | `INVALID_REQUEST` |
| Invalid `status` value (PATCH body or list filter), missing `changedBy` | 400 | `INVALID_REQUEST` |
| Rejection without `reason` | 400 | `INVALID_REQUEST` |
| Course does not exist | 404 | `COURSE_NOT_FOUND` |
| Request does not exist | 404 | `ENROLLMENT_REQUEST_NOT_FOUND` |
| Course is `draft` or `retired` | 409 | `COURSE_NOT_ACTIVE` |
| Learner already has a `pending` or `approved` request for the course | 409 | `DUPLICATE_ACTIVE_REQUEST` |
| Transition not in the table above | 409 | `INVALID_STATUS_TRANSITION` |

Not-found and conflict errors return an empty `details` array.
