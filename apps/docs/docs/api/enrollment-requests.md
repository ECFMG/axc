# Enrollment requests

The sample API creates requests for active courses, lists or retrieves requests, and records review decisions. It has no real authentication. `changedBy` is a caller-supplied operator identifier, not a verified identity. IDs are opaque strings returned by creation.

## Create

`POST /api/enrollment-requests`

```json
{
  "courseId": "course-001",
  "learnerEmail": "learner@example.org",
  "justification": "I need this course for upcoming secure development work."
}
```

All three fields are required. `courseId` must be non-empty text referencing an existing active course. `learnerEmail` must have a valid email format. Email comparison and storage use lowercase, so letter-case variations refer to the same learner. `justification` must contain 20–500 characters inclusive; its original text is preserved.

HTTP 201 returns the complete request:

```json
{
  "id": "6a3fabf0084656fc36d38d21",
  "courseId": "course-001",
  "learnerEmail": "learner@example.org",
  "justification": "I need this course for upcoming secure development work.",
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

A learner can have only one pending or approved request for a course. A unique partial database index enforces this even for concurrent creations. Rejected and cancelled requests allow reapplication; previous records and history remain available.

## Retrieve

`GET /api/enrollment-requests/:id` returns HTTP 200 with the same complete request shape, including all history. An unknown or malformed ID returns HTTP 404 with `ENROLLMENT_REQUEST_NOT_FOUND`.

## List and filter

`GET /api/enrollment-requests?status=pending&courseId=course-001&learnerEmail=learner@example.org`

Returns HTTP 200 with a JSON array of complete request records, or `[]` when none match. Filters are optional and combine with AND. `status` accepts `pending`, `approved`, `rejected`, or `cancelled`. `courseId` matches exactly; `learnerEmail` is validated and matched case-insensitively through lowercase normalization. Empty or whitespace-only filters count as absent. Unknown parameters are ignored. Results are ordered by creation time, then ID. This sample list is unpaginated.

## Change status

`PATCH /api/enrollment-requests/:id/status`

Approval example:

```json
{ "status": "approved", "changedBy": "reviewer@example.org" }
```

Rejection example:

```json
{
  "status": "rejected",
  "changedBy": "reviewer@example.org",
  "reason": "Learner has not completed the prerequisite course."
}
```

`status` and a non-empty `changedBy` are required. A rejection requires a reason containing non-whitespace text. An optional reason for other transitions is preserved when present; blank or null optional reasons are recorded as null.

| From | Allowed destination |
| --- | --- |
| `pending` | `approved`, `rejected`, `cancelled` |
| `approved` | `cancelled` |
| `rejected` | None |
| `cancelled` | None |

HTTP 200 returns the complete updated request. Each successful change updates `updatedAt` and appends exactly one history entry containing the previous status, new status, time, operator, and optional reason. Creation and status/history writes are transactional. Invalid transitions, including setting the same status, leave the record and its history unchanged.

## Errors

All errors have this envelope:

```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "The request could not be completed.",
    "details": [
      { "field": "justification", "message": "justification must be between 20 and 500 characters." }
    ]
  }
}
```

| HTTP | Code | Trigger |
| --- | --- | --- |
| 400 | `INVALID_REQUEST` | Malformed JSON, non-object body, invalid/missing course ID, email, justification, status, operator, or rejection reason |
| 400 | `INVALID_QUERY_PARAMETER` | Invalid list status or learner email; message is `One or more query parameters are invalid.` |
| 404 | `COURSE_NOT_FOUND` | Create references a missing course |
| 409 | `COURSE_NOT_ACTIVE` | Create references a draft or retired course |
| 409 | `DUPLICATE_ACTIVE_REQUEST` | A pending or approved request already exists for the learner/course |
| 404 | `ENROLLMENT_REQUEST_NOT_FOUND` | Get or status change references a missing request |
| 409 | `INVALID_STATUS_TRANSITION` | The requested transition is not listed above |
| 500 | `INTERNAL_ERROR` | Unexpected storage or application failure |

Validation errors identify invalid fields in `details`; other failures have `details: []`. Responses never contain stack traces, driver messages, or internal diagnostic identifiers. API request IDs remain part of successful resource representations.

## Local storage

The API starts a MongoDB 7.0.14 in-memory replica set through the existing MongoDB service package and seeds the course catalog. Enrollment data lasts for the process lifetime. See [the storage decision](../adr/0001-training-storage.md). Existing versions of workspace packages, test tools, and MongoDB libraries are wired through package manifests; no new third-party library is introduced.
