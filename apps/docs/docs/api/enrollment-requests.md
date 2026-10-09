# Enrollment requests API

An enrollment request records a learner's request for an active course. The sample API uses process-local memory; restarting the API clears requests. No authentication is implemented. Supply a reviewer/operator identifier in `changedBy` for status changes.

All errors use `{ "error": { "code": "...", "message": "...", "details": [] } }`. Validation errors include field-specific `details`.

## Create

`POST /api/enrollment-requests` with JSON `{ "courseId": "course-001", "learnerEmail": "learner@example.org", "justification": "I need this course for secure development work." }`.

`courseId` must identify an active course. `learnerEmail` must be a valid email address; it is stored lowercased. `justification` must have 20–500 characters after trimming. A learner may have only one pending or approved request for a course.

**201:** `{ "id": "enroll-001", "courseId": "course-001", "learnerEmail": "learner@example.org", "justification": "I need this course for secure development work.", "status": "pending", "createdAt": "2026-06-27T10:00:00.000Z", "updatedAt": "2026-06-27T10:00:00.000Z", "statusHistory": [{ "fromStatus": null, "toStatus": "pending", "changedAt": "2026-06-27T10:00:00.000Z", "changedBy": "system", "reason": null }] }`. Timestamps and IDs vary.

Errors: **400 `INVALID_REQUEST`** for invalid input; **404 `COURSE_NOT_FOUND`**; **409 `COURSE_NOT_ACTIVE`** or **409 `DUPLICATE_ACTIVE_REQUEST`**.

## Retrieve

`GET /api/enrollment-requests/:id` returns the full request, including `statusHistory`, with **200**. A missing ID returns **404 `ENROLLMENT_REQUEST_NOT_FOUND`**.

## List

`GET /api/enrollment-requests` accepts optional `status` (`pending`, `approved`, `rejected`, `cancelled`), `courseId`, and `learnerEmail` query filters. Filters combine with AND; email matching is case-insensitive. **200:** `{ "items": [<enrollment request objects>] }`, including an empty array for no matches. Invalid or repeated filters return **400 `INVALID_QUERY_PARAMETER`**.

## Change status

`PATCH /api/enrollment-requests/:id/status` with JSON `{ "status": "approved", "changedBy": "reviewer@example.org" }`. For rejection, use `{ "status": "rejected", "changedBy": "reviewer@example.org", "reason": "Missing prerequisite." }`; a non-empty reason is required. Allowed transitions: pending to approved, rejected, or cancelled; approved to cancelled. Each successful change appends a history entry with prior status, new status, timestamp, operator, and optional reason.

**200:** The full updated enrollment request in the same shape as the create response, with updated `status`, `updatedAt`, and `statusHistory`.

Errors: **400 `INVALID_REQUEST`** for invalid status, missing `changedBy`, or missing rejection reason; **404 `ENROLLMENT_REQUEST_NOT_FOUND`**; **409 `INVALID_STATUS_TRANSITION`**.
