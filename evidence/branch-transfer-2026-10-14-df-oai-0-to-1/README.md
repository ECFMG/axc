# Branch transfer — October 14, 2026

Merged all 16 source-only commits from October 12–14 on `df-oai-0-a-out` into `df-oai-1-a-out`, preserving the destination's existing security and dependency changes. Source: `2b5041782cd93ff2e36a53440e409f98ae5236af`; destination before merge: `9c890d75784ea7a18fe0c192cfacfdcdaa1ef111`; merge: `10b75cd`. No conflicts.

511 transferred files match the source byte-for-byte. The remaining file, `pnpm-lock.yaml`, combines source workspace links with destination dependency fixes. Historical source-run evaluation records retain their provenance and are not new destination-model results.

Merged-branch validation passed: full tests (28 successful Turbo tasks, 16 cached), lint (203 files), build, typecheck, architecture, and both independent endpoint modes (29/29 each). The initial Hono oracle used a default empty repository; its rerun supplies the fixture repository explicitly, exactly as the application composition root does. Only test setup changed; all assertions are unchanged. Both results and the adapted validator are preserved.

Locked dependencies were restored without changing the lockfile; three packages downloaded. Initial offline installation and interrupted legacy pnpm startup are retained in logs. See [transfer report](transfer-report.json) and full logs. No production deployment or new original-model run was performed.
