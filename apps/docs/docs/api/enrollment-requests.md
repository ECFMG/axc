# Enrollment requests

A request stores its current status and an ordered `statusHistory`. Creation and each successful status change append one entry. The in-memory sample resets on host restart.

## POST /api/enrollment-requests

Requires an existing active `courseId`, valid `learnerEmail`, and `justification` of 20–500 characters. A learner can have one pending or approved request per course. Email is normalized to lower case. New requests start as pending.

```json
{"courseId":"course-001","learnerEmail":"learner@example.org","justification":"I need this course for secure development work."}
```

### Success: 201

```json
{"id":"enroll-uuid","courseId":"course-001","learnerEmail":"learner@example.org","justification":"I need this course for secure development work.","status":"pending","createdAt":"2026-06-27T10:00:00.000Z","updatedAt":"2026-06-27T10:00:00.000Z","statusHistory":[{"fromStatus":null,"toStatus":"pending","changedAt":"2026-06-27T10:00:00.000Z","changedBy":"system","reason":null}]}
```

### Errors

| Status | Code | When |
| --- | --- | --- |
| 400 | `INVALID_REQUEST` | Invalid email, justification length, or missing course ID. |
| 404 | `COURSE_NOT_FOUND` | Course ID does not exist. |
| 409 | `COURSE_NOT_ACTIVE` | Course is draft or retired. |
| 409 | `DUPLICATE_ACTIVE_REQUEST` | Learner already has a pending or approved request for this course. |

## GET /api/enrollment-requests/:id

Returns the same request object as creation, including `statusHistory`.

```http
GET /api/enrollment-requests/enroll-uuid
```

### Success: 200

```json
{"id":"enroll-uuid","courseId":"course-001","learnerEmail":"learner@example.org","justification":"I need this course for secure development work.","status":"pending","createdAt":"2026-06-27T10:00:00.000Z","updatedAt":"2026-06-27T10:00:00.000Z","statusHistory":[{"fromStatus":null,"toStatus":"pending","changedAt":"2026-06-27T10:00:00.000Z","changedBy":"system","reason":null}]}
```

### Errors

| Status | Code | When |
| --- | --- | --- |
| 404 | `ENROLLMENT_REQUEST_NOT_FOUND` | No request has this ID. |

## GET /api/enrollment-requests

Optional filters `status`, `courseId`, and `learnerEmail` are combined. Email comparison is case insensitive. Returns `{ "items": [...] }` with complete request objects.

```http
GET /api/enrollment-requests?status=pending&courseId=course-001&learnerEmail=learner@example.org
```

### Success: 200

```json
{"items":[{"id":"enroll-uuid","courseId":"course-001","learnerEmail":"learner@example.org","justification":"I need this course for secure development work.","status":"pending","createdAt":"2026-06-27T10:00:00.000Z","updatedAt":"2026-06-27T10:00:00.000Z","statusHistory":[{"fromStatus":null,"toStatus":"pending","changedAt":"2026-06-27T10:00:00.000Z","changedBy":"system","reason":null}]}]}
```

### Errors

| Status | Code | When |
| --- | --- | --- |
| 400 | `INVALID_REQUEST` | Invalid status or learner email, or unknown/repeated filter. |

## PATCH /api/enrollment-requests/:id/status

Requires `status` and non-empty `changedBy`. Valid transitions: pending → approved, rejected, or cancelled; approved → cancelled. Rejection also requires a non-empty `reason`.

```json
{"status":"rejected","changedBy":"reviewer@example.org","reason":"Prerequisite course is incomplete."}
```

### Success: 200

Returns the updated request object. For example, its appended history entry is:

```json
{"fromStatus":"pending","toStatus":"rejected","changedAt":"2026-06-27T11:00:00.000Z","changedBy":"reviewer@example.org","reason":"Prerequisite course is incomplete."}
```

### Errors

| Status | Code | When |
| --- | --- | --- |
| 400 | `INVALID_REQUEST` | Invalid status, missing reviewer, or rejection without a reason. |
| 404 | `ENROLLMENT_REQUEST_NOT_FOUND` | No request has this ID. |
| 409 | `INVALID_STATUS_TRANSITION` | Transition is not permitted from the current status. |

Error responses use `{ "error": { "code": "...", "message": "...", "details": [] } }`. Validation errors include field details.
