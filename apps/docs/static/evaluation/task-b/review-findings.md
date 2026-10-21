# Task B review findings

Human operator: Dane Fortun. Review was performed by the Cavecrew investigator and reviewer recorded in usage.json; this is not an independent human sign-off.

| Finding | Resolution and evidence |
| --- | --- |
| Hono routes alone do not expose Azure Functions endpoints. | Added collection, item, and status Azure registrations in apps/api/src/index.ts; course and enrollment host checks pass. |
| Cellix recreates delivery handlers per invocation. | Application-factory-owned enrollment store survives handler recreation; retrieval, duplicate prevention, and history tests pass through HTTP. |
| Initial email parser accepted malformed local parts/domain labels. | Tightened parser for local dot placement, ASCII syntax, domain label syntax and lengths. Added regression cases; final suite passes. |
| Copied course documentation contained a stale link and old test-package name. | Corrected documentation, moved API pages under apps/docs/docs/api, updated sidebar; explicit docs build passes. |
| Physical domain/persistence package placement could add workspace dependencies and lockfile changes. | Kept logically separated model/rules, repository, service, and clone mapping inside application-services. Reviewer found no explicit requirement for namesake physical packages and no functional blocker. |
| Initial sandbox baseline tests could not open local ports. | Preserved failure logs; full suite passes with local-server execution permission. No tests weakened. |
| Initial source checkout was superseded by operator's branch clarification. | Final implementation uses df-oai-4-b-out at 9c890d75784ea7a18fe0c192cfacfdcdaa1ef111. Older-checkout baseline logs are explicitly distinguished. |
| Summary initially described two tasks rather than Task B with its course-search prerequisite. | Completion/evaluation records corrected to Task B scope. |
| Estimate was entered after initial inspection. | Timing deviation disclosed; unchanged projection retained separately from actual usage. |
| Efficiency comparison is absent. | Efficiency and overall /30 scores remain unassigned under supplied policy. No savings claim. |

No unresolved implementation or validation blocker was found after the reported fixes. Sample limitations remain: process-local volatile storage and supplied, unauthenticated operator identifiers. A dedicated security scan was not performed.
