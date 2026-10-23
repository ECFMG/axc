# Enrollment requests

Learners submit enrollment requests for active courses. Reviewers approve, reject, or cancel those requests. Each create and status change appends a `statusHistory` entry.

## Request

```http
POST /api/enrollment-requests
Content-Type: application/json

GET /api/enrollment-requests
GET /api/enrollment-requests?status=pending&courseId=course-001&learnerEmail=learner@example.org
GET /api/enrollment-requests/:id

PATCH /api/enrollment-requests/:id/status
Content-Type: application/json
```

Create body fields: `courseId` (existing active course), `learnerEmail` (valid email), `justification` (20–500 characters).

List query parameters are optional: `status` (`pending`, `approved`, `rejected`, `cancelled`), `courseId`, `learnerEmail`.

Status patch body: `status`, `changedBy`, and `reason` (required and non-empty when `status` is `rejected`).

Valid transitions: `pending` → `approved`, `pending` → `rejected`, `pending` → `cancelled`, `approved` → `cancelled`.

## Response

`POST` returns `201` with the created request (`status` is `pending`). `GET` by id and `PATCH` return the request object. `GET` list returns `{ "items": [ ... ] }`.

Request object fields: `id`, `courseId`, `learnerEmail`, `justification`, `status`, `createdAt`, `updatedAt`, `statusHistory`.

`statusHistory[]` fields: `fromStatus` (`null` on create), `toStatus`, `changedAt`, `changedBy`, `reason`.

Error body:

```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "The request could not be completed.",
    "details": [{ "field": "justification", "message": "justification must be between 20 and 500 characters." }]
  }
}
```

| Scenario | Status | Code |
| --- | --- | --- |
| Invalid body or query | 400 | `INVALID_REQUEST` |
| Course does not exist | 404 | `COURSE_NOT_FOUND` |
| Course is not active | 409 | `COURSE_NOT_ACTIVE` |
| Duplicate pending or approved request | 409 | `DUPLICATE_ACTIVE_REQUEST` |
| Request not found | 404 | `ENROLLMENT_REQUEST_NOT_FOUND` |
| Invalid status transition | 409 | `INVALID_STATUS_TRANSITION` |
| Rejection without reason | 400 | `INVALID_REQUEST` |

## Example

```json
{
  "id": "enroll-001",
  "courseId": "course-001",
  "learnerEmail": "learner@example.org",
  "justification": "I need this course to prepare for upcoming secure development work.",
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
