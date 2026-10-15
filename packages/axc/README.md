# @axc

Application layer for agentCourses. Packages follow the Cellix layout:

| Package | Role |
| --- | --- |
| `@axc/domain` | Domain model. Course catalog types and the fixture seed live here. Uses `@cellix/domain-seedwork`. Must not import REST, Hono, Azure Functions, Mongoose, or persistence implementations. |
| `@axc/persistence` | Course catalog storage. `@apps/api` constructs `createCourseCatalog()` here. Uses the Cellix unit-of-work contract. |
| `@axc/service-mongoose` | Mongoose infrastructure extension point. Uses `@cellix/mongoose-seedwork` and `mongodb-memory-server-core`. |
| `@axc/application-services` | Use cases. Healthcheck status and course catalog search are produced here. |
| `@axc/rest` | Hono routes. Application services are injected by `@apps/api`. |

`@apps/api` is the composition root. It injects dependencies into `@axc/rest` through the Cellix bootstrap in `@cellix/api-core`.
