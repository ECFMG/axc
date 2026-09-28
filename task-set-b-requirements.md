# Task Set B — Expanded Task Requirements

Fixed specification for Task Set B. The Task Set B prompt references this file. The prompt and this specification must remain fixed for every run.

## Task definition

| Field | Value |
| --- | --- |
| Task Set ID | TS-B-COURSE-ENROLLMENT-WORKFLOW |
| Task Name | Course Search and Enrollment Request Workflow |
| Purpose | Test whether the harness can handle a larger, multi-step feature with domain rules, validation, state transitions, tests, documentation, and auditability. |
| Expected Difficulty | Expanded |
| Expected Scope | Course search plus enrollment request workflow, multiple endpoints, validation, duplicate prevention, state transitions, audit events, tests, documentation |
| Primary Rubric Categories Exercised | All rubric categories |

## Important setup rule

Task Set B may be run in either of two ways. Choose one approach and use it consistently for every harness/model comparison.

| Option | Description |
| --- | --- |
| Preferred fair comparison | Start every Task Set B run from the same clean starting branch and ask the harness to complete the full expanded task set. |
| Alternative seeded comparison | Create one controlled seed branch where Task Set A is already completed, then start every Task Set B run from that same seed branch. |

Do not let one harness start from a better or more complete branch than another.

## Business context

The sample application now needs to support course enrollment requests. A learner can search for active courses and submit a request to enroll. Reviewers can view requests and approve, reject, or cancel them.

The feature must prevent duplicate active requests, enforce valid status transitions, and maintain a simple audit trail for status changes.

## Allowed write boundary

The harness may create or modify files only in these locations:

| Path | Purpose |
| --- | --- |
| `apps/api/**` | REST routing / functional wiring |
| `packages/axc/rest/**` | Hono logic |
| `packages/axc/application-services/**` | Application services |
| `packages/axc/domain/**` | DDD domain logic |
| `packages/axc/persistence/**` | Data storage |
| `packages/axc/service-mongoose/**` | Data storage |
| `packages/axc/**` | Do not create any additional directories beyond what already exist |
| `packages/axc-verification/**` | Unit, integration, architectural, and acceptance tests |
| `apps/docs/**` | MADR / API documentation |

## Do not modify

The harness must not modify:

| Area | Rule |
| --- | --- |
| Production configuration | No production settings, secrets, deployment, or environment changes |
| Authentication | Do not add real authentication; use existing sample/test conventions only |
| External integrations | No calls to external systems |
| Database infrastructure | Do not introduce a real database if the sample app uses in-memory or file-based fixtures |
| Unrelated domains | Do not change unrelated features |
| Dependencies | Do not add dependencies unless clearly justified |

## Domain models

### Course

Use the same Course model from Task Set A.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | string | Yes | Unique course ID |
| `title` | string | Yes | Human-readable course title |
| `summary` | string | Yes | Short description |
| `modality` | enum | Yes | `online`, `in-person`, `hybrid` |
| `status` | enum | Yes | `draft`, `active`, `retired` |
| `tags` | string[] | Yes | Searchable tags |
| `createdAt` | string | Yes | ISO date string |
| `updatedAt` | string | Yes | ISO date string |

### EnrollmentRequest

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | string | Yes | Unique request ID |
| `courseId` | string | Yes | Must reference an existing active course |
| `learnerEmail` | string | Yes | Must be a valid email format |
| `justification` | string | Yes | 20–500 characters |
| `status` | enum | Yes | `pending`, `approved`, `rejected`, `cancelled` |
| `createdAt` | string | Yes | ISO date string |
| `updatedAt` | string | Yes | ISO date string |
| `statusHistory` | array | Yes | Audit trail of status changes |

### StatusHistoryEntry

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `fromStatus` | string or null | Yes | `null` for initial creation |
| `toStatus` | string | Yes | New status |
| `changedAt` | string | Yes | ISO date string |
| `changedBy` | string | Yes | Reviewer/operator identifier |
| `reason` | string | No | Required for rejection |

## Functional requirements

| ID | Requirement |
| --- | --- |
| B1 | Include or preserve the `GET /api/courses` search behavior from Task Set A. |
| B2 | Add `POST /api/enrollment-requests` to create an enrollment request. |
| B3 | A request may be created only for an existing course with status = `active`. |
| B4 | `learnerEmail` must be a valid email address. |
| B5 | `justification` must be between 20 and 500 characters. |
| B6 | New requests must start with status = `pending`. |
| B7 | Prevent duplicate active requests. A learner may not have more than one `pending` or `approved` request for the same course. |
| B8 | Add `GET /api/enrollment-requests/:id` to retrieve a request by ID. |
| B9 | Add `GET /api/enrollment-requests` to list requests with optional filters: `status`, `courseId`, and `learnerEmail`. |
| B10 | Add `PATCH /api/enrollment-requests/:id/status` to update request status. |
| B11 | Valid status transitions are: `pending` → `approved`, `pending` → `rejected`, `pending` → `cancelled`, and `approved` → `cancelled`. |
| B12 | Invalid status transitions must return HTTP 409. |
| B13 | Rejection requires a non-empty reason. |
| B14 | Every request creation and status change must add a `statusHistory` entry. |
| B15 | Add or update tests for creation, validation, duplicate prevention, retrieval, filtering, status transitions, audit trail, and error handling. |
| B16 | Add or update API documentation for enrollment requests |
| B17 | Existing tests must still pass. |

## API contracts

### Create enrollment request

`POST /api/enrollment-requests`

Request body:

```json
{
  "courseId": "course-001",
  "learnerEmail": "learner@example.org",
  "justification": "I need this course to prepare for upcoming secure development work."
}
```

Successful response:

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

### Get enrollment request by ID

```http
GET /api/enrollment-requests/enroll-001
```

### List enrollment requests

```http
GET /api/enrollment-requests?status=pending&courseId=course-001&learnerEmail=learner@example.org
```

### Update enrollment request status

```http
PATCH /api/enrollment-requests/enroll-001/status
```

Request body for approval:

```json
{
  "status": "approved",
  "changedBy": "reviewer@example.org"
}
```

Request body for rejection:

```json
{
  "status": "rejected",
  "changedBy": "reviewer@example.org",
  "reason": "Learner has not completed the prerequisite course."
}
```

### Error response format

Use the same error format as Task Set A.

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

## Required error cases

| Scenario | Expected status | Expected error code |
| --- | --- | --- |
| Course does not exist | 404 | `COURSE_NOT_FOUND` |
| Course is not active | 409 | `COURSE_NOT_ACTIVE` |
| Invalid learner email | 400 | `INVALID_REQUEST` |
| Justification too short | 400 | `INVALID_REQUEST` |
| Duplicate pending request | 409 | `DUPLICATE_ACTIVE_REQUEST` |
| Duplicate approved request | 409 | `DUPLICATE_ACTIVE_REQUEST` |
| Request not found | 404 | `ENROLLMENT_REQUEST_NOT_FOUND` |
| Invalid status value | 400 | `INVALID_REQUEST` |
| Invalid status transition | 409 | `INVALID_STATUS_TRANSITION` |
| Rejection without reason | 400 | `INVALID_REQUEST` |

## Acceptance criteria

| ID | Acceptance criterion |
| --- | --- |
| B-AC1 | Course search from Task Set A still works. |
| B-AC2 | A valid `POST /api/enrollment-requests` creates a pending request. |
| B-AC3 | Creating a request for a missing course returns 404. |
| B-AC4 | Creating a request for a draft or retired course returns 409. |
| B-AC5 | Invalid email or short justification returns 400. |
| B-AC6 | Duplicate pending or approved requests for the same learner/course return 409. |
| B-AC7 | `GET /api/enrollment-requests/:id` returns the request, including `statusHistory`. |
| B-AC8 | `GET /api/enrollment-requests` supports filtering by `status`, `courseId`, and `learnerEmail`. |
| B-AC9 | `PATCH /api/enrollment-requests/:id/status` supports valid transitions. |
| B-AC10 | Invalid transitions return 409. |
| B-AC11 | Rejection requires a reason. |
| B-AC12 | Creation and every status change adds a `statusHistory` entry. |
| B-AC13 | Existing tests still pass. |
| B-AC14 | New tests cover creation, validation, duplicates, retrieval, filtering, transitions, audit history, and errors. |
| B-AC15 | API documentation describes all new endpoints, request bodies, response bodies, and error cases. |

## Required tests

At minimum, add tests for:

| Test area | Required coverage |
| --- | --- |
| Course search regression | Confirms Task Set A behavior still works |
| Create request | Valid request creates pending enrollment request |
| Course validation | Missing, draft, or retired course is rejected |
| Input validation | Invalid email and short justification |
| Duplicate prevention | Same learner/course cannot create duplicate pending or approved request |
| Retrieve by ID | Existing request is returned with status history |
| List/filter | Filter by `status`, `courseId`, `learnerEmail` |
| Status transition | `pending` → `approved`, `pending` → `rejected`, `pending` → `cancelled`, `approved` → `cancelled` |
| Invalid transition | At least one invalid transition returns 409 |
| Rejection reason | Rejecting without reason returns 400 |
| Audit trail | Creation and status changes append status history entries |
| Existing tests | Previously existing tests still pass |

## Required deliverables

| Deliverable | Description |
| --- | --- |
| Implementation branch | Branch or commit with all generated changes |
| Course search implementation | If not already present, Task Set A behavior included |
| Enrollment request implementation | Domain, endpoint, validation, repository/service, mapper |
| Tests | Unit/integration tests for course search and enrollment requests |
| Documentation | `docs/api/courses.md` and `docs/api/enrollment-requests.md` |
| Notes | Short implementation summary, assumptions, and limitations |
| Validation output | Results from `npm test`, `npm run lint`, and `npm run build` |
| Cost/usage output | Tokens, credits, or estimated cost if available |
