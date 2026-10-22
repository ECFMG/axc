---
slug: /
---

# agentCourses API

agentCourses is a dark software factory scaffold. The first HTTP capability is the healthcheck, composed by `@apps/api` and served through the Hono route in `@axc/rest`.

| Endpoint | Docs |
| --- | --- |
| `GET /health` | [Healthcheck](./healthcheck.md) |
| `GET /api/courses` | [Courses](./api/courses.md) |
| `POST /api/enrollment-requests`, `GET /api/enrollment-requests`, `GET /api/enrollment-requests/{id}`, `PATCH /api/enrollment-requests/{id}/status` | [Enrollment requests](./api/enrollment-requests.md) |
