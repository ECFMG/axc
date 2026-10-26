---
id: enrollment-requests
title: Enrollment requests
---

# Enrollment requests

A learner asks to join an **active** course; a reviewer approves, rejects or cancels. Storage is in-memory (resets on restart).

## Resource

| Field | Type | Notes |
| --- | --- | --- |
| `id` | string | `enroll-001`, … |
| `courseId` | string | Existing active course |
| `learnerEmail` | string | Valid email, stored lower-case |
| `justification` | string | 20–500 characters (trimmed) |
| `status` | `pending` \| `approved` \| `rejected` \| `cancelled` | Starts `pending` |
| `createdAt`, `updatedAt` | ISO string | |
| `statusHistory` | array | One entry per creation and status change |

`statusHistory[]`: `fromStatus` (`null` on creation), `toStatus`, `changedAt`, `changedBy` (`system` on creation), `reason` (string or `null`).

## `POST /api/enrollment-requests`

```json
{
  "courseId": "course-001",
  "learnerEmail": "learner@example.org",
  "justification": "I need this course to prepare for upcoming secure development work."
}
```

`201`:

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
    { "fromStatus": null, "toStatus": "pending", "changedAt": "2026-06-27T10:00:00.000Z", "changedBy": "system", "reason": null }
  ]
}
```

A learner may hold at most one `pending` or `approved` request per course (email compared case-insensitively).

## `GET /api/enrollment-requests/:id`

`200` with the resource above, including `statusHistory`.

## `GET /api/enrollment-requests`

Optional filters, combined with AND: `status`, `courseId`, `learnerEmail`. `200` with an array of resources (possibly empty).

```bash
curl 'http://localhost:7071/api/enrollment-requests?status=pending&courseId=course-001&learnerEmail=learner@example.org'
```

## `PATCH /api/enrollment-requests/:id/status`

```json
{ "status": "rejected", "changedBy": "reviewer@example.org", "reason": "Learner has not completed the prerequisite course." }
```

`changedBy` is required; `reason` is required for `rejected`, optional otherwise. `200` with the updated resource; a history entry is appended.

| From | Allowed to |
| --- | --- |
| `pending` | `approved`, `rejected`, `cancelled` |
| `approved` | `cancelled` |
| `rejected`, `cancelled` | — (terminal) |

## Errors

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
| Malformed JSON, missing `courseId`, invalid email, justification out of range | 400 | `INVALID_REQUEST` |
| Unknown `status` value (PATCH body or list filter), missing `changedBy` | 400 | `INVALID_REQUEST` |
| Rejection without a reason | 400 | `INVALID_REQUEST` |
| Course does not exist | 404 | `COURSE_NOT_FOUND` |
| Request does not exist | 404 | `ENROLLMENT_REQUEST_NOT_FOUND` |
| Course is `draft` or `retired` | 409 | `COURSE_NOT_ACTIVE` |
| Learner already has a pending/approved request for the course | 409 | `DUPLICATE_ACTIVE_REQUEST` |
| Transition not in the table above | 409 | `INVALID_STATUS_TRANSITION` |
