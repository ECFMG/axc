# Enrollment requests

A learner requests a seat in an active course. Reviewers then approve, reject, or cancel the request. Every request carries a `statusHistory` audit trail: one entry when it is created and one more for each status change.

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/enrollment-requests` | [Create a request](#create-a-request) |
| `GET` | `/api/enrollment-requests/{id}` | [Get a request by id](#get-a-request-by-id) |
| `GET` | `/api/enrollment-requests` | [List and filter requests](#list-requests) |
| `PATCH` | `/api/enrollment-requests/{id}/status` | [Change a request's status](#change-the-status) |

The API has no end-user authentication; every call runs with the system identity.

## Enrollment request

| Field | Type | Notes |
| --- | --- | --- |
| `id` | string | Unique request ID (24-character hex). |
| `courseId` | string | The [course](./courses.md) the learner asked to join. |
| `learnerEmail` | string | Stored trimmed and lowercase. |
| `justification` | string | 20 to 500 characters, stored trimmed. |
| `status` | enum | `pending`, `approved`, `rejected`, or `cancelled`. |
| `createdAt`, `updatedAt` | string | ISO-8601 timestamps. |
| `statusHistory` | array | Audit trail, oldest first. See below. |

### Status history entry

| Field | Type | Notes |
| --- | --- | --- |
| `fromStatus` | string or null | `null` for the entry written at creation. |
| `toStatus` | string | The new status. |
| `changedAt` | string | ISO-8601 time of the change. |
| `changedBy` | string | `system` for creation; otherwise the `changedBy` sent with the status change. |
| `reason` | string or null | The reason sent with the change, or `null`. Always present for rejections. |

### Status workflow

```text
pending ──► approved ──► cancelled
   │
   ├──────► rejected
   └──────► cancelled
```

| From | Allowed next status |
| --- | --- |
| `pending` | `approved`, `rejected`, `cancelled` |
| `approved` | `cancelled` |
| `rejected` | none (final) |
| `cancelled` | none (final) |

Any other change, including setting the current status again, returns `409 INVALID_STATUS_TRANSITION`.

## Create a request

```http
POST /api/enrollment-requests
Content-Type: application/json
```

```json
{
  "courseId": "650000000000000000000001",
  "learnerEmail": "learner@example.org",
  "justification": "I need this course to prepare for upcoming secure development work."
}
```

| Field | Required | Rules |
| --- | --- | --- |
| `courseId` | yes | Must identify an existing course whose `status` is `active`. |
| `learnerEmail` | yes | A valid email address (one `@`, no spaces, a dotted domain; at most 254 characters). |
| `justification` | yes | 20 to 500 characters after trimming. |

Rules applied:

- New requests always start as `pending`, with one `statusHistory` entry from `null` to `pending` by `system`.
- A learner may hold only one active (`pending` or `approved`) request per course. Emails are compared case-insensitively. A `rejected` or `cancelled` request does not block a new one.

`201` with the new request:

```json
{
  "id": "6611f0c2a4b5c6d7e8f90123",
  "courseId": "650000000000000000000001",
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

| Error | Status | Code |
| --- | --- | --- |
| Body is not a JSON object, a field is missing, the email is invalid, or the justification length is outside 20 to 500 | 400 | `INVALID_REQUEST` |
| No course with `courseId` | 404 | `COURSE_NOT_FOUND` |
| The course is `draft` or `retired` | 409 | `COURSE_NOT_ACTIVE` |
| The learner already has a `pending` or `approved` request for the course | 409 | `DUPLICATE_ACTIVE_REQUEST` |

## Get a request by id

```http
GET /api/enrollment-requests/{id}
```

`200` with the [enrollment request](#enrollment-request), including its full `statusHistory`.

| Error | Status | Code |
| --- | --- | --- |
| No request with this id (including ids that are not 24-character hex) | 404 | `ENROLLMENT_REQUEST_NOT_FOUND` |

## List requests

```http
GET /api/enrollment-requests?status=pending&courseId=650000000000000000000001&learnerEmail=learner@example.org
```

| Parameter | Default | Rules |
| --- | --- | --- |
| `status` | none | `pending`, `approved`, `rejected`, or `cancelled`. |
| `courseId` | none | Exact course id. |
| `learnerEmail` | none | Exact email, compared case-insensitively. |
| `page` | `1` | 1 or greater. |
| `pageSize` | `10` | Between 1 and 50. |

All filters are optional and combine with AND. Results are ordered by `createdAt`, oldest first.

`200` with a page of requests:

```json
{
  "items": [
    {
      "id": "6611f0c2a4b5c6d7e8f90123",
      "courseId": "650000000000000000000001",
      "learnerEmail": "learner@example.org",
      "justification": "I need this course to prepare for upcoming secure development work.",
      "status": "pending",
      "createdAt": "2026-06-27T10:00:00.000Z",
      "updatedAt": "2026-06-27T10:00:00.000Z",
      "statusHistory": [
        { "fromStatus": null, "toStatus": "pending", "changedAt": "2026-06-27T10:00:00.000Z", "changedBy": "system", "reason": null }
      ]
    }
  ],
  "page": 1,
  "pageSize": 10,
  "totalItems": 1,
  "totalPages": 1
}
```

| Error | Status | Code |
| --- | --- | --- |
| Invalid `status`, `page`, or `pageSize`, or an unknown or repeated parameter | 400 | `INVALID_REQUEST` |

## Change the status

```http
PATCH /api/enrollment-requests/{id}/status
Content-Type: application/json
```

Approve:

```json
{
  "status": "approved",
  "changedBy": "reviewer@example.org"
}
```

Reject (a reason is required):

```json
{
  "status": "rejected",
  "changedBy": "reviewer@example.org",
  "reason": "Learner has not completed the prerequisite course."
}
```

| Field | Required | Rules |
| --- | --- | --- |
| `status` | yes | `pending`, `approved`, `rejected`, or `cancelled`, and allowed by the [workflow](#status-workflow). |
| `changedBy` | yes | Non-empty identifier of the reviewer or operator, at most 254 characters. Recorded in `statusHistory`. |
| `reason` | for `rejected` | Non-empty when `status` is `rejected`; optional otherwise. At most 500 characters. Recorded in `statusHistory`. |

`200` with the updated request. Its `statusHistory` ends with the new entry:

```json
{
  "id": "6611f0c2a4b5c6d7e8f90123",
  "courseId": "650000000000000000000001",
  "learnerEmail": "learner@example.org",
  "justification": "I need this course to prepare for upcoming secure development work.",
  "status": "rejected",
  "createdAt": "2026-06-27T10:00:00.000Z",
  "updatedAt": "2026-06-28T09:30:00.000Z",
  "statusHistory": [
    { "fromStatus": null, "toStatus": "pending", "changedAt": "2026-06-27T10:00:00.000Z", "changedBy": "system", "reason": null },
    { "fromStatus": "pending", "toStatus": "rejected", "changedAt": "2026-06-28T09:30:00.000Z", "changedBy": "reviewer@example.org", "reason": "Learner has not completed the prerequisite course." }
  ]
}
```

| Error | Status | Code |
| --- | --- | --- |
| `status` missing or not an allowed value, `changedBy` missing, or `reason` not a string | 400 | `INVALID_REQUEST` |
| `status` is `rejected` and `reason` is missing or blank | 400 | `INVALID_REQUEST` |
| No request with this id | 404 | `ENROLLMENT_REQUEST_NOT_FOUND` |
| The workflow does not allow the change (for example `rejected` to `approved`), or another reviewer changed the request at the same time | 409 | `INVALID_STATUS_TRANSITION` |

A rejected change leaves the request and its `statusHistory` unchanged.

## Error response format

All errors use the same shape as [course search](./courses.md#error-response). `details` lists each invalid field for `400` responses and is empty otherwise.

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

| Scenario | Status | Code |
| --- | --- | --- |
| Course does not exist | 404 | `COURSE_NOT_FOUND` |
| Course is not active | 409 | `COURSE_NOT_ACTIVE` |
| Invalid learner email | 400 | `INVALID_REQUEST` |
| Justification too short or too long | 400 | `INVALID_REQUEST` |
| Duplicate pending or approved request | 409 | `DUPLICATE_ACTIVE_REQUEST` |
| Request not found | 404 | `ENROLLMENT_REQUEST_NOT_FOUND` |
| Invalid status value | 400 | `INVALID_REQUEST` |
| Invalid status transition | 409 | `INVALID_STATUS_TRANSITION` |
| Rejection without reason | 400 | `INVALID_REQUEST` |

## Example flow

```bash
API=https://api.agentcourses.localhost

# Create
curl -s -X POST "$API/api/enrollment-requests" -H 'Content-Type: application/json' \
  -d '{"courseId":"650000000000000000000001","learnerEmail":"learner@example.org","justification":"I need this course to prepare for upcoming secure development work."}'

# Approve (use the id returned above)
curl -s -X PATCH "$API/api/enrollment-requests/<id>/status" -H 'Content-Type: application/json' \
  -d '{"status":"approved","changedBy":"reviewer@example.org"}'

# List the learner's approved requests
curl -s "$API/api/enrollment-requests?learnerEmail=learner@example.org&status=approved"
```
