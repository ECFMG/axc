# AGENTS.md

This is a pnpm/turbo monorepo built on CellixJS layering. Business code lives in `packages/axc/*`
(`domain` → `persistence` / `service-mongoose` → `application-services` → `rest` → `apps/api`);
`packages/cellix/**` is vendored seedwork and is never edited. Most conventions are enforced by
tests and hooks, so this file only lists what they cannot check. Read the skill that matches the
work before starting it.

## Skills (`.agents/skills/<name>/SKILL.md`)
- `cellix-feature-layout` — where each file of a feature goes, per layer, with the ocom reference paths to read.
- `axc-tdd` — feature files and tests: one behaviour per scenario, red before green, what each layer must test.
- `change-verification` — knip baseline, network-free loop, what the hooks and stop gate do, final `pnpm run verify`.
- `adversarial-review` — the independent `requirements_reviewer` agent and how to act on its table.

## Hard rules
- Read the task and every referenced spec in full before editing. Map each requirement to the file that implements it and the test that proves it; keep that map in context and report it in the final summary. Do not write plans or notes into the repository.
- Change only what the task requires. Do not reformat, move or rename unrelated code; keep existing formatting on lines you do not change. Mention pre-existing gaps in the summary instead of fixing them.
- Work on the current branch, uncommitted. Do not create or switch branches, commit or push.
- Dependencies are fixed. Do not add, remove or upgrade packages; the lockfile is regenerated only by `pnpm install --offline` after a `package.json` change the task demands.
- Each concept has one source of truth; import it from the layer that owns it. Dependencies a feature needs are required constructor or factory parameters wired in `apps/api`, never optional with a silent default.
- HTTP parsing, status codes and error bodies live in `rest`; application services take typed input. Error responses never include stack traces, driver messages or internal identifiers.
- Build Mongo filters field by field from validated criteria; never pass raw request values or unescaped text into filters or regexes. Filtering, sorting and paging run in MongoDB, not in memory.
- Validate raw input against its expected format before converting (no bare `Number()`/`parseInt()`). Empty or whitespace-only optional input counts as absent. Do not reject inputs the spec does not mention. Messages describe accepted input in user terms.
- Represent failure explicitly (result type or `undefined`); never return a stand-in value to satisfy the type checker.
- Braced `if` bodies on their own lines; explicit `undefined` checks for optional values; descriptive exported names (`COURSE_STATUSES`, not `STATUSES`).

## Final summary
One short line per progress update. The final summary contains: the requirement → test/file table,
the reviewer's table and verdict, the stop-gate evidence path, and any pre-existing issues you did
not fix. No file contents or full command output.
