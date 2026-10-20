# Enrollment requests

The sample API supports enrollment in the twelve-course fixture catalog. These endpoints use the existing anonymous sample routing convention. `changedBy` is a caller-supplied operator identifier, not a verified identity.

## Create

`POST /api/enrollment-requests`

```json
{
  "courseId": "course-001",
  "learnerEmail": "learner@example.org",
  "justification": "I need this course to prepare for secure development work."
}
```

Returns HTTP **201** with the complete request:

```json
{
  "id": "enroll-<UUID>",
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

The course must exist and be active. Email is trimmed, validated, and lowercased; justification is trimmed and must contain 20–500 characters. Required fields must have the documented string types. Malformed JSON and non-object bodies return 400. Extra fields are ignored; caller-supplied IDs, status, timestamps, and history cannot override generated values.

Each learner/course pair may have at most one pending or approved request. Rejected and cancelled requests permit another request. Duplicate checking and insertion occur synchronously in one process.

## Retrieve and list

`GET /api/enrollment-requests/:id` returns HTTP **200** and the complete request object shown above, including its history. A missing ID returns 404.

`GET /api/enrollment-requests` returns HTTP **200** and an array of complete request objects, or `[]`. Optional `status`, `courseId`, and `learnerEmail` filters combine with AND:

```http
GET /api/enrollment-requests?status=pending&courseId=course-001&learnerEmail=learner%40example.org
```

Status must be `pending`, `approved`, `rejected`, or `cancelled`. Course ID uses exact matching after trimming; email uses the same normalization as creation. Empty, repeated, or invalid recognized filters return 400. Unknown parameters are ignored. Listing preserves creation order; there is no pagination contract for requests.

## Change status

`PATCH /api/enrollment-requests/:id/status`

```json
{
  "status": "approved",
  "changedBy": "reviewer@example.org"
}
```

For rejection:

```json
{
  "status": "rejected",
  "changedBy": "reviewer@example.org",
  "reason": "Learner has not completed the prerequisite course."
}
```

Returns HTTP **200** and the complete updated request. The ID, course, learner, justification, creation timestamp and prior history are preserved. `updatedAt` and the new history entry's `changedAt` are the same ISO UTC timestamp. Each entry records the previous status, new status, operator and optional reason (`null` when absent). `changedBy` must be a non-empty string. The transition rule itself enforces a non-empty operator and a non-empty rejection reason, including when called directly. Rejection requires a non-empty string reason; a supplied reason for any other transition must also be non-empty.

| From | Allowed destination |
| --- | --- |
| pending | approved, rejected, cancelled |
| approved | cancelled |
| rejected | None |
| cancelled | None |

All other transitions, including same-status updates, return 409. Invalid input returns 400 before business rules are evaluated. Failed operations do not change the request or history.

## Errors

All documented errors use this envelope:

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

Business-rule errors have a descriptive message and an empty `details` array.

| HTTP | Code | Condition |
| --- | --- | --- |
| 400 | INVALID_REQUEST | Invalid/missing field, invalid filter/status, malformed body, missing rejection reason |
| 404 | COURSE_NOT_FOUND | Creation references a missing course |
| 409 | COURSE_NOT_ACTIVE | Creation references a draft or retired course |
| 409 | DUPLICATE_ACTIVE_REQUEST | Same learner/course already has a pending or approved request |
| 404 | ENROLLMENT_REQUEST_NOT_FOUND | Retrieval or valid status update references a missing request |
| 409 | INVALID_STATUS_TRANSITION | Status change is outside the transition table |
| 500 | INTERNAL_ERROR | Unexpected enrollment-route failure; internal details are not exposed |

## Storage and scope

Requests are stored in memory for the lifetime of one application-services factory and are lost on restart. Separate instances do not share data. The sample has no durable or cross-process duplicate guarantee. Repository reads/writes return detached copies to prevent mutation outside service operations. Domain rules, repository and response model remain in the existing application-services package, avoiding new workspace dependencies. The response mapper is the detached serializable request model; no database adapter is needed.
