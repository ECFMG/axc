## Task Set A: Course Catalog Search Endpoint

You are working in a non-production sample codebase for an agentic coding harness evaluation.

Task Set ID: TS-A-CATALOG-SEARCH

Task Name: Course Catalog Search Endpoint

Refer to markdown requirements defining Task Set A (task-set-a-requirements.md)

### Overview

Implement a GET /api/courses endpoint for a training course catalog.

Use only the allowed write boundary:

- apps/api/** rest routing / functional wiring
- packages/cellix/** can continue to port over packages from github repo CellixJS/cellixjs; these vendored packages should **NEVER** deviate from the original source repository
- packages/axc/rest/** hono logic
- packages/axc/application-services/** application services
- packages/axc/persistence/** data storage
- packages/axc/service-mongoose/** data storage
- packages/axc/** do not create any additional directories beyond what already exist
- packages/axc-verification/** unit, integration, architectural and acceptance tests
- apps/docs/** any configuration necessary to get documentation functional
- apps/docs/ ** MADR / API documentation

Do not modify authentication, production configuration, deployment pipelines, secrets, environment files, unrelated domains, or external integrations. Do not add dependencies unless clearly justified.

### Requirements:

1. Create or use a Course model with id, title, summary, modality, status, tags, createdAt, and updatedAt.
2. Seed or fixture at least 12 courses with mixed modality, status, and tags.
3. Add GET /api/courses.
4. Support q keyword search across title, summary, and tags, case-insensitively.
5. Support modality filter: online, in-person, hybrid.
6. Support status filter: draft, active, retired.
7. Support tag filter, case-insensitively.
8. Support page and pageSize. page defaults to 1. pageSize defaults to 10. Maximum pageSize is 50.
9. Support sort values title, createdAt, and updatedAt. Default sort is title.
10. Invalid query parameters must return HTTP 400 with a consistent error response.
11. Add tests for success, filters, pagination, sorting, validation failures, and no-match results.
12. Add or update courses documentation.

Run the relevant tests, lint, and build commands if available. Provide a short summary of what changed, commands run, test results, cost/usage and any known limitations.
