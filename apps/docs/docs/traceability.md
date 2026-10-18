---
id: traceability
title: Requirements traceability
---

Unit/REST test paths below are relative to `packages/axc/`. REST cases are in `rest/src/features/workflow.test.ts`. Live HTTP scenarios are in `packages/axc-verification/acceptance-api/src/features/enrollment.feature` with step definitions in `enrollment.steps.ts`. The live suite uses Serenity against the real Functions host. Documentation is validated by the docs build. Full regression validation runs in the Stop hook.

## Task Set A

| Requirement | Evidence |
| --- | --- |
| A1 | REST: default pagination and full course model |
| A2 | REST: filters |
| A3 | REST: matches title summary and tags case-insensitively |
| A4 | REST: filters modality=online |
| A5 | REST: filters status=active |
| A6 | REST: filters tag=AI |
| A7 | REST: default pagination and full course model |
| A8 | REST: sorts |
| A9 | REST: validates |
| A10 | REST: all course search cases |
| A11 | REST: courses.md (docs build) |

| Acceptance criterion | Evidence |
| --- | --- |
| A-AC1 | live scenario A-AC1; REST course search suite |
| A-AC2 | live scenario A-AC2; REST course search suite |
| A-AC3 | live scenario A-AC3; REST course search suite |
| A-AC4 | live scenario A-AC4; REST course search suite |
| A-AC5 | live scenario A-AC5; REST course search suite |
| A-AC6 | live scenario A-AC6; REST course search suite |
| A-AC7 | live scenario A-AC7; REST course search suite |
| A-AC8 | live scenario A-AC8; REST course search suite |
| A-AC9 | live scenario A-AC9; REST course search suite |
| A-AC10 | health.test.ts; live healthcheck; full Stop-hook verify |
| A-AC11 | REST course search suite |
| A-AC12 | courses.md; docs build |

## Task Set B

| Requirement | Evidence |
| --- | --- |
| B1 | course search suite |
| B2 | creates retrieves and records initial audit |
| B3 | validates course |
| B4 | validates creation |
| B5 | validates creation; accepts justification boundary |
| B6 | creates retrieves and records initial audit |
| B7 | serializes concurrent duplicate creation and normalizes email |
| B8 | creates retrieves and records initial audit; missing request errors |
| B9 | filters individually and together |
| B10 | pending to status with audit |
| B11 | pending to status with audit |
| B12 | rejects transitions without mutation |
| B13 | validates status body |
| B14 | pending to status with audit |
| B15 | complete workflow test suite |
| B16 | enrollment-requests.md (docs build) |
| B17 | health.test.ts and healthcheck.feature; Stop-hook verify |

| Acceptance criterion | Evidence |
| --- | --- |
| B-AC1 | live scenario B-AC1; REST workflow suite |
| B-AC2 | live scenario B-AC2; REST workflow suite |
| B-AC3 | live scenario B-AC3; REST workflow suite |
| B-AC4 | live scenario B-AC4; REST workflow suite |
| B-AC5 | live scenario B-AC5; REST workflow suite |
| B-AC6 | live scenario B-AC6; REST workflow suite |
| B-AC7 | live scenario B-AC7; REST workflow suite |
| B-AC8 | live scenario B-AC8; REST workflow suite |
| B-AC9 | live scenario B-AC9; REST workflow suite |
| B-AC10 | live scenario B-AC10; REST workflow suite |
| B-AC11 | live scenario B-AC11; REST workflow suite |
| B-AC12 | live scenario B-AC12; REST workflow suite |
| B-AC13 | health.test.ts; live scenario B-AC13; full Stop-hook verify |
| B-AC14 | REST workflow suite; application-services/.../enrollment-request/workflow.test.ts; persistence/src/store.test.ts |
| B-AC15 | enrollment-requests.md; docs build |

Direct application rules are additionally proven by `application-services/src/contexts/catalog/enrollment-request/workflow.test.ts`. Rollback and copy isolation are proven by `persistence/src/store.test.ts`.
