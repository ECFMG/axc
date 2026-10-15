# agentCourses

Non-production sample monorepo. The current task prompt and its requirements are the source of truth for that task.

## Package map

- `packages/axc/domain`: domain model and inward-facing contracts.
- `packages/axc/persistence` and `packages/axc/service-mongoose`: concrete storage.
- `packages/axc/application-services`: use-case orchestration through domain contracts.
- `packages/axc/rest`: HTTP translation through application-service contracts.
- `apps/api`: composition root. Construct concrete infrastructure here and inject it inward.
- `packages/axc-verification`: acceptance tests and architectural fitness tests.
- `apps/docs`: API and architecture documentation.
- `packages/cellix/**`: vendored CellixJS packages. Do not edit them.

## Dependency direction

- Domain imports no application, persistence, REST, Hono, Azure Functions, or Mongoose code.
- Application services do not import or construct concrete persistence.
- REST does not import persistence.
- A new package relationship must follow this direction and update the existing export and project-reference pattern.

## Boundaries

- Stay inside the task's allowed write boundary.
- Do not modify secrets, production configuration, deployment configuration, authentication, or unrelated behavior.
