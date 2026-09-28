## Task Set B: Course Search and Enrollment Request Workflow

You are working in a non-production sample codebase for an agentic coding harness evaluation.

Task Set ID: TS-B-COURSE-ENROLLMENT-WORKFLOW

Task Name: Course Search and Enrollment Request Workflow

Refer to markdown requirements defining Task Set A (task-set-a-requirements.md) and Task Set B (task-set-b-requirements.md)

### Overview

Implement a larger feature set for a training course catalog and enrollment request workflow.

Use only the allowed write boundary:

- apps/api/** rest routing / functional wiring
- packages/cellix/** can continue to port over packages from github repo CellixJS/cellixjs; these vendored packages should **NEVER** deviate from the original source repository
- packages/axc/rest/** hono logic
- packages/axc/application-services/** application services
- packages/axc/persistence/** data storage
- packages/axc/service-mongoose/** data storage
- packages/axc/** do not create any additional directories beyond what already exist
- packages/axc-verification/** unit, integration, architectural and acceptance tests
- apps/docs/** any configuration necessary to get documentational functional
- apps/docs/** MADR / API documentation

Do not modify authentication, production configuration, deployment pipelines, secrets, environment files, unrelated domains, or external integrations. Do not add dependencies unless clearly justified.

### Course requirements:

1. Include or preserve GET /api/courses from Task Set A.
2. Course must have id, title, summary, modality, status, tags, createdAt, and updatedAt.
3. Course search must support q, modality, status, tag, page, pageSize, and sort.
4. Invalid course search query parameters must return HTTP 400.

### Enrollment request requirements:

1. Add POST /api/enrollment-requests.
2. A request may be created only for an existing active course.
3. learnerEmail must be a valid email address.
4. justification must be between 20 and 500 characters.
5. New requests must start as pending.
6. Prevent duplicate active requests. A learner may not have more than one pending or approved request for the same course.
7. Add GET /api/enrollment-requests/:id.
8. Add GET /api/enrollment-requests with optional filters status, courseId, and learnerEmail.
9. Add PATCH /api/enrollment-requests/:id/status.
10. Valid transitions are pending to approved, pending to rejected, pending to cancelled, and approved to cancelled.
11. Invalid transitions must return HTTP 409.
12. Rejection requires a non-empty reason.
13. Every creation and status change must add a statusHistory entry.
14. Add tests for creation, validation, duplicate prevention, retrieval, filtering, status transitions, audit trail, and error handling.
15. Add or update docs for enrollment requests
16. Existing tests must still pass.

Run the relevant tests, lint, and build commands if available. Provide a short summary of what changed, commands run, test results, cost/usage and any known limitations.
