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

Optional implementer skills: `minimal-build` (YAGNI, reuse-before-write, fewest files); `mog-critique` (adversarial self-critique on harness prep / fail-repair only) — both **off by default**; not on the SCORE load path.

## Sources of Truth

1. Task prompt / task-set requirements (when an eval agent runs them — not this harness setup).
2. `/Volumes/files/src/cellixjs` for architecture and patterns.
3. This repo’s `pnpm run verify` and existing package layout.

## Default SCORE path (minimal context)

Load **`mog-repo-map`** then **`run-validation`** only — no tree dumps to orient. Do **not** open optional skills (`plan-feature`, `review-diff`, `tdd`, `serenity-tests`, `minimal-build`, `mog-critique`, `portless`, `turborepo`), Copilot `.github/agents/*`, or large Cellix trees unless the task clearly requires them.

- Targeted reads only (files/symbols you will change).
- One `pnpm run verify` at the end; package-scoped tests while iterating.

## Adversarial critique (opt-in — `mog-critique`)

Load **`mog-critique`** on **harness prep** or **acceptance/verify fail repair** only — structured self-critique 3–10 rounds; **stop early when no new defects**. **Not** on clean/default SCORE (no mandatory critique; token bomb). Errors verbose; success silent (see Agent-to-agent output).

## Gate cost (iterate cheap)

`pnpm run verify` is the enforcement boundary (minutes), not a search tool. While iterating:

| need | command |
| --- | --- |
| lint/format one area | `pnpm exec biome check <path>` |
| typecheck one package | `pnpm exec turbo run typecheck --filter=<pkg> --output-logs=errors-only` |
| test one package | `pnpm exec turbo run test --filter=<pkg> --output-logs=errors-only` |
| everything, before done | `pnpm run verify` (once) |

A gate reporting **SKIPPED** is not a pass — say so explicitly.

## Finish with evidence

End with a short table: one row per numbered requirement / acceptance criterion, each PASS/FAIL with the test or file that proves it. Assertion-only rows are not done. Then commands run (summarized) and any limitations.

## Agent-to-agent output (token budget)

Write for the next AI agent, not a human reader. Chat prose is overhead; code/tests are the deliverable.

- Prefer compact, structured, agent-parseable output (tables, bullets, SHA/path/command) over narrative.
- **Success = minimal or silent.** Do not narrate green gates, “done”, or play-by-play of what worked.
- **Errors = spend tokens.** On failure: what failed, where (path/command/gate), and the next fix — enough to troubleshoot without re-exploring.
- No preamble, no restating the task, no announcing upcoming tool calls.
- Never dump diffs, full file contents, or long green logs into chat — summarize failures only.
- One line of intent before a batch of tool calls, not one per call.
- If a sentence would not change what the next agent does, cut it.

Token rules (tools):

- turbo: always `--output-logs=errors-only`.
- Long command output: `… 2>&1 | tail -n 40`; widen only if the error is cut.
- Find with `rg -n` (or `grep -n`), then read only that line range — no whole-file reads to search.
- Don't re-read a file you just wrote; the edit result is the source of truth.
- No sub-agents / reviewer agents — work inline.
- `test:arch` + `test:acceptance` run once, at the final gate (`pnpm run verify`) — not while iterating.

## Cost / usage (eval operators)

After TS-A/TS-B SCORE, paste Grok Build `/usage` into the five fields in `evaluation-run-record.md` (paste map: [`docs/score-metering.md`](docs/score-metering.md); detail: [`docs/harness-cost-usage.md`](docs/harness-cost-usage.md)). **Forbid silent `n/a` when a meter exists. Do not invent numbers.** Aim under the nrn-xai baseline (~3.6M tokens / ~$0.86) when comparable. RTK/Headroom are optional workstation tools — not repo dependencies.

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
