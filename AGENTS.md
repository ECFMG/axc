# AGENTS.md

General conventions for working in this repository.

## Scope
- Change only what the task requires. Do not modify, remove, or reformat unrelated code, exports, or configuration.
- Do not add or change build, cache, or tooling config (e.g. `turbo.json`, tsconfig bases) unless the change cannot work without it. If you notice a pre-existing config gap, mention it in your summary instead of fixing it.
- When adding entries to existing JSON or config (e.g. `package.json`, tsconfig `references`), keep the existing formatting of lines you are not changing.
- Add only files that are deliverables of the task: code, tests, configuration and the documentation the spec asks for. Plans, notes, requirement maps and scratch files stay out of the repository.

## Git
- Work on the current branch and leave changes uncommitted. Do not create or switch branches, commit, or push; the operator handles git. If a task lists a branch as a deliverable, the current branch is that branch.

## Plan before coding
- Read the task and every spec file it references in full before editing.
- List each requirement and acceptance criterion, and map it to the file that will implement it and the test that will prove it. Resolve ambiguities from the spec; ask only if the spec cannot answer them.
- Lay out the plan in the CellixJS structure below. For tooling, package wiring and test setup, follow the closest existing package in this repo.
- The plan is a working aid for you. Keep it in your own context, and report the requirement mapping in the final summary instead of writing it to a file.

## Architecture
- This repo follows CellixJS layering: `packages/axc/domain` → `persistence` / `service-mongoose` → `application-services` → `rest` → `apps/api` (composition root). Dependencies point inward only.
- `packages/cellix/**` is vendored from CellixJS/cellixjs. Never modify it.
- Before adding new abstractions, look for existing ones in `packages/cellix` and `packages/axc/domain` (e.g. repository contracts, seedwork) and build on them.
- Each concept has one source of truth. Import shared types and constants from the layer that owns them rather than redefining them.
- HTTP concerns (request parsing, status codes, response/error bodies) belong in `rest`. Application services take typed inputs.
- Dependencies a feature needs (repositories, catalogs, clients) are required parameters wired in the composition root. Do not make them optional or fall back to a silent default such as an empty implementation.
- Put new implementations and data in their own modules and export them from `index.ts`. Do not move existing code out of `index.ts` unless the task requires it.

## CellixJS conventions
New business features use the structure of the CellixJS sample application. The existing `health` endpoint is infrastructure and is not a structural example. Reference checkout (read-only): `/Volumes/files/src/CELLIX/cellixjs/packages/ocom`.
- Group code by bounded context and aggregate in every layer, with an `index.ts` at each folder level re-exporting the level below:
  - domain: `src/domain/contexts/<context>/<aggregate>/` holding `<aggregate>.ts` (entity type or reference) and `<aggregate>.value-objects.ts` (allowed values, limits, constructors), exposed from `src/index.ts` as the `Domain` namespace so callers write `Domain.Contexts.<Context>.<Aggregate>.<Name>`.
  - persistence: read access in `src/datasources/readonly/<context>/<aggregate>/<aggregate>.read-repository.ts`, created by `get<Aggregate>ReadRepository(...)`; a `DataSources` object (`readonlyDataSource.<Context>.<Aggregate>.<Aggregate>ReadRepo`) built by `DataSourcesFactoryImpl` and exported from the package root. Seed or fixture data lives in persistence.
  - read repositories own data access: filtering, matching, sorting and paging happen in the repository method, so the same contract can later be backed by a database query. Give repositories methods shaped like the question being asked rather than a load-everything method that callers filter in memory.
  - application services: one file per operation in `src/contexts/<context>/<aggregate>/` (`query-<name>.ts`, `create.ts`, ...), each exporting a function that takes `dataSources` and returns the operation. Query operations stay thin: pass typed criteria to the read repository and shape its result. The aggregate and context `index.ts` files compose these, and `ApplicationServices` exposes them as `<Context>.<Aggregate>.<operation>`.
  - rest: request parsing, handlers and their tests in `src/contexts/<context>/<aggregate>/`, with the same `index.ts` chain; the package root exports only what other packages use.
  - composition root: `apps/api` creates the data-sources factory once and passes it to the application-services factory through the API context.
- Add only the contexts, aggregates, folders and files the feature uses. Do not scaffold unit-of-work, domain events or empty contexts for read-only features, and do not add value-object classes or entity base classes unless the feature mutates or enforces invariants on an aggregate.
- Keep this repo's own rules where they are stricter: HTTP parsing and error bodies stay in `rest`, application services receive already-typed input, and dependencies are required, not optional.
- To check a pattern, read the matching ocom files, including the `*.instructions.md` design notes under its domain contexts and the tests next to each file. Do not edit the checkout, copy files from it, or import from it. If the path is missing, apply the rules above from this file alone.

## Code style
- Write for a reviewer reading the diff: small named functions, one step per line, descriptive names. Prefer clarity over brevity; avoid packing several conditions or side effects into one expression.
- Name exported constants and types after the thing they describe, not just the kind of value, so they still read clearly when imported into another layer (e.g. `INVOICE_STATUSES`, not `STATUSES`).
- Give every `if` a braced body on its own lines; do not put the condition and its `return` on one line.
- Check optional values against `undefined` explicitly rather than relying on truthiness, so that empty strings and zero cannot be skipped silently.
- Never use a stand-in value to satisfy the type checker (e.g. returning an arbitrary valid enum member after recording a validation error). Represent failure explicitly, for example with a result type or `undefined`.
- Validate raw input strictly against its expected format before converting it. Do not rely on lenient conversions such as `Number()` or `parseInt()`, which accept whitespace, exponents, or trailing characters.
- An optional input supplied with an empty or whitespace-only value is treated as not supplied, unless the spec says otherwise.

## Tests
- Work test-first: for each item in your plan, write the test, run it and see it fail, then write the code that makes it pass.
- Do not create implementation files in the same step as their tests. Write the tests (with at most the type or function signatures they import), run them and confirm the failure comes from missing behaviour rather than a setup error, and only then implement.
- Every layer that contains logic gets its own unit tests covering each branch: every allowed enum value, every rejection reason, boundary values and the values just outside them, defaults, combinations of inputs, and empty results. Acceptance scenarios complement unit tests; they do not replace them.
- Unit tests live next to the code they test, in the same package and folder (`<name>.test.ts` beside `<name>.ts`). Follow the setup of packages that already have tests.
- `packages/axc-verification/archunit-tests` is for architecture rules only.
- Acceptance tests go in `packages/axc-verification/acceptance-api`. When a spec lists acceptance criteria, cover each one with at least one scenario, including error cases.
- Test logic in the layer that owns it: application-service and domain behaviour gets unit tests in that package; `rest` tests cover HTTP mapping and validation. Do not rely on `rest` tests alone.
- Never reduce test coverage to save tokens.
- Do not weaken or narrow existing test configs to make tests pass.

## Dependencies
- If you change any `package.json`, update `pnpm-lock.yaml` so `pnpm install --frozen-lockfile` succeeds. The lockfile update is always part of a dependency change, even when a task lists specific files to edit; you do not need to ask.
- For `workspace:*` or already-installed packages, use `pnpm install --offline` first; it needs no network access. `pnpm install --offline --frozen-lockfile` also works inside the sandbox.
- The lockfile diff should contain only entries for the dependencies you changed.

## Sandbox and verification
- The sandbox has no network access. Commands that need it (`pnpm run verify`, `pnpm audit`, `pnpm run snyk`) require approval, so batch them.
- While iterating, run network-free checks directly: `pnpm run lint`, `pnpm run typecheck`, `pnpm run build`, `pnpm run test:arch`, `pnpm run test`, `pnpm run knip`.
- Run `pnpm run knip` once before your first edit and note what it reports. Run it again after your last code change and before the review; anything new it reports (unused files, exports, types or dependencies) comes from your change and must be fixed.
- Run verification once, at the end, as a single command: `pnpm run verify; pnpm run snyk`. Everything must pass.
- If `pnpm audit` or Snyk reports an advisory introduced by your dependency changes, fix it (e.g. upgrade or pin a patched version). If an advisory already exists on the base commit and fixing it needs files outside the task's write boundary (e.g. `pnpm-workspace.yaml` overrides), do not fix it; list it in your summary with the patched version. Report Snyk authentication or organization errors instead of working around them.

## Messages
These rules apply only to what you write to the user. They do not limit how much you read, explore, or test.
- Keep progress updates to one short line. Do not narrate plans or restate code you are about to write.
- Keep the final summary concise: include what the task asks you to report, without repeating file contents or full command output.
- End the summary with a compact table mapping each requirement and acceptance criterion to the test or file that covers it.

## Self-check
Before the review, check your diff for:
- Every requirement and acceptance criterion from your plan implemented and tested.
- Unit tests in each layer with logic, covering boundaries and every rejection path.
- Optional dependencies or silent fallbacks; stand-in values; duplicated types or constants.
- Dense or hard-to-follow code that a reviewer would need to unpack.
- Folder, file, export and naming structure matching the CellixJS conventions above.
- Changes to unrelated lines, including formatting; new entries placed out of the existing order (e.g. alphabetical dependencies).
- Leftover debug code, TODOs, or unused exports (confirmed with `pnpm run knip` against your baseline).
- Tests that were run and seen to fail before their implementation existed.
- Files that are not deliverables (plans, notes, requirement maps, scratch files).
- Generic constant names, one-line `if` statements, and truthiness checks on optional values.
- Documentation updated where the task or spec requires it.

## Adversarial review
Before final verification, get an independent review of your change. Use a sub-agent, not self-review.
- Spawn the reviewer with `fork_turns: "none"`, `model: "gpt-6.1-sol"`, `reasoning_effort: "medium"`. Give it the original task instructions verbatim, the paths of any spec files they reference, and the base commit. Do not include your own reasoning or summary of the change.
- The reviewer's brief: find defects in the uncommitted change (`git diff <base>` plus untracked files) against the task instructions, the spec, and this file. Look for unmet or misread requirements, incorrect edge-case behaviour, missing or weak tests, layering, single-source-of-truth and CellixJS-convention violations, and out-of-scope changes. Report each finding with severity (blocker / major / minor), file and line, and evidence. Do not edit files or run commands that need network. Say "no blocking findings" if there are none. Report findings only, without restating the change.
- Fix blocker and major findings that are within the task's scope. Ignore style preferences and suggestions that would expand scope. If you reject a finding, record why.
- After fixing, spawn a fresh reviewer with the same brief. Stop when a review returns no blocker or major findings, or after 3 review rounds.
- In your final summary, list each round's findings and how you resolved them.
