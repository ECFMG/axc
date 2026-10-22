# Enrollment requests

## Create

`POST /api/enrollment-requests` with a JSON object:

```json
{"courseId":"course-001","learnerEmail":"learner@example.org","justification":"I need this course for upcoming engineering work."}
```

Returns HTTP 201, a `Location` header pointing to the request, and the complete request:

```json
{"id":"generated-uuid","courseId":"course-001","learnerEmail":"learner@example.org","justification":"I need this course for upcoming engineering work.","status":"pending","createdAt":"2026-06-27T10:00:00.000Z","updatedAt":"2026-06-27T10:00:00.000Z","statusHistory":[{"fromStatus":null,"toStatus":"pending","changedAt":"2026-06-27T10:00:00.000Z","changedBy":"system","reason":null}]}
```

The course must exist and be active. Email is validated and stored lowercase. Justification is trimmed and must contain 20–500 characters after trimming. Course IDs are trimmed. New requests always start pending, regardless of extra input fields. A learner/course pair may have at most one pending or approved request. Rejected or cancelled requests permit reapplication. Concurrent writes are serialized within this sample process.

## Retrieve and list

`GET /api/enrollment-requests/:id` returns HTTP 200 with the complete request above, including history.

`GET /api/enrollment-requests` returns HTTP 200 with `{ "items": [...] }`. Optional `status` (`pending`, `approved`, `rejected`, `cancelled`), `courseId`, and `learnerEmail` filters combine with AND. Email comparison is case insensitive. No matches returns `{ "items": [] }`. This sample list is unpaginated. Unknown, duplicate, empty or invalid filter values return 400 `INVALID_REQUEST`.

Example: `/api/enrollment-requests?status=pending&courseId=course-001&learnerEmail=learner@example.org`.

## Change status

`PATCH /api/enrollment-requests/:id/status`:

```json
{"status":"approved","changedBy":"reviewer@example.org"}
```

```json
{"status":"rejected","changedBy":"reviewer@example.org","reason":"Learner has not completed prerequisites."}
```

Returns HTTP 200 with the complete updated request. `changedBy` must be a non-empty identifier; it is caller supplied in this unauthenticated sample. `reason` is an optional string and is mandatory and non-blank for rejection.

Allowed transitions: pending → approved, rejected, or cancelled; approved → cancelled. Repeating a status or leaving rejected/cancelled is a conflict. Every successful status change appends `{ fromStatus, toStatus, changedAt, changedBy, reason }` and updates `updatedAt`; `createdAt` stays fixed. An omitted reason is recorded as null. Failed operations leave stored state and history unchanged.

## Errors

All errors use `{ "error": { "code": "...", "message": "...", "details": [] } }`. Validation details contain `{ "field", "message" }`, collecting all invalid fields.

| HTTP | Code | Cause |
| --- | --- | --- |
| 400 | `INVALID_REQUEST` | Malformed JSON or non-object body; missing/empty course ID; invalid email; justification outside 20–500; invalid status; missing/empty changedBy; non-string reason; rejection without a non-blank reason; invalid list query |
| 404 | `COURSE_NOT_FOUND` | Creation references a missing course |
| 409 | `COURSE_NOT_ACTIVE` | Creation references a draft or retired course |
| 409 | `DUPLICATE_ACTIVE_REQUEST` | Existing pending or approved request for learner/course |
| 404 | `ENROLLMENT_REQUEST_NOT_FOUND` | Get or status change references a missing request |
| 409 | `INVALID_STATUS_TRANSITION` | Transition is not allowed |

```json
{"error":{"code":"INVALID_REQUEST","message":"The request could not be completed.","details":[{"field":"justification","message":"justification must be between 20 and 500 characters."}]}}
```

Data and audit history are process local and reset on restart; there is no production persistence or authentication.
