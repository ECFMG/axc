# Enrollment request API

Enrollment requests reference an existing **active** [course](./courses.md). This sample uses local in-memory MongoDB 7.0.14 when no MongoDB URI is configured. Data is discarded when that process stops. An explicitly configured database is not seeded. No authentication or external integration is added; `changedBy` is a caller-supplied audit identifier, not a verified identity.

## Create

`POST /api/enrollment-requests`

```json
{
  "courseId": "course-001",
  "learnerEmail": "learner@example.org",
  "justification": "I need this course to prepare for secure development work."
}
```

All fields are required strings. Email must have a local part and a dotted domain with no whitespace. Email is trimmed and lowercased for storage, filtering, and duplicate detection. Justification is trimmed and must contain 20–500 characters after trimming. Course IDs are trimmed. Extra fields are ignored; clients cannot set the initial status or history.

Success (`201`) returns the complete request:

```json
{
  "id": "a-generated-uuid",
  "courseId": "course-001",
  "learnerEmail": "learner@example.org",
  "justification": "I need this course to prepare for secure development work.",
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

A learner may have only one `pending` or `approved` request per course. A database partial unique index enforces this under concurrent submissions. Rejected or cancelled requests allow a new request.

## Retrieve and list

`GET /api/enrollment-requests/:id` returns `200` with the complete request above, including the full history. An unknown ID returns `404`.

`GET /api/enrollment-requests` returns `200` with a JSON array of complete request objects, or `[]` when no requests match. Optional filters combine with AND:

| Parameter | Accepted input |
| --- | --- |
| `status` | `pending`, `approved`, `rejected`, `cancelled` |
| `courseId` | Exact course ID |
| `learnerEmail` | Valid email, normalized as on creation |

```http
GET /api/enrollment-requests?status=pending&courseId=course-001&learnerEmail=learner%40example.org
```

Empty or whitespace-only filters are omitted. Unknown parameters are ignored. Results are ordered by creation time, then request ID. This sample list endpoint has no pagination contract and returns all matching requests.

## Change status

`PATCH /api/enrollment-requests/:id/status`

```json
{ "status": "approved", "changedBy": "reviewer@example.org" }
```

Rejection:

```json
{
  "status": "rejected",
  "changedBy": "reviewer@example.org",
  "reason": "Learner has not completed the prerequisite course."
}
```

`changedBy` is a required non-empty string. `reason` is an optional string, required and non-empty after trimming for rejection. Blank optional reasons become `null` in history.

| Current status | Allowed next statuses |
| --- | --- |
| `pending` | `approved`, `rejected`, `cancelled` |
| `approved` | `cancelled` |
| `rejected` | None |
| `cancelled` | None |

Success (`200`) returns the complete updated request. `createdAt` remains unchanged; `updatedAt` and a newly appended history entry share the change timestamp:

```json
{
  "fromStatus": "pending",
  "toStatus": "approved",
  "changedAt": "2026-06-28T10:00:00.000Z",
  "changedBy": "reviewer@example.org",
  "reason": null
}
```

The aggregate and embedded history are saved in one atomic document write. Optimistic version checks reject concurrent stale changes with `409`; a rejected write does not append history. The unit of work stages one aggregate per operation and commits only after its callback succeeds.

## Errors

All errors share this format:

```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "The request could not be completed.",
    "details": [{ "field": "justification", "message": "justification must be between 20 and 500 characters." }]
  }
}
```

| HTTP status | Code | Cause |
| --- | --- | --- |
| `400` | `INVALID_REQUEST` | Malformed JSON, non-object body, missing/wrong-type fields, invalid email, justification outside 20–500 characters, invalid status/filter, missing reviewer, or rejection without reason |
| `404` | `COURSE_NOT_FOUND` | Course does not exist |
| `409` | `COURSE_NOT_ACTIVE` | Course is draft or retired |
| `409` | `DUPLICATE_ACTIVE_REQUEST` | Same learner/course already has a pending or approved request |
| `404` | `ENROLLMENT_REQUEST_NOT_FOUND` | Request ID does not exist, for retrieval or update |
| `409` | `INVALID_STATUS_TRANSITION` | Transition is disallowed, including repeating the current status, or a concurrent update changed the version |
| `500` | `INTERNAL_ERROR` | Unexpected failure; internal diagnostics are not returned |

Domain conflict and not-found errors have an empty `details` array. No real authentication, reviewer authorization, email verification, or durable local storage is provided by this sample.
