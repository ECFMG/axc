---
id: traceability
title: Requirements traceability
---

## TS-A-CATALOG-SEARCH

Paths below are relative to the repository root. REST tests are in `packages/axc/rest/src/features/courses.test.ts`; HTTP acceptance scenarios are in `packages/axc-verification/acceptance-api/src/features/courses.feature`.

| Requirement / criterion | Evidence |
| --- | --- |
| Course model and 12 mixed fixtures | `packages/axc/persistence/src/datasources/readonly/catalog/course/course.read-repository.test.ts`: contains twelve unique complete courses with varied modality, status and tags |
| A1, A7, A-AC1 | REST: A1 A7 A-AC1 returns default pagination and all model fields; acceptance: A-AC1 default course list |
| A2, A-AC11 | REST: filters cases; acceptance: A-AC11 combined filters (two combinations) |
| A3, A-AC2 | REST: A3 A-AC2 searches title, summary and tags case-insensitively; acceptance: A-AC2 keyword matches title summary and tags regardless of case |
| A4, A-AC3 | REST: filters modality=online; acceptance: A-AC3 online modality |
| A5, A-AC4 | REST: filters status=active; acceptance: A-AC4 active status |
| A6, A-AC5 | REST: filters tag=AI and tag=sec; acceptance: A-AC5 case insensitive exact tag |
| A7, A-AC6 | REST: A7 A-AC6 pages without overlap, accepts the maximum, and handles out-of-range pages; acceptance: A-AC6 custom pagination |
| A8, A-AC7 | REST: A8 A-AC7 sorts ascending by each supported field before paging; acceptance: A-AC7 sorting |
| A9, A-AC8 | REST: A9 A-AC8 rejects invalid queries and A9 collects all failures and rejects duplicate parameters; acceptance: A-AC8 invalid query parameters |
| A-AC9 | REST: A-AC9 returns empty results and valid metadata; acceptance: A-AC9 no matching results |
| A10, A-AC11 | REST and acceptance suites above; `packages/axc/application-services/src/contexts/catalog/course/query-courses.test.ts` validates direct service calls |
| A-AC10 | Existing health unit and HTTP acceptance tests; complete regression verification runs in the Stop hook |
| A11, A-AC12 | `apps/docs/docs/courses.md` and docs build: endpoint, parameters, success and error examples |
