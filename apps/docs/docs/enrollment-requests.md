# Enrollment requests

Learners request a seat in an active course. Reviewers approve, reject, or cancel that request. Every creation and status change is kept on `statusHistory`.

Course search is unchanged: `GET /api/courses` still accepts `q`, `modality`, `status`, `tag`, `page`, `pageSize`, and `sort`.

Identifiers are MongoDB ObjectId strings. The sample catalog course `AI Security Foundations` is `000000000000000000000001`. A seeded pending request for `seed-learner@example.org` is `000000000000000000000101`.

## Create an enrollment request

```http
POST /api/enrollment-requests
Content-Type: application/json
```

```json
{
  "courseId": "000000000000000000000001",
  "learnerEmail": "learner@example.org",
  "justification": "I need this course to prepare for upcoming secure development work."
}
```

| Field | Rule |
| --- | --- |
| `courseId` | Required. The course must exist and have status `active`. |
| `learnerEmail` | Required. A valid email address. Stored in lowercase. |
| `justification` | Required. 20 to 500 characters after trimming. |

`200` returns the new request. `status` is `pending`. `changedBy` on the first history entry is `system`.

```json
{
  "id": "000000000000000000000101",
  "courseId": "000000000000000000000001",
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

## Read one request

```http
GET /api/enrollment-requests/000000000000000000000101
```

`200` returns the same object shape, including `statusHistory`.

## List requests

```http
GET /api/enrollment-requests?status=pending&courseId=000000000000000000000001&learnerEmail=learner@example.org
```

All three filters are optional. They combine with `AND`. `learnerEmail` is matched in lowercase.

`200` returns:

```json
{
  "items": []
}
```

Each item uses the same object shape as the create response. No matches return an empty `items` array.

| Parameter | Rule |
| --- | --- |
| `status` | `pending`, `approved`, `rejected`, or `cancelled`. |
| `courseId` | Non-empty course id. |
| `learnerEmail` | Non-empty email. Compared case-insensitively. |

## Update status

```http
PATCH /api/enrollment-requests/000000000000000000000101/status
Content-Type: application/json
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
| `status` | Required. `pending`, `approved`, `rejected`, or `cancelled`. |
| `changedBy` | Required. Reviewer or operator identifier. The API does not authenticate this value. |
| `reason` | Required and non-empty when `status` is `rejected`. Optional otherwise. |

`200` returns the updated request. The new history entry is appended. `fromStatus` is the previous status.

Allowed transitions:

| From | To |
| --- | --- |
| `pending` | `approved` |
| `pending` | `rejected` |
| `pending` | `cancelled` |
| `approved` | `cancelled` |

A learner may create another request for the same course after the earlier request is `rejected` or `cancelled`. A `pending` or `approved` request blocks a second one.

## Errors

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

| Situation | Status | Code |
| --- | --- | --- |
| Invalid email, justification, or status value | 400 | `INVALID_REQUEST` |
| Rejection without a reason | 400 | `INVALID_REQUEST` |
| Invalid list filters | 400 | `INVALID_REQUEST` |
| Course does not exist | 404 | `COURSE_NOT_FOUND` |
| Course is draft or retired | 409 | `COURSE_NOT_ACTIVE` |
| Duplicate pending or approved request | 409 | `DUPLICATE_ACTIVE_REQUEST` |
| Request id does not exist | 404 | `ENROLLMENT_REQUEST_NOT_FOUND` |
| Status transition is not allowed | 409 | `INVALID_STATUS_TRANSITION` |

## Example

```bash
curl -s -X POST "https://api.agentcourses.localhost/api/enrollment-requests" \
  -H "content-type: application/json" \
  -d '{"courseId":"000000000000000000000001","learnerEmail":"learner@example.org","justification":"I need this course to prepare for upcoming secure development work."}'
```
