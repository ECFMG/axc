---
id: traceability
---

# Requirement traceability

Paths below are relative to the repository. The real-host acceptance scenarios run in the Stop hook; unit and REST tests also run in the fast checks. Documentation is validated by the docs build. Suite regression is validated by the full verification hook.

## Task Set A

| Requirement | Acceptance criterion | Evidence |
| --- | --- | --- |
| A1, A7 | A-AC1, A-AC6 | `packages/axc/rest/src/features/courses.test.ts`: defaults and twelve complete fixtures; pagination changes the result slice |
| A2, A3 | A-AC2 | Same file: keyword searches title summary and tags |
| A4 | A-AC3 | Same file: combined filters modality=online |
| A5 | A-AC4 | Same file: combined filters status=active |
| A6 | A-AC5 | Same file: combined filters tag=AI |
| A8 | A-AC7 | Same file: sorts by title, createdAt, updatedAt |
| A9 | A-AC8 | Same file: rejects invalid enums, empty fields, pagination, repeated and unknown parameters |
| A2 | A-AC9 | Same file: no matches or out of range pages are successful empty lists |
| A10 | A-AC10, A-AC11 | Course tests above; existing `packages/axc/application-services/src/health.test.ts`; full verify hook |
| A11 | A-AC12 | `apps/docs/docs/courses.md`, docs build |

All HTTP acceptance criteria A-AC1 through A-AC9 are also exercised by the course search scenario in `packages/axc-verification/acceptance-api/src/features/course-enrollment.feature` using its adjacent step definitions.

## Task Set B

| Requirement | Acceptance criterion | Evidence |
| --- | --- | --- |
| B1 | B-AC1 | Course REST suite and real-host course search scenario above |
| B2, B6 | B-AC2 | `packages/axc/rest/src/features/enrollment-requests.test.ts`: creates pending, retrieves and audits full history; acceptance creation retrieval and audit trail scenario |
| B3 | B-AC3, B-AC4 | Enrollment REST suite: missing, draft and retired course cases; acceptance invalid enrollment inputs scenario |
| B4, B5 | B-AC5 | Enrollment REST suite: invalid body, all invalid fields, 20/500 bounds; aggregate suite: 19/501 rejected; acceptance invalid enrollment inputs scenario |
| B7 | B-AC6 | Enrollment REST suite: prevents pending and approved duplicates case insensitively; concurrent duplicates; reapplication; acceptance duplicate scenario |
| B8 | B-AC7 | Enrollment REST suite: creates pending, retrieves and audits full history; acceptance creation retrieval and audit trail scenario |
| B9 | B-AC8 | Enrollment REST suite: individual and combined filters; acceptance enrollment filters scenario |
| B10, B11 | B-AC9 | Enrollment REST suite: pending to each target and approved to cancelled; acceptance status transitions scenario |
| B12 | B-AC10 | Enrollment REST suite: conflicts leave audit history unchanged; aggregate suite: all 16 transition pairs; acceptance status transitions scenario |
| B13 | B-AC11 | Enrollment REST suite: invalid rejection reason cases; acceptance invalid enrollment inputs scenario |
| B14 | B-AC12 | Enrollment REST suite: creates pending, retrieves and audits full history; aggregate creation/transition tests; acceptance creation retrieval and audit trail scenario |
| B15 | B-AC14 | Enrollment REST suite plus aggregate, direct service, and persistence tests; acceptance feature scenarios |
| B16 | B-AC15 | `apps/docs/docs/enrollment-requests.md`, docs build |
| B17 | B-AC13 | Existing health tests, unchanged health acceptance scenario, and full verify hook |

Additional direct-call protection is proven by `packages/axc/application-services/src/contexts/catalog/enrollment-request/workflow.test.ts`; transaction rollback and read isolation are proven by `packages/axc/persistence/src/datasources/persistence.test.ts`. Domain tests are in `packages/axc/domain/src/domain/contexts/catalog/enrollment-request/enrollment-request.test.ts`.
