# Enrollment requests

All endpoints use the `/api` prefix. Records are held in memory for this sample and reset when the API process restarts.

## Create

`POST /api/enrollment-requests` accepts JSON with `courseId`, `learnerEmail`, and `justification`. The course must exist and be active. Email must be valid; justification must contain 20–500 characters after trimming. Successful creation returns `201` with a pending request and an initial `statusHistory` entry.

```json
{"courseId":"course-001","learnerEmail":"learner@example.org","justification":"I need this training for my upcoming project."}
```

Response shape:

```json
{"id":"<generated UUID>","courseId":"course-001","learnerEmail":"learner@example.org","justification":"I need this training for my upcoming project.","status":"pending","createdAt":"<ISO timestamp>","updatedAt":"<ISO timestamp>","statusHistory":[{"fromStatus":null,"toStatus":"pending","changedAt":"<ISO timestamp>","changedBy":"system","reason":null}]}
```

## Read

`GET /api/enrollment-requests/:id` returns the complete request with history (`200`) or `404`. `GET /api/enrollment-requests` returns an array (`200`) and accepts optional exact filters `status`, `courseId`, and `learnerEmail` (email is case-insensitive). Invalid filters return `400`.

## Change status

`PATCH /api/enrollment-requests/:id/status` accepts `status`, `changedBy`, and optional `reason`. A non-empty reason is required for rejection. It returns the updated request (`200`), with a new history entry containing `fromStatus`, `toStatus`, `changedAt`, `changedBy`, and `reason`.

```json
{"status":"rejected","changedBy":"reviewer@example.org","reason":"Prerequisite training is incomplete."}
```

Allowed transitions: pending → approved, rejected, or cancelled; approved → cancelled. A duplicate pending or approved request for the same course and learner is rejected.

## Errors

Errors have `{ "error": { "code": "...", "message": "...", "details": [] } }` shape. Validation failures return `400 INVALID_REQUEST`; missing courses return `404 COURSE_NOT_FOUND`; inactive courses return `409 COURSE_NOT_ACTIVE`; duplicates return `409 DUPLICATE_ACTIVE_REQUEST`; missing enrollment requests return `404 ENROLLMENT_REQUEST_NOT_FOUND`; invalid transitions return `409 INVALID_STATUS_TRANSITION`.
