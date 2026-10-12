---
slug: /
---

# agentCourses API

agentCourses is a dark software factory scaffold. HTTP capabilities are composed by `@apps/api`
and served through the Hono routes in `@axc/rest`.

| Capability | Endpoint | Reference |
| --- | --- | --- |
| Healthcheck | `GET /health` | [Healthcheck](./healthcheck.md) |
| Course catalog search | `GET /api/courses` | [Courses API](./api/courses.md) |
| Enrollment requests | `POST`, `GET`, and `PATCH` under `/api/enrollment-requests` | [Enrollment Requests API](./api/enrollment-requests.md) |

## How the layers fit together

| Package | Responsibility |
| --- | --- |
| `@axc/domain` | Course and enrollment request models, lifecycle rules, validation, domain errors, repository ports. |
| `@axc/persistence` | Repository adapters. Ships in-memory implementations seeded with a fixture catalog. |
| `@axc/application-services` | Request-scoped use cases composed from the ports. |
| `@axc/rest` | Hono routing, and the single mapping from domain error codes onto HTTP statuses. |
| `@apps/api` | Composition root. Builds the infrastructure context and registers the Azure Functions HTTP handlers. |

Architectural decisions are recorded under [Decisions](./decisions/0001-in-memory-repositories-for-the-course-catalog.md).

## Error contract

Every endpoint reports failures with the same envelope:

```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "The request could not be completed.",
    "details": [
      { "field": "justification", "message": "justification must be between 20 and 500 characters." }
    ]
  }
}
```

| Code | Status | Meaning |
| --- | --- | --- |
| `INVALID_QUERY_PARAMETER` | `400` | A query string parameter is outside its allowed domain. |
| `INVALID_REQUEST` | `400` | The request body failed validation. |
| `COURSE_NOT_FOUND` | `404` | No course carries the supplied identifier. |
| `ENROLLMENT_REQUEST_NOT_FOUND` | `404` | No enrollment request carries the supplied identifier. |
| `COURSE_NOT_ACTIVE` | `409` | The course exists but is not open for enrollment. |
| `DUPLICATE_ACTIVE_REQUEST` | `409` | The learner already holds a pending or approved request for the course. |
| `INVALID_STATUS_TRANSITION` | `409` | The enrollment request lifecycle forbids the move. |
