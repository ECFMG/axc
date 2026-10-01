# AgentCourses Agent Instructions

## Scope

These instructions apply to the entire repository. Preserve the user's task and the fixed task-set prompts. Do not edit `task-set-*-prompt.md` or `task-set-*-requirements.md` unless the user explicitly requests changes to those files.

## Cellix Architecture Source of Truth

Treat the local Cellix repository at `/Volumes/files/src/cellixjs` as the authoritative reference for architecture, framework conventions, package structure, naming, testing patterns, and reusable infrastructure. If it is unavailable, use <https://github.com/CellixJs/cellixjs>.

For changes under `apps/api`, `packages/axc`, or `packages/axc-verification`, read and follow `.agents/skills/cellix-architecture/SKILL.md` before implementation.

Before writing code:

1. Locate the closest analogous vertical slice in Cellix.
2. Identify the reference files for composition, domain, application services, persistence or data sources, transport, and tests that apply to the task.
3. Decide where each new responsibility belongs and keep this alignment map in working notes.

## Architecture Invariants

- Keep `apps/api` as the composition root. Do not place business rules or storage behavior there.
- Keep domain concepts, invariants, and repository contracts in `packages/axc/domain` when the feature has domain behavior or identity.
- Organize application behavior under context and feature modules in `packages/axc/application-services/src/contexts`. Keep the package root focused on host interfaces and composition.
- Follow the Cellix curried application-service pattern. Inject `DataSources` first, then accept a command or query input.
- Use `readonlyDataSource` for queries and the domain data source with a scoped transaction for mutations.
- Keep fixture or in-memory storage behind a data-source or repository boundary. Production composition and package entry points must not own fixture collections.
- Keep `packages/axc/rest/src/index.ts` focused on application construction and feature registration. Put non-health routes, transport validation, and error mapping in feature modules.
- Transport layers may depend on application services, but must not bypass them to access persistence or infrastructure.
- Reuse existing Cellix packages and patterns. Do not create an AgentCourses-specific replacement for an available Cellix capability.
- Do not modify vendored `packages/cellix/**` code for an application feature. Port upstream Cellix changes exactly when that work is explicitly requested.
- When no close reference exists, use the nearest Cellix pattern and document the deviation and rationale in the final response.

## Completion Gate

Before reporting completion:

1. Perform the review in `.agents/skills/cellix-architecture/references/review-template.md`.
2. Resolve unjustified deviations or report them as limitations.
3. Run the relevant focused tests, followed by:

   ```bash
   pnpm run lint
   pnpm run typecheck
   pnpm run build
   pnpm run test:arch
   pnpm run test
   ```

4. In the final response, list the Cellix reference paths used, architectural decisions, deviations, and verification results.

