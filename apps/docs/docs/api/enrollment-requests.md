# Enrollment requests

Enrollment requests are stored in memory in this sample API. No authentication is required; `changedBy` is an operator identifier supplied by the caller.

## Create

`POST /api/enrollment-requests` accepts JSON with `courseId`, `learnerEmail`, and `justification`. The course must exist and be active. Email is normalized to lowercase. Justification is trimmed and must contain 20–500 characters. The response is HTTP 201 with the created request, initially `pending`.

```json
{"courseId":"course-001","learnerEmail":"learner@example.org","justification":"I need this course for secure development work."}
```

The response has `id`, `courseId`, `learnerEmail`, `justification`, `status`, `createdAt`, `updatedAt`, and `statusHistory`. The first history entry has `fromStatus: null`, `toStatus: "pending"`, `changedBy: "system"`, a `changedAt` timestamp, and `reason: null`.

Errors: HTTP 400 `INVALID_REQUEST` for malformed input, HTTP 404 `COURSE_NOT_FOUND`, HTTP 409 `COURSE_NOT_ACTIVE`, or HTTP 409 `DUPLICATE_ACTIVE_REQUEST`. A duplicate means the same learner and course have a pending or approved request. A rejected or cancelled request does not block a new one.

## Retrieve and list

`GET /api/enrollment-requests/:id` returns HTTP 200 with the complete request including history. A missing ID returns HTTP 404 `ENROLLMENT_REQUEST_NOT_FOUND`.

`GET /api/enrollment-requests` returns HTTP 200 with an array of complete requests. Optional filters `status`, `courseId`, and `learnerEmail` may be combined. Invalid or unknown filters return HTTP 400 `INVALID_QUERY_PARAMETER`.

```http
GET /api/enrollment-requests?status=pending&courseId=course-001&learnerEmail=learner@example.org
```

## Change status

`PATCH /api/enrollment-requests/:id/status` accepts JSON with `status`, `changedBy`, and optional `reason`. It returns HTTP 200 with the updated complete request. Every successful change appends a `statusHistory` entry with the previous and new statuses, time, operator, and reason.

```json
{"status":"rejected","changedBy":"reviewer@example.org","reason":"Prerequisite course is incomplete."}
```

Allowed transitions: pending to approved, rejected, or cancelled; approved to cancelled. Rejection requires a non-empty reason. Errors: HTTP 400 `INVALID_REQUEST` for invalid status, missing operator, or missing rejection reason; HTTP 404 `ENROLLMENT_REQUEST_NOT_FOUND`; HTTP 409 `INVALID_STATUS_TRANSITION`.

All errors use `{ "error": { "code": "...", "message": "...", "details": [{ "field": "...", "message": "..." }] } }`. Details can be empty when no input field caused the error.
