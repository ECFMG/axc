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
New business features follow the layout of the CellixJS sample application: code grouped by bounded context and aggregate in every layer, one application-service file per operation, and read repositories that own filtering, sorting and paging. The full layout is in the `cellix-feature-layout` skill (`.agents/skills/cellix-feature-layout/SKILL.md`). Read it before planning any new feature; it is required, not optional.

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
- Every layer that contains logic gets its own unit tests covering each branch: every allowed enum value, every rejection reason, boundary values and the values just outside them, defaults, combinations of inputs, and empty results. Acceptance scenarios complement unit tests; they do not replace them.
- Unit tests live next to the code they test, in the same package and folder (`<name>.test.ts` beside `<name>.ts`). Follow the setup of packages that already have tests.
- `packages/axc-verification/archunit-tests` is for architecture rules only.
- `domain`, `persistence` and `application-services` each have a `src/archunit-tests/` suite, run by `pnpm run test:arch`, that applies the vendored CellixJS convention checks to that package. Treat a failure as a structure defect in your code and fix the code; do not edit, skip or narrow these suites or their globs.
- Acceptance tests go in `packages/axc-verification/acceptance-api`. When a spec lists acceptance criteria, cover each one with at least one scenario, including error cases.
- Test logic in the layer that owns it: application-service and domain behaviour gets unit tests in that package; `rest` tests cover HTTP mapping and validation. Do not rely on `rest` tests alone.
- Never reduce test coverage to save tokens.
- Do not weaken or narrow existing test configs to make tests pass.

## Dependencies
- If you change any `package.json`, update `pnpm-lock.yaml` so `pnpm install --frozen-lockfile` succeeds. The lockfile update is always part of a dependency change, even when a task lists specific files to edit; you do not need to ask.
- For `workspace:*` or already-installed packages, use `pnpm install --offline` first; it needs no network access. `pnpm install --offline --frozen-lockfile` also works inside the sandbox.
- The lockfile diff should contain only entries for the dependencies you changed.

## Sandbox and verification
- The sandbox has no network access. Commands that need it (`pnpm run verify`, `pnpm audit`, `pnpm run snyk`) require approval, so batch them and run them once at the end.
- Follow the `change-verification` skill (`.agents/skills/change-verification/SKILL.md`): read it before your first edit (knip baseline), and again before review (self-check list) and before final verification.

## Tools
- The `typescript_lsp` MCP server provides TypeScript language-server queries: `lsp_get_definitions`, `lsp_find_references`, `lsp_get_hover`, `lsp_get_document_symbols`, `lsp_get_signature_help` and `lsp_get_diagnostics`. Pass the repository root as `root` and a repository-relative `relativePath`; `line` can be a line number or a snippet of the line. Prefer `lsp_find_references` and `lsp_get_definitions` over text search when tracing how a type, factory or export is used across packages, and use `lsp_get_diagnostics` for a quick type check of a file you just edited.
- Repository hooks give automatic feedback: Biome findings after each edit, and a verification gate when you finish with uncommitted changes. Treat their output like a failing check: fix the cause. The `change-verification` skill describes them.

## Messages
These rules apply only to what you write to the user. They do not limit how much you read, explore, or test.
- Keep progress updates to one short line. Do not narrate plans or restate code you are about to write.
- Keep the final summary concise: include what the task asks you to report, without repeating file contents or full command output.
- End the summary with a compact table mapping each requirement and acceptance criterion to the test or file that covers it.

## Adversarial review
Before final verification, get an independent sub-agent review of your change by following the `adversarial-review` skill (`.agents/skills/adversarial-review/SKILL.md`). Self-review does not count.
