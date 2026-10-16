# Enrollment requests

Enrollment requests are stored in memory for the sample application. They reset when the API process restarts. There is no authentication or external integration in this workflow.

## Create

`POST /api/enrollment-requests` with JSON body:

```json
{
  "courseId": "course-001",
  "learnerEmail": "learner@example.org",
  "justification": "I need this course to prepare for secure development work."
}
```

The course must exist and be `active`. The email must be valid; justification must contain 20–500 characters after trimming. Emails are stored in lowercase. Success returns `201` and the created request:

```json
{
  "id": "enroll-<generated UUID>",
  "courseId": "course-001",
  "learnerEmail": "learner@example.org",
  "justification": "I need this course to prepare for secure development work.",
  "status": "pending",
  "createdAt": "2026-06-27T10:00:00.000Z",
  "updatedAt": "2026-06-27T10:00:00.000Z",
  "statusHistory": [{
    "fromStatus": null,
    "toStatus": "pending",
    "changedAt": "2026-06-27T10:00:00.000Z",
    "changedBy": "system",
    "reason": null
  }]
}
```

A learner can have only one `pending` or `approved` request per course. A new request is allowed after rejection or cancellation.

## Retrieve and filter

`GET /api/enrollment-requests/:id` returns the same request object with its full `statusHistory` (`200`).

`GET /api/enrollment-requests` returns an array of request objects (`200`). Optional query parameters are `status` (`pending`, `approved`, `rejected`, `cancelled`), `courseId`, and `learnerEmail`; filters combine with AND. Email matching is case insensitive. Unknown, empty, repeated, or invalid query parameters return `400`.

Example: `GET /api/enrollment-requests?status=pending&courseId=course-001&learnerEmail=learner@example.org`

## Change status

`PATCH /api/enrollment-requests/:id/status` with JSON body:

```json
{ "status": "approved", "changedBy": "reviewer@example.org" }
```

For rejection, include a non-empty reason:

```json
{
  "status": "rejected",
  "changedBy": "reviewer@example.org",
  "reason": "Learner has not completed the prerequisite course."
}
```

Success returns the updated request (`200`) with a new status history entry. Allowed transitions: `pending` → `approved`, `rejected`, or `cancelled`; `approved` → `cancelled`. Rejected and cancelled requests have no further transitions.

## Errors

Errors use `{ "error": { "code": "...", "message": "...", "details": [...] } }`. Validation details contain `field` and `message`.

| Condition | HTTP | Code |
| --- | --- | --- |
| Malformed JSON, invalid email, justification, status, changedBy, or missing rejection reason | 400 | `INVALID_REQUEST` |
| Invalid list filter | 400 | `INVALID_QUERY_PARAMETER` |
| Missing course | 404 | `COURSE_NOT_FOUND` |
| Missing request | 404 | `ENROLLMENT_REQUEST_NOT_FOUND` |
| Draft or retired course | 409 | `COURSE_NOT_ACTIVE` |
| Existing pending or approved request for learner/course | 409 | `DUPLICATE_ACTIVE_REQUEST` |
| Disallowed status transition | 409 | `INVALID_STATUS_TRANSITION` |
