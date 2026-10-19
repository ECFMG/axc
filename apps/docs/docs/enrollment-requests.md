# Enrollment requests

The enrollment request endpoints let a learner ask to enroll in an active course, and let a reviewer approve, reject, or cancel that request. Every request keeps an audit trail of its status changes in `statusHistory`.

| Method | Path | Purpose | Success |
| --- | --- | --- | --- |
| `POST` | `/api/enrollment-requests` | Create a request | `201` |
| `GET` | `/api/enrollment-requests/:id` | Get one request by ID | `200` |
| `GET` | `/api/enrollment-requests` | List requests, with optional filters | `200` |
| `PATCH` | `/api/enrollment-requests/:id/status` | Change a request's status | `200` |

The routes are served by `@axc/rest`. Validation, duplicate prevention, status transitions, and the audit trail happen in `@axc/application-services`. Requests are kept by an in-memory repository in `@axc/persistence`, which `@apps/api` wires in at startup. Courses are looked up in the same in-memory catalog that backs [`GET /api/courses`](courses.md). No database or external service is involved.

## Limitations

- **Data is in memory.** Enrollment requests are lost when the API restarts. IDs start again at `enroll-001`.
- **No authentication.** Anyone who can reach the API can create, read, and change requests. `changedBy` is an identifier the caller supplies. The API does not check it.

## Enrollment request

Every endpoint that returns a request uses this shape:

| Field | Type | Meaning |
| --- | --- | --- |
| `id` | string | Unique request ID, assigned by the API: `enroll-001`, `enroll-002`, and so on. |
| `courseId` | string | ID of the course the learner wants to enroll in. |
| `learnerEmail` | string | The learner's email address, trimmed and stored in lowercase. |
| `justification` | string | Why the learner wants the course, trimmed. 20 to 500 characters. |
| `status` | string | `pending`, `approved`, `rejected`, or `cancelled`. |
| `createdAt` | string | ISO-8601 creation time. |
| `updatedAt` | string | ISO-8601 time of the last status change. Equal to `createdAt` until the first change. |
| `statusHistory` | array | The audit trail, oldest entry first. See [Audit trail](#audit-trail). |

## Create a request

```http
POST /api/enrollment-requests
Content-Type: application/json
```

```json
{
  "courseId": "course-001",
  "learnerEmail": "learner@example.org",
  "justification": "I need this course to prepare for upcoming secure development work."
}
```

The body must be a JSON object with exactly these fields:

| Field | Type | Required | Rules |
| --- | --- | --- | --- |
| `courseId` | string | Yes | Must not be empty. Must be the ID of an existing course whose `status` is `active`. |
| `learnerEmail` | string | Yes | Trimmed, then must be a valid email address of the form `local@domain.tld`: exactly one `@`, no spaces, and at most 254 characters. Stored in lowercase. |
| `justification` | string | Yes | Trimmed, then must be between 20 and 500 characters. |

Any other field in the body is rejected with `400`.

### Success response

`201` with the new request. It always starts in `pending`, with one history entry made by `system`.

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

### Duplicate prevention

A learner may have at most one active request for a course. A request is active while its status is `pending` or `approved`.

- A new request is rejected with `409 DUPLICATE_ACTIVE_REQUEST` when a `pending` or `approved` request already exists for the same `courseId` and `learnerEmail`.
- Emails are compared without regard to case, so `Learner@Example.org` and `learner@example.org` are the same learner.
- `rejected` and `cancelled` requests do not count. After a request is rejected or cancelled, the learner may submit a new one for the same course.

### Errors

Checks run in this order, and the first failing step decides the response:

1. Body validation: `400 INVALID_REQUEST`, with every invalid field listed in `details`.
2. Course exists: `404 COURSE_NOT_FOUND`.
3. Course is active: `409 COURSE_NOT_ACTIVE` when the course is `draft` or `retired`.
4. No active duplicate: `409 DUPLICATE_ACTIVE_REQUEST`.

| Scenario | Status | Code |
| --- | --- | --- |
| Body is not valid JSON, or is not a JSON object | `400` | `INVALID_REQUEST` |
| A required field is missing, or is not a string | `400` | `INVALID_REQUEST` |
| `courseId` is empty | `400` | `INVALID_REQUEST` |
| `learnerEmail` is not a valid email address, or is longer than 254 characters | `400` | `INVALID_REQUEST` |
| `justification` is shorter than 20 or longer than 500 characters after trimming | `400` | `INVALID_REQUEST` |
| The body has a field other than `courseId`, `learnerEmail`, and `justification` | `400` | `INVALID_REQUEST` |
| No course has this `courseId` | `404` | `COURSE_NOT_FOUND` |
| The course is `draft` or `retired` | `409` | `COURSE_NOT_ACTIVE` |
| The learner already has a `pending` or `approved` request for this course | `409` | `DUPLICATE_ACTIVE_REQUEST` |

## Get a request by ID

```http
GET /api/enrollment-requests/enroll-001
```

`200` with the [enrollment request](#enrollment-request), including its full `statusHistory`. The body has the same shape as the create response.

| Scenario | Status | Code |
| --- | --- | --- |
| No request has this ID | `404` | `ENROLLMENT_REQUEST_NOT_FOUND` |

## List requests

```http
GET /api/enrollment-requests?status=pending&courseId=course-001&learnerEmail=learner@example.org
```

Every parameter is optional. Without parameters, every request is returned.

| Parameter | Type | Allowed values | Matching |
| --- | --- | --- | --- |
| `status` | enum | `pending`, `approved`, `rejected`, `cancelled` | Exact match. |
| `courseId` | string | Any course ID | Exact match, after trimming. |
| `learnerEmail` | string | Any email address | Exact match, ignoring case, after trimming. |

Rules that apply to every parameter:

- Filters are combined with AND. A request is returned only when it matches every filter given.
- Each parameter may appear at most once.
- Any other parameter name is rejected.
- All invalid parameters are reported together in one response.

The `courseId` and `learnerEmail` values are trimmed before matching. An empty or whitespace-only value is treated as no filter, so `?courseId=` returns the same result as leaving `courseId` out.

### Success response

`200` with the matching requests, sorted by `createdAt`, oldest first. Requests created at the same time are ordered by `id`, ascending. The list is not paginated.

```json
{
  "items": [
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
  ],
  "totalItems": 1
}
```

| Field | Meaning |
| --- | --- |
| `items` | The matching [enrollment requests](#enrollment-request). |
| `totalItems` | The number of matching requests. |

A filter that matches nothing is not an error. It returns `200` with `"items": []` and `"totalItems": 0`.

### Errors

| Scenario | Status | Code |
| --- | --- | --- |
| `status` is not one of the four statuses | `400` | `INVALID_REQUEST` |
| A parameter appears more than once | `400` | `INVALID_REQUEST` |
| An unsupported parameter is given | `400` | `INVALID_REQUEST` |

## Update a request's status

```http
PATCH /api/enrollment-requests/enroll-001/status
Content-Type: application/json
```

Approval:

```json
{
  "status": "approved",
  "changedBy": "reviewer@example.org"
}
```

Rejection, which needs a reason:

```json
{
  "status": "rejected",
  "changedBy": "reviewer@example.org",
  "reason": "Learner has not completed the prerequisite course."
}
```

The body must be a JSON object with only these fields:

| Field | Type | Required | Rules |
| --- | --- | --- | --- |
| `status` | string | Yes | One of `pending`, `approved`, `rejected`, `cancelled`. The transition from the current status must be allowed (see below). |
| `changedBy` | string | Yes | Identifier of the reviewer or operator. Trimmed, then must not be empty, and at most 200 characters. Not verified, see [Limitations](#limitations). |
| `reason` | string | Only when `status` is `rejected` | Trimmed, at most 500 characters. An empty value is stored as `null`. When `status` is `rejected`, it must not be empty. |

Any other field in the body is rejected with `400`.

### Status transitions

| From | To | Allowed |
| --- | --- | --- |
| `pending` | `approved` | Yes |
| `pending` | `rejected` | Yes |
| `pending` | `cancelled` | Yes |
| `approved` | `cancelled` | Yes |
| any status | the same status | No |
| `approved` | `pending` or `rejected` | No |
| `rejected` | any status | No |
| `cancelled` | any status | No |

Only the four transitions marked "Yes" are allowed. `rejected` and `cancelled` are final. A transition that is not allowed returns `409 INVALID_STATUS_TRANSITION`, including a change to the status the request already has.

### Success response

`200` with the updated request. `status` and `updatedAt` change, and one entry is appended to `statusHistory`. For example, after rejecting `enroll-001`:

```json
{
  "id": "enroll-001",
  "courseId": "course-001",
  "learnerEmail": "learner@example.org",
  "justification": "I need this course to prepare for upcoming secure development work.",
  "status": "rejected",
  "createdAt": "2026-06-27T10:00:00.000Z",
  "updatedAt": "2026-06-28T09:30:00.000Z",
  "statusHistory": [
    {
      "fromStatus": null,
      "toStatus": "pending",
      "changedAt": "2026-06-27T10:00:00.000Z",
      "changedBy": "system",
      "reason": null
    },
    {
      "fromStatus": "pending",
      "toStatus": "rejected",
      "changedAt": "2026-06-28T09:30:00.000Z",
      "changedBy": "reviewer@example.org",
      "reason": "Learner has not completed the prerequisite course."
    }
  ]
}
```

### Errors

Checks run in this order, and the first failing step decides the response:

1. Body validation: `400 INVALID_REQUEST`, with every invalid field listed in `details`.
2. Request exists: `404 ENROLLMENT_REQUEST_NOT_FOUND`.
3. Transition is allowed: `409 INVALID_STATUS_TRANSITION`.

| Scenario | Status | Code |
| --- | --- | --- |
| Body is not valid JSON, or is not a JSON object | `400` | `INVALID_REQUEST` |
| `status` is missing, or is not one of the four statuses | `400` | `INVALID_REQUEST` |
| `changedBy` is missing, empty, or longer than 200 characters | `400` | `INVALID_REQUEST` |
| `reason` is not a string, or is longer than 500 characters | `400` | `INVALID_REQUEST` |
| `status` is `rejected` and `reason` is missing or empty | `400` | `INVALID_REQUEST` |
| The body has a field other than `status`, `changedBy`, and `reason` | `400` | `INVALID_REQUEST` |
| No request has this ID | `404` | `ENROLLMENT_REQUEST_NOT_FOUND` |
| The transition is not in the table above, or the status is unchanged | `409` | `INVALID_STATUS_TRANSITION` |

## Audit trail

`statusHistory` records every status a request has had, oldest first. Entries are only appended, never changed or removed.

- Creation adds the first entry, from `null` to `pending`, with `changedBy` set to `system` and `reason` set to `null`.
- Each successful status change adds one entry.
- A failed request (any `4xx`) adds no entry.

| Field | Type | Meaning |
| --- | --- | --- |
| `fromStatus` | string or null | Status before the change. `null` for the creation entry. |
| `toStatus` | string | Status after the change. |
| `changedAt` | string | ISO-8601 time of the change. Equal to the request's `updatedAt` for the latest entry. |
| `changedBy` | string | `system` for creation. Otherwise the `changedBy` value from the `PATCH` body. |
| `reason` | string or null | The `reason` from the `PATCH` body, or `null` when none was given. Always present for a rejection. |

## Error response

Every error uses the same body:

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

| Field | Meaning |
| --- | --- |
| `code` | A machine-readable error code from the table below. |
| `message` | A human-readable summary. For `INVALID_REQUEST` it is always `The request could not be completed.` |
| `details` | For `INVALID_REQUEST`, one entry per invalid field or query parameter, each with `field` and `message`. For every other code, an empty array. |

When the body of a `POST` or `PATCH` request can't be used at all, `details` has a single entry whose `field` is `body`:

- Malformed or empty JSON: `The request body must be valid JSON.`
- Valid JSON that is not an object, such as an array: `The request body must be a JSON object.`

| Code | Status | Endpoints | When |
| --- | --- | --- | --- |
| `INVALID_REQUEST` | `400` | `POST /api/enrollment-requests`, `GET /api/enrollment-requests`, `PATCH /api/enrollment-requests/:id/status` | The body, a field, or a query parameter is invalid. |
| `COURSE_NOT_FOUND` | `404` | `POST /api/enrollment-requests` | No course has the given `courseId`. |
| `ENROLLMENT_REQUEST_NOT_FOUND` | `404` | `GET /api/enrollment-requests/:id`, `PATCH /api/enrollment-requests/:id/status` | No request has the given ID. |
| `COURSE_NOT_ACTIVE` | `409` | `POST /api/enrollment-requests` | The course is `draft` or `retired`. |
| `DUPLICATE_ACTIVE_REQUEST` | `409` | `POST /api/enrollment-requests` | The learner already has a `pending` or `approved` request for the course. |
| `INVALID_STATUS_TRANSITION` | `409` | `PATCH /api/enrollment-requests/:id/status` | The requested transition is not allowed. |

## Examples

```bash
# Create a request
curl -s -X POST 'https://api.agentcourses.localhost/api/enrollment-requests' \
  -H 'Content-Type: application/json' \
  -d '{"courseId":"course-001","learnerEmail":"learner@example.org","justification":"I need this course to prepare for upcoming secure development work."}'

# Get it
curl -s 'https://api.agentcourses.localhost/api/enrollment-requests/enroll-001'

# List pending requests for a course
curl -s 'https://api.agentcourses.localhost/api/enrollment-requests?status=pending&courseId=course-001'

# Approve it
curl -s -X PATCH 'https://api.agentcourses.localhost/api/enrollment-requests/enroll-001/status' \
  -H 'Content-Type: application/json' \
  -d '{"status":"approved","changedBy":"reviewer@example.org"}'
```

Local `pnpm run dev` publishes the API through portless at `https://api.agentcourses.localhost`, as described in [Course catalog](courses.md#example).

## Decisions

Short MADR-style records for the choices behind these endpoints.

### Keep enrollment requests in memory

- **Status:** accepted
- **Context:** The course catalog is an in-memory seed, and the task forbids adding a real database.
- **Decision:** Store requests in an in-memory repository behind the `EnrollmentRequestRepository` interface, created once when the API starts.
- **Consequences:** No new infrastructure or dependencies. Data is lost on restart, and each API instance has its own data. A persistent store can replace the repository later without changing the service or routes.

### Validate before looking anything up

- **Status:** accepted
- **Context:** A request can fail for several reasons at once, such as a bad email and a missing course.
- **Decision:** Check in a fixed order: body validation (`400`), then existence (`404`), then business rules (`409`).
- **Consequences:** Responses are predictable. A client fixes its input first. A `404` or `409` means the input itself was well formed.

### Reject unknown fields and parameters

- **Status:** accepted
- **Context:** `GET /api/courses` already rejects unknown query parameters. Silently ignoring a misspelled field, such as `reson` instead of `reason`, would hide client bugs.
- **Decision:** Unknown body fields and unknown query parameters return `400 INVALID_REQUEST`, with the field named in `details`.
- **Consequences:** Typos fail fast. Adding a new optional field later is a deliberate API change, because older servers reject it.
