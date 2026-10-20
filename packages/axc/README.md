# @axc

Application layer for agentCourses. Packages follow the Cellix layout:

| Package | Role |
| --- | --- |
| `@axc/domain` | Domain model extension point. Uses `@cellix/domain-seedwork`. Defines the course model and catalog port. Must not import REST, Hono, Azure Functions, Mongoose, or persistence implementations. |
| `@axc/persistence` | Persistence extension point. Uses the Cellix unit-of-work contract. Holds the in-memory course catalog seed. |
| `@axc/service-mongoose` | Mongoose infrastructure extension point. Uses `@cellix/mongoose-seedwork` and `mongodb-memory-server-core`. |
| `@axc/application-services` | Use cases. The healthcheck status and course catalog search are produced here. |
| `@axc/rest` | Hono routes for `/health` and `GET /api/courses`. Application services are injected by `@apps/api`. |

`@apps/api` is the composition root. It injects dependencies into `@axc/rest` through the Cellix bootstrap in `@cellix/api-core`.
