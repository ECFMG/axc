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
| Vendored Cellix convention suites run for each axc package from `axc-verification/archunit-tests/src/cellix-conventions` (`test:arch`) + fs-based layer rules and feature-file shape test in the same package | Prose conventions in AGENTS.md | Structural defects (missing `.aggregate.ts`, UoW not on `MongoUnitOfWork`, mutations outside `withScopedTransaction`, Then-only mega-scenarios) surface as failing tests the stop gate reports, instead of being found in review. Dry run on the v14 Task B output: 12 convention failures + 22 feature-shape violations, all genuine. |
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
zero files and pass vacuously (this was true of the v14 dependency-rules test). The suites in
`src/cellix-conventions/*.test.ts` therefore `chdir` into the package under test before running
(`support/package-scope.ts`; vitest isolates each file in its own worker), which keeps all
verification code in `axc-verification` and the `packages/axc/*` packages free of harness files.
Cross-package rules read the filesystem directly.

## Iteration 16 (from the iteration-15 A/B runs)
Baselines to beat: Task A 90 / $1.60 / 7 approvals / 12m57s; Task B 77 / $2.80 / 10 approvals / 28m29s.

| Mechanism | Replaces | Hypothesis |
| --- | --- | --- |
| `apps/docs/turbo.json` and `archunit-tests/turbo.json` declare real inputs (`docs/**`, `sidebars.ts`, `$TURBO_ROOT$/packages/axc/**`, acceptance features) | Root inputs (`src/**` only), which let v15-B ship a broken sidebar id behind a cached docs build and a cached `test:arch` | No false-green gate: a doc or source edit always re-executes the docs build and `test:arch`. Stop-gate evidence records `turboCached/turboTotal` per check so a cache hit after a change is visible. |
| `docs-sidebar.test.ts` in `test:arch` | Nothing (defect found only by a direct `docusaurus build`) | Dangling sidebar ids and unlisted docs fail before the build runs. Planted the v15-B defect: fails. |
| Feature-file shape rule: an unparameterised `Then` reused by >5 scenarios in a package fails | Prose "one behaviour per scenario" | Unit-level features stop sharing one generic Then across 83 scenarios (v15-B) and 38 (v15-A); acceptance features are unaffected. |
| `requirements_reviewer`: medium effort, ≤15 tool calls, acceptance suite + one probe per endpoint, no re-run of the full gate | High effort, re-ran tests/arch/build (≈22% of v15-B tokens) | Task B cost ≥25% lower with the same findings. |
| Skills: no manual `stop-gate.mjs` run, one review round unless blocker/major, layer tests while iterating and the full suite once per layer | Agent re-running the gate and the full suite after each layer | Fewer duplicated checks, fewer tokens. |
| AGENTS.md: commit once on green with the hook active; lockfile output of `pnpm install --offline` is allowed inside the write boundary | "uncommitted" rule plus a boundary that contradicted the install step (v15-B reviewer blocked on it) | No end-of-run question to the operator; the record's commit is the agent's. Stop gate also inspects committed-but-unpushed paths. |
| `[sandbox_workspace_write] network_access = true` in `.codex/config.toml`; `pnpm-lock` exception; docs/ADR paths in `cellix-feature-layout` | Sandbox escalations for registry, mongodb-memory-server and the host port; docs under four different paths across runs | Approvals ≤3 per task; docs at `apps/docs/docs/api/<feature>.md` and `adr/NNNN-<slug>.md` listed in the sidebar. |
| `scripts/snyk-verify.mjs` detects the monthly-quota notice | Silent pass | The record states whether Snyk tested the projects or only printed a quota notice. |

Targets for v16 A/B: Task A ≥90, Task B ≥77 (expect the docs and test-step points back), B cost ≤$2.10, approvals ≤3, zero cached gate results after a change.

### Pre-flight (operator)
1. Hooks changed (`stop-gate.mjs`, `pre-tool-policy.mjs`): open Codex in the run branch and re-trust them via `/hooks` before pasting the prompt.
2. Mongo binaries are cached under `~/.cache/mongodb-binaries`; if a run still asks to download one, run `pnpm run test` once outside Codex.
3. If the first run still prompts for network, the project-scoped `[sandbox_workspace_write]` is being ignored: add the same block to `~/.codex/config.toml` and note it in the record.
