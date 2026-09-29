---
slug: /
---

# agentCourses API

agentCourses is a dark software factory scaffold. `@apps/api` composes the HTTP surface and
serves it through the Hono routes in `@axc/rest`.

| Endpoint | Purpose |
| --- | --- |
| [`GET /health`](./healthcheck.md) | Reports that the API process is running. |
| [`GET /api/courses`](./courses.md) | Searches the training course catalog. |

Architecture decisions are recorded under [Decisions](./decisions/0001-course-catalog-search-endpoint.md).
