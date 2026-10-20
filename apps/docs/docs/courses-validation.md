# Course catalog validation

Validation for this delivery is recorded in the sibling `validation/` directory of the delivery package. Historical validation results are not used as evidence for this run.

The repository registers course endpoint tests through `pnpm --filter @apps/api run test:courses`. The default API test command also typechecks these tests. Application service tests use the existing Vitest runner. Existing health tests remain unchanged.

The supplied harness provides independent in-memory Hono and live Azure Functions HTTP checks. Both check fixture fields, all search fields, filters, combinations, pagination, all sort fields, invalid parameters, and no matches. The submitted-test gate independently verifies that added tests execute and API documentation contains required contracts.

Run the existing repository commands: `pnpm test --env-mode=loose`, `pnpm run lint`, `pnpm run build --env-mode=loose`, `pnpm run typecheck --env-mode=loose`, and `pnpm run test:arch --env-mode=loose`. Tests that start local servers require permission to bind local ports. No external services or production data are required.

## October 20 run

Current original-task evidence, complete usage, estimated cost, final rubric and separately rerun publication validation are stored in `apps/docs/static/task-a-evaluation/runs/task-a-2026-10-20-01a15a81/`. Earlier evidence remains available in Git history and its existing paths. The API test script registers both the existing TypeScript cases and the new JavaScript cases.
