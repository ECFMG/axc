# Harness notes (Codex)

Project-scoped Codex configuration for the harness-engineering iterations on `hac-oai-N`
branches. Agent outputs land on `hac-oai-N-a-out` / `hac-oai-N-b-out`; the last commit on each
output branch fills `evaluation-run-record.md`.

## Layout
| Path | Purpose |
| --- | --- |
| `hooks.json`, `hooks/` | PreToolUse policy, PostToolUse Biome feedback, Stop gate with evidence log. Unit tests: `node --test .codex/hooks`. |
| `rules/axc.rules` | Execpolicy: verification commands auto-allowed, dependency and hook-bypass commands forbidden. Check: `codex execpolicy check --rules .codex/rules/axc.rules -- <cmd>`. |
| `agents/reviewer.toml` | `requirements_reviewer` custom agent used by the `adversarial-review` skill. |
| `config.toml` | Minimal project config (`max_concurrent_threads_per_session = 2`; LSP server left commented). |
| `../AGENTS.md`, `../.agents/skills/` | Router + skills (`cellix-feature-layout`, `axc-tdd`, `change-verification`, `adversarial-review`). |
| `../scripts/codex-session-usage.mjs` | Token/elapsed summary from a session rollout for the run record. |

## Trust and setup before a run
1. Open the repo in Codex, run `/hooks` and trust `.codex/hooks.json` (trust is hash-based: redo this after any hook edit).
2. Confirm the project `.codex` directory is trusted so `config.toml`, `rules/` and `agents/` load.
3. `pnpm install --offline --frozen-lockfile` and `pnpm run verify` must be green on the harness branch before branching the output branch.

## Run protocol (per task)
- Branch `hac-oai-N-<task>-out` from `hac-oai-N`; give the agent the task text and spec paths only.
- Record every approval prompt, redirect and stop-gate continuation while the run is live.
- After the run: `node scripts/codex-session-usage.mjs --latest --cwd $PWD` for the token rows; copy `$TMPDIR/codex-stop-gate/<session>-evidence.jsonl` next to the record (do not commit it inside `packages/`).
- Run Task A and Task B on the same harness commit before changing the harness again.

## Iteration 15 (from the iteration-14 review)
Mechanisms added, each with the hypothesis it tests. Because several change at once, attribute
effects by reading the evidence log and the approval count, not only the rubric total.

| Mechanism | Replaces | Hypothesis |
| --- | --- | --- |
| Per-package Cellix convention suites (`packages/axc/*/src/archunit-tests`, `test:arch`) + fs-based layer rules and feature-file shape test in `axc-verification/archunit-tests` | Prose conventions in AGENTS.md | Structural defects (missing `.aggregate.ts`, UoW not on `MongoUnitOfWork`, mutations outside `withScopedTransaction`, Then-only mega-scenarios) surface as failing tests the stop gate reports, instead of being found in review. Dry run on the v14 Task B output: 12 convention failures + 22 feature-shape violations, all genuine. |
| `pre-tool-policy.mjs` | Prose "do not edit the lockfile / add dependencies / write plans" | Denials with reasons cost fewer tokens than a redirect and remove the v12 shell-bypass gap. |
| Evidence-logging stop gate | Stop gate without a trace | The run record's "tests passed" line becomes reproducible from the log. |
| `rules/axc.rules` | Approval prompts for routine commands | 9 approvals in v14 → ≤1. |
| `requirements_reviewer` agent, spec + base commit only | Self-review with the implementer's summary | The reviewer finds unmet requirements the implementer's narrative hides. |
| AGENTS.md router (≈470 words) + skills | 2.3k-word AGENTS.md with five incorrect ocom claims | Less prompt per turn, correct references, no Task-A-specific wording. |
| `scripts/snyk-verify.mjs` reads `SNYK_ORG`; `.snyk` ignore for the pre-existing urijs advisory; hono 4.13.11 and two overrides | Hard-coded org that failed the pre-commit hook | `pnpm run verify` is green, so output commits never need `--no-verify`. |

Targets for v15 A/B: ≤3.5M total tokens per task, 0 human redirects, ≤1 approval, rubric ≥ v14.

### Finding worth keeping
`@cellix/archunit-tests` `projectFiles()` scopes to the tsconfig of the current working directory,
so convention suites placed in `axc-verification/archunit-tests` with cross-package globs match
zero files and pass vacuously (this was true of the v14 dependency-rules test). Convention suites
must run inside each package; cross-package rules read the filesystem directly.
