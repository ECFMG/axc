# Enrollment requests API

This local sample stores requests in memory for the lifetime of an application-services factory. Requests survive HTTP calls within one process and are lost on restart; multiple workers do not share state. No database, authentication or external integration is added. `changedBy` is a supplied sample operator identifier, not verified identity.

## Create

`POST /api/enrollment-requests` accepts a JSON object:

```json
{"courseId":"course-001","learnerEmail":"learner@example.org","justification":"I need this course for upcoming secure development work."}
```

Success: **201**, with `Location: /api/enrollment-requests/{id}` and this response shape (IDs and timestamps vary):

```json
{
  "id":"enroll-550e8400-e29b-41d4-a716-446655440000",
  "courseId":"course-001",
  "learnerEmail":"learner@example.org",
  "justification":"I need this course for upcoming secure development work.",
  "status":"pending",
  "createdAt":"2026-10-21T14:00:00.000Z",
  "updatedAt":"2026-10-21T14:00:00.000Z",
  "statusHistory":[{"fromStatus":null,"toStatus":"pending","changedAt":"2026-10-21T14:00:00.000Z","changedBy":"system","reason":null}]
}
```

The course must exist and be active. Email is trimmed, validated and lowercased; duplicate checks use that normalized email and course ID. Justification is trimmed and must contain 20–500 characters inclusive. Client-supplied status/history/IDs are ignored; all requests start pending. Only one pending or approved request per learner/course may exist. Reapplication is permitted after rejection or cancellation. Creation and duplicate checks execute synchronously in this sample process.

## Retrieve and list

`GET /api/enrollment-requests/{id}` returns **200** and the full request including history.

`GET /api/enrollment-requests` returns **200** and a JSON array of full requests, or `[]` for no matches. Optional filters combine using AND:

| Filter | Values |
| --- | --- |
| `status` | `pending`, `approved`, `rejected`, `cancelled` |
| `courseId` | Exact non-empty course ID |
| `learnerEmail` | Valid email; trimmed and case-insensitive |

Example: `/api/enrollment-requests?status=pending&courseId=course-001&learnerEmail=learner%40example.org`. Invalid, repeated or unsupported list filters return 400. The sample list has insertion order and no pagination.

## Change status

`PATCH /api/enrollment-requests/{id}/status`:

```json
{"status":"approved","changedBy":"reviewer@example.org"}
```

Rejection:

```json
{"status":"rejected","changedBy":"reviewer@example.org","reason":"Learner has not completed the prerequisite course."}
```

`changedBy` must be a non-empty string. Rejection requires a non-empty string reason. Optional reasons, when provided, must also be non-empty strings; omitted/null reasons become null. Success: **200** and the complete updated request. Allowed transitions are pending → approved/rejected/cancelled and approved → cancelled. Rejected/cancelled are terminal and transitions to the current status are invalid. Every successful change appends an audit entry with previous/next status, timestamp, operator and reason, and updates `updatedAt`. Failed changes leave the request unchanged.

## Errors

All errors use this envelope:

```json
{"error":{"code":"INVALID_REQUEST","message":"The request could not be completed.","details":[{"field":"justification","message":"justification must be between 20 and 500 characters."}]}}
```

| HTTP | Code | Cases |
| --- | --- | --- |
| 400 | `INVALID_REQUEST` | Malformed JSON/non-object body, missing required fields, invalid email, justification outside limits, invalid status/filter, missing operator, rejection without a reason |
| 404 | `COURSE_NOT_FOUND` | Creation references a missing course |
| 409 | `COURSE_NOT_ACTIVE` | Creation references draft/retired course |
| 409 | `DUPLICATE_ACTIVE_REQUEST` | Same learner/course already pending or approved |
| 404 | `ENROLLMENT_REQUEST_NOT_FOUND` | Retrieval or valid status update references unknown ID |
| 409 | `INVALID_STATUS_TRANSITION` | Disallowed transition |
| 500 | `INTERNAL_ERROR` | Unexpected internal failure; internal details withheld |

Business errors include an empty `details` array; validation errors identify the invalid field. Request fields are validated before course/request lookup. See [course search](./courses.md) for the preserved catalog contract.
