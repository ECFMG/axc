# Enrollment requests

Requests are held in the sample application's in-memory store. Restarting the host clears them. A request has `id`, `courseId`, `learnerEmail`, `justification`, `status`, `createdAt`, `updatedAt`, and `statusHistory`. History entries contain `fromStatus` (null on creation), `toStatus`, `changedAt`, `changedBy`, and `reason` (null unless supplied).

## Create

`POST /api/enrollment-requests` accepts:

```json
{"courseId":"course-001","learnerEmail":"learner@example.org","justification":"I need this course for secure development work."}
```

HTTP 201 returns the created request with `status: "pending"` and a creation history entry (`changedBy: "system"`):

```json
{"id":"enroll-001","courseId":"course-001","learnerEmail":"learner@example.org","justification":"I need this course for secure development work.","status":"pending","createdAt":"2026-06-27T10:00:00.000Z","updatedAt":"2026-06-27T10:00:00.000Z","statusHistory":[{"fromStatus":null,"toStatus":"pending","changedAt":"2026-06-27T10:00:00.000Z","changedBy":"system","reason":null}]}
``` The course must exist and be active. Email must be valid. Trimmed justification must be 20–500 characters. A learner cannot have another pending or approved request for the same course.

## Retrieve and list

`GET /api/enrollment-requests/:id` returns HTTP 200 with the full request and history. `GET /api/enrollment-requests` returns HTTP 200 with an array of requests. Optional exact filters are `status` (`pending`, `approved`, `rejected`, `cancelled`), `courseId`, and `learnerEmail` (case insensitive through normalization). For example: `GET /api/enrollment-requests?status=pending&courseId=course-001`.

## Change status

`PATCH /api/enrollment-requests/:id/status` accepts:

```json
{"status":"rejected","changedBy":"reviewer@example.org","reason":"Learner has not completed the prerequisite course."}
```

HTTP 200 returns the updated full request, including the appended history entry. For approval, `status` becomes `"approved"` and the new entry has `fromStatus: "pending"`, `toStatus: "approved"`, and the supplied `changedBy`. Allowed changes: pending → approved, rejected, or cancelled; approved → cancelled. Rejection needs a non-empty reason. Each change appends a history entry and updates `updatedAt`.

## Errors

Errors use `{ "error": { "code": "...", "message": "...", "details": [] } }`. Validation errors include a field detail.

| Endpoint | Case | HTTP | Code |
| --- | --- | ---: | --- |
| Create | Missing course | 404 | `COURSE_NOT_FOUND` |
| Create | Draft or retired course | 409 | `COURSE_NOT_ACTIVE` |
| Create | Invalid email or justification | 400 | `INVALID_REQUEST` |
| Create | Duplicate pending or approved request | 409 | `DUPLICATE_ACTIVE_REQUEST` |
| Retrieve or change status | Unknown request | 404 | `ENROLLMENT_REQUEST_NOT_FOUND` |
| List | Invalid status filter | 400 | `INVALID_QUERY_PARAMETER` |
| Change status | Invalid status or missing rejection reason | 400 | `INVALID_REQUEST` |
| Change status | Disallowed transition | 409 | `INVALID_STATUS_TRANSITION` |
