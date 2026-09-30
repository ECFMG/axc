# AXC Agent Instructions

AXC application development follows CellixJS architecture and conventions.

## Sources of Truth

Use these sources for their respective concerns:

1. The task prompt and referenced task-set requirements define required behavior
   and scope.
2. `/Volumes/files/src/cellixjs` is the authoritative reference for CellixJS
   architecture, framework usage, and implementation patterns.

When implementing application behavior, inspect the relevant Cellix patterns
rather than inventing alternatives from generic knowledge.

Do not modify or weaken repository guardrails to make an implementation pass.

## Repository Map

- `apps/` — application entrypoints and composition roots.
- `packages/axc/` — AXC application implementation, adhering to CellixJS architecture and conventions.
- `packages/axc-verification/` — acceptance and architecture verification for AXC.
- `packages/cellix/` — reusable Cellix framework packages consumed by AXC.
  Do not modify existing framework packages. If required Cellix capability is
  missing, port the relevant package from `/Volumes/files/src/cellixjs` rather
  than recreating it within AXC.

## Application Development

Use the project skills when applicable:

- `cellix-ddd` for domain modeling, application layering, and Cellix DDD.
- `tdd` for outside-in test-driven application development.
- `serenity-tests` for Serenity/JS acceptance testing.
- `run-validation` for development and final validation.

## Completion

Before completing a change:

- satisfy the requested behavior and scope;
- follow applicable Cellix architecture and repository conventions;
- follow the project's TDD and testing practices;
- pass the applicable repository validation.

When implementation is complete:

1. Review the working tree and stage only the intended changes.
2. Commit the completed implementation normally. Do not bypass the pre-commit
   hook or use `--no-verify`.
3. If the pre-commit hook fails, fix the underlying issue and retry the commit.
4. After a successful commit, push the current branch to its corresponding
   remote branch.
5. For an AXC output branch
   `<initials>-<vendor>-<iteration>-<attempt>-out`, derive the PR base by
   removing `-<attempt>-out`.
6. If no pull request exists for the current output branch, open one targeting
   the derived iteration base.
7. Do not merge the pull request.