---
title: Enrollment requests
sidebar_label: Enrollment requests
description: Create and review course enrollment requests.
---

# Enrollment requests

A learner can request enrollment in an active course. Reviewers can list requests and approve, reject, or cancel them. `@axc/rest` serves the routes, `@axc/application-services` enforces the rules, and `@axc/persistence` keeps the requests in memory for the life of the API process.

There is no authentication on these sample routes. `changedBy` is the caller-supplied reviewer or operator identifier. Creation records `changedBy` as `system`.

Emails are trimmed and compared case-insensitively. Justification is trimmed before the length check and is stored without surrounding whitespace. The stored email keeps the caller's casing after trimming.

## Create an enrollment request

```http
POST /api/enrollment-requests
```

```json
{
  "courseId": "course-001",
  "learnerEmail": "learner@example.org",
  "justification": "I need this course to prepare for upcoming secure development work."
}
```

| Field | Rule |
| --- | --- |
| `courseId` | Required. Must be the id of an existing course whose status is `active`. |
| `learnerEmail` | Required. Must be a valid email address. |
| `justification` | Required. 20–500 characters after trimming. |

A successful create returns `201` and a pending request. The first request in a process is `enroll-001`.

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

`status` on the request is always `pending`. A client cannot set it.

## Get one enrollment request

```http
GET /api/enrollment-requests/enroll-001
```

`200` returns the same object shape as create, including `statusHistory`.

## List enrollment requests

```http
GET /api/enrollment-requests?status=pending&courseId=course-001&learnerEmail=learner@example.org
```

All three filters are optional and combine with AND. `learnerEmail` matches case-insensitively. Results are ordered by `createdAt`, then `id`.

| Name | Rule |
| --- | --- |
| `status` | `pending`, `approved`, `rejected`, or `cancelled`. |
| `courseId` | Non-empty course id. An unknown id returns an empty list. |
| `learnerEmail` | Valid email address. |

`200` response:

```json
{
  "items": []
}
```

Each item is a full enrollment request, including `statusHistory`. Repeated parameters, unknown parameters, and invalid filter values return `400`.

## Update status

```http
PATCH /api/enrollment-requests/enroll-001/status
```

Approval:

```json
{
  "status": "approved",
  "changedBy": "reviewer@example.org"
}
```

Rejection:

```json
{
  "status": "rejected",
  "changedBy": "reviewer@example.org",
  "reason": "Learner has not completed the prerequisite course."
}
```

| Field | Rule |
| --- | --- |
| `status` | `approved`, `rejected`, or `cancelled`. |
| `changedBy` | Required non-empty reviewer or operator identifier. |
| `reason` | Required, non-empty, when `status` is `rejected`. Optional for approval and cancellation. A blank value is stored as `null`. |

`200` returns the updated request. `updatedAt` changes, and one `statusHistory` entry is appended.

### Allowed transitions

| From | To |
| --- | --- |
| `pending` | `approved`, `rejected`, `cancelled` |
| `approved` | `cancelled` |

Any other change returns `409`. A rejected or cancelled request stays in that status. The learner can submit a new request for the same course after the earlier request is `rejected` or `cancelled`.

A learner cannot have more than one `pending` or `approved` request for the same course.

## Error response

Errors use the course catalog envelope:

```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "The request could not be completed.",
    "details": [
      {
        "field": "justification",
        "message": "justification must be between 20 and 500 characters."
      }
    ]
  }
}
```

| Situation | HTTP | `error.code` |
| --- | --- | --- |
| Invalid email, justification, status, or body | 400 | `INVALID_REQUEST` |
| Course does not exist | 404 | `COURSE_NOT_FOUND` |
| Request does not exist | 404 | `ENROLLMENT_REQUEST_NOT_FOUND` |
| Course is `draft` or `retired` | 409 | `COURSE_NOT_ACTIVE` |
| Learner already has a pending or approved request for the course | 409 | `DUPLICATE_ACTIVE_REQUEST` |
| Status change is not one of the allowed transitions | 409 | `INVALID_STATUS_TRANSITION` |
| Rejection omits a non-empty reason | 400 | `INVALID_REQUEST` |

Invalid JSON and a non-object JSON body return `400` with `INVALID_REQUEST`.

## Example

```bash
curl -s -X POST https://api.agentcourses.localhost/api/enrollment-requests \
  -H 'content-type: application/json' \
  -d '{"courseId":"course-001","learnerEmail":"learner@example.org","justification":"I need this course to prepare for upcoming secure development work."}'
```

Course ids come from [Course catalog](./courses.md). The storage decision is recorded in [Enrollment request workflow](../decisions/enrollment-requests.md).
