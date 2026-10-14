# AgentCourses — Agent Instructions

## Purpose and source of truth
This repository is a controlled agentic-coding evaluation. Task prompts and their corresponding requirements files are immutable. Follow the supplied task specification exactly; do not silently extend the requested feature scope.

Read the task prompt, requirements, existing code, and relevant Cellix conventions before editing. The authoritative reference for reusable Cellix packages and architectural patterns is the original CellixJS/cellixjs source. Vendored `packages/cellix/**` must remain identical to its upstream source; do not patch vendored code to make an application change work.

## Scope and architecture
- Honor the active task's allowed write boundary. Do not modify secrets, `.env`, authentication, production/deployment configuration, unrelated features, or external integrations.
- `apps/api` is the thin composition root. Preserve the established Cellix API bootstrap and dependency injection structure.
- Keep HTTP/Hono logic in `packages/axc/rest`, use cases in `packages/axc/application-services`, domain rules in `packages/axc/domain`, and storage implementations in `packages/axc/persistence` and `packages/axc/service-mongoose`.
- Domain code must not depend on Hono, REST, Azure Functions, Mongoose, or composition code.
- Do not add new top-level directories under `packages/axc` or dependencies without a documented justification.
- Never relax TypeScript, Biome, architecture, security, or test settings to make a failing implementation pass.

## Verification is required, not optional

- Create tests for the task's success paths, boundary conditions, validation failures, and regression behavior.
- Tests must actually run and pass; merely creating test files is not evidence of success.
- Acceptance tests must use the real `@apps/api` composition and HTTP path, not a separately constructed Hono app or service substitute.
- Run `node scripts/verify-agent-work.mjs` from the repository root. This executes `pnpm run verify` and records verification evidence in `.verification/last-run.log` and `.verification/last-run.json`.
- If the verification wrapper is unavailable, run `pnpm run verify` directly. If that is unavailable, run the available test, typecheck, lint, architecture, security, and build commands individually and record which were unavailable.
- Inspect verification results and resolve failures introduced by your changes.
- If any test fails, investigate the first underlying cause. An error such as `agentCourses-api exited unexpectedly (code: 1)` indicates a failed process startup; inspect server stderr, bootstrap, ports, configuration, and test lifecycle before changing assertions.
- Never report PASS when a command was skipped, failed, or not run. Do not alter tests to conceal a defect.
- Before declaring a task complete, report the verification outcome, any failures, and any checks that could not be executed.
- Do not change fixed task prompts or specifications, and do not modify, weaken, disable, or bypass guardrails or verification checks to suppress errors.

## Documentation and traceability
- Update API documentation with endpoint, parameters, success/error contracts, and examples for the implemented feature.
- Review whether a new architecture decision requires a MADR record; create one in the existing MADR location when an actual significant decision is made, or explicitly explain why none is needed.
- Review applicable security requirements and update existing SRTM Markdown records in the repository's established documentation location, linking requirements to implementation and verification evidence. Do not invent security requirements or claim unrun checks passed.
- If the active task's write boundary does not permit a required documentation change, report the conflict; do not silently edit outside the boundary.

## Completion report
Report: changed files; architectural decisions; MADR/SRTM updates or justified non-applicability; exact commands and exit results; tests passing/failing/skipped; API startup diagnostics for failures; known limitations; and token/cost usage if available.
Do not declare completion with failing required checks. Fix what is within scope, or clearly report the blocker with reproduction details.
