# AXC Agent Instructions (mog-xai-1)

AXC follows CellixJS architecture. Authoritative Cellix reference:
`/Volumes/files/src/cellixjs`.

## Eval contract

See [`docs/eval-contract.md`](docs/eval-contract.md) for TS-A scoring readiness (Eval Runner / a-out).

## Territory (CRITICAL)

- Work only on branch `mog-xai-1` in this worktree.
- Local commits are OK. **Do not push. Do not open PRs** from `mog-xai-1`.
- Eval Runner owns the `mog-xai-1-a-out` eval flow — do not invent or drive that branch.
- Do **not** run `task-set-a-prompt.md` / Task Set A eval yourself.

## Write Boundary (CRITICAL)

Allowed write paths only:

- `apps/api`
- `apps/docs`
- `packages/axc/*`
- `packages/axc-verification/*`
- Port missing Cellix capability into `packages/cellix/**` from `/Volumes/files/src/cellixjs` when required

Do not modify other trees. Do not weaken `pnpm run verify`, husky, architecture tests, or other guardrails. Never use `--no-verify`.

Zero-token enforcement (Copilot CLI): `.github/hooks/write-boundary.json` + `write-boundary.py`, wired from `enforce-agent-workflow.sh`. Bash deny matches after stripping quoted/escaped heredoc bodies (inert doc text does not burn turns); unquoted heredocs stay visible.

### Boundary traps

- **Lockfile is outside the boundary.** `pnpm-lock.yaml` lives at repo root. `pnpm add` / `pnpm install <pkg>` rewrites it and fails the boundary. Prefer workspace packages; if a dependency is unavoidable, say so in the summary instead of installing.
- **`packages/axc/domain/**` must not import infrastructure.** `test:arch` scans every `.ts` under `domain/src` (tests included) and fails on `hono`, `@azure/`, `mongoose`, `mongodb`, `@axc/rest`, `@axc/persistence`, `@axc/service-mongoose`, `@axc/application-services`. Domain tests that need a DB belong in `packages/axc-verification/**`.
- **`packages/cellix/**` is vendored.** Read and reuse; do not invent parallel copies. Edit only when porting a missing capability from CellixJS upstream.

### Reuse before you build

Prefer existing `packages/cellix/*` over new helpers:

`api-core` · `api-services-spec` · `domain-seedwork` · `mongoose-seedwork` · `serenity-framework` · `server-mongodb-memory-mock-seedwork` · `event-bus-seedwork-node` · `local-dev` · `config-typescript` / `config-vitest` / `config-rolldown` · `archunit-tests`.

Optional implementer skill: `minimal-build` (YAGNI, reuse-before-write, fewest files) — **off by default**; not on the SCORE load path.

## Sources of Truth

1. Task prompt / task-set requirements (when an eval agent runs them — not this harness setup).
2. `/Volumes/files/src/cellixjs` for architecture and patterns.
3. This repo’s `pnpm run verify` and existing package layout.

## Start with the map

Load `mog-repo-map` before exploring — do not dump trees to orient.

## Default SCORE path (minimal context)

Load **`mog-repo-map`** then **`run-validation`** only. Do **not** open optional skills (`plan-feature`, `review-diff`, `tdd`, `serenity-tests`, `minimal-build`, `portless`, `turborepo`), Copilot `.github/agents/*`, or large Cellix trees unless the task clearly requires them.

- Prefer **targeted reads** (specific files/symbols) over dumping directories or whole packages into context.
- Prefer **one** `pnpm run verify` at the end over repeated full suites; use package-scoped tests while iterating.
- Never auto-open the `turborepo` skill or `.github/agents/*` on the SCORE path.

Also available from main when needed: `portless`, `turborepo`, `minimal-build`.

## Gate cost (iterate cheap)

`pnpm run verify` is the enforcement boundary (minutes), not a search tool. While iterating:

| need | command |
| --- | --- |
| lint/format one area | `pnpm exec biome check <path>` |
| test one package | `pnpm --filter <pkg> run test` |
| everything, before done | `pnpm run verify` (once) |

A gate reporting **SKIPPED** is not a pass — say so explicitly.

## Finish with evidence

End with a short table: one row per numbered requirement / acceptance criterion, each PASS/FAIL with the test or file that proves it. Assertion-only rows are not done. Then commands run (summarized) and any limitations.

## Terse output (token budget)

Code and tests are the deliverable; chat prose is overhead.

- No preamble, no restating the task, no announcing upcoming tool calls.
- Never dump diffs, full file contents, or long logs into chat — summarize.
- One line of intent before a batch of tool calls, not one per call.
- If a sentence would not change what a reviewer does next, cut it.

## Cost / usage (eval operators)

When filling an Evaluation Run Record after a TS-A (or TS-B) eval, capture token/cost into the five fields in `evaluation-run-record.md` per [`docs/harness-cost-usage.md`](docs/harness-cost-usage.md). **Forbid silent `n/a` when a meter exists.** Aim under the nrn-xai baseline (~3.6M tokens / ~$0.86) when comparable. RTK/Headroom are optional workstation tools — not repo dependencies.

## Dev Worktrees

`turbo.json` already passes `WORKTREE_NAME`. Prefer:

```bash
pnpm run dev:worktree
```

Hostnames become `*.agentcourses.<worktree-dir>.localhost` via existing `apps/*/scripts/dev.mjs`.

## Later Eval Feature (do NOT implement in harness setup)

Task Set A catalog search (`TS-A-CATALOG-SEARCH`): `GET /api/courses` with A1–A11 and A-AC1–12, ≥12 seeded courses, invalid params → `400 INVALID_QUERY_PARAMETER`, empty match → `200` with empty `items`. Implement only when an eval run explicitly requests it.

## Completion

1. Stage only intended changes inside the write boundary.
2. Commit normally (husky / verify must pass). No `--no-verify`.
3. Stop after local commit — no push, no PR.
