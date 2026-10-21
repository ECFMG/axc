# AXC Eval Contract — Task Set A (TS-A-CATALOG-SEARCH)

Portable contract for harness prep on `mog-xai-1` and the completed SCORE on Eval Runner’s `mog-xai-1-a-out`.
**This file does not run the eval.** Harness must not self-run the unmodified Task Set A prompt.

> **Portability caveat:** Overnight prep on one workstation does **NOT** prove multi-workstation portability.

> **Feature status (SCORE):** `GET /api/courses` catalog search was implemented on a-out and **passed SCORE 100%**. The feature remains a clean-eval result, not an overnight-prep deliverable on mog-xai-1.

## Task identity

| Field | Value |
| --- | --- |
| Task Set ID | `TS-A-CATALOG-SEARCH` |
| Feature | `GET /api/courses` course catalog search (**SCORE PASS 100% on a-out; not an overnight-prep deliverable**) |
| Prompt (source) | `/Volumes/files/src/axc/task-set-a-prompt.md` |
| Requirements (source) | `/Volumes/files/src/axc/task-set-a-requirements.md` |
| Who runs them | **Eval Runner only** (on `mog-xai-1-a-out`) |
| Who must NOT run them | Harness / mog-xai-1 prep agents |

### Path resolvability

| Path | Status |
| --- | --- |
| `/Volumes/files/src/axc/task-set-a-prompt.md` | Resolvable on this workstation when `/Volumes/files/src/axc` is mounted |
| `/Volumes/files/src/axc/task-set-a-requirements.md` | Resolvable on this workstation when `/Volumes/files/src/axc` is mounted |
| Alternate/copied prompt·reqs on a-out | **NOT SCOREABLE** until Eval Runner confirms resolvable paths in the a-out brief |

If prompt/reqs paths cannot be resolved on the scoring machine → **automatic NO-GO for scoring** (prep may still be OK).

## Write boundary (scoring + prep)

Allowed:

- `apps/api`, `apps/docs`
- `packages/axc/*`, `packages/axc-verification/*`
- May port `packages/cellix/**` from local Cellix (`/Volumes/files/src/cellixjs`) when a required capability is missing — do not diverge from upstream Cellix intent

Do not weaken `pnpm run verify` / husky. Never `--no-verify`. Never push/PR from `mog-xai-1`.

## Success criteria (scoreable behaviors — later clean eval)

Functional (A1–A11) plus acceptance (A-AC1–12), ≥12 seeded courses, and green `pnpm run verify`.
These apply when Eval Runner runs TS-A on a-out — **not** as overnight harness deliverables.

### A-AC1–12 → `GET /api/courses` behaviors

| ID | Behavior |
| --- | --- |
| A-AC1 | `GET /api/courses` returns a paginated list using default pagination (`page=1`, `pageSize=10`, default `sort=title`). |
| A-AC2 | `GET /api/courses?q=security` returns courses where `security` appears in title, summary, or tags (case-insensitive). |
| A-AC3 | `GET /api/courses?modality=online` returns only online courses. |
| A-AC4 | `GET /api/courses?status=active` returns only active courses. |
| A-AC5 | `GET /api/courses?tag=ai` returns courses containing the `ai` tag (case-insensitive). |
| A-AC6 | `GET /api/courses?page=1&pageSize=5` returns ≤5 items and includes pagination metadata. |
| A-AC7 | `GET /api/courses?sort=createdAt` returns records sorted by `createdAt`. |
| A-AC8 | Invalid `modality`, `status`, `page`, `pageSize`, or `sort` → HTTP **400** with `INVALID_QUERY_PARAMETER` (consistent error body). |
| A-AC9 | No matches → HTTP **200** with empty `items` array (not an error). |
| A-AC10 | Existing tests still pass. |
| A-AC11 | New tests cover main success path, ≥2 filter combinations, pagination, sorting, and invalid query parameters. |
| A-AC12 | Docs include endpoint path, query parameters, success response, and error response. |

Also required at scoring time: seed/fixture **≥12** courses (mixed modality/status/tags); full gate **`pnpm run verify`**.

## Skills (default path)

| Skill | Default |
| --- | --- |
| **`mog-repo-map`** | **ON** — compact repo map; load first instead of dumping trees |
| **`run-validation`** | **ON** — targeted checks ending in one `pnpm run verify` |
| `plan-feature`, `review-diff`, `tdd`, `serenity-tests`, `minimal-build`, `portless`, `turborepo` | **Archived** in `docs/skills-archive/` — not in the skill catalog; never on SCORE |
| `mog-critique` | **Not a skill** — `docs/mog-critique.md`, opened by path on harness prep / fail-repair only (3–10 rounds, stop when clean). Never on clean SCORE. |
| Copilot `.github/agents/*` + hooks | Optional additive for Copilot CLI; **do not load** for default Grok/Cursor SCORE. Write-boundary zero-token guard: `.github/hooks/write-boundary.*` (wired from `enforce-agent-workflow.sh`) |

Default SCORE context: load **`mog-repo-map`** then **`run-validation`** only — keep lean (no always-on critique). Prefer targeted reads over dumping large trees; do not open `docs/mog-critique.md`, Copilot agents, `docs/skills-archive/`, this file, `dist/`, or list cellixjs. Prefer terse summaries over diff/log dumps in chat.

### `mog-critique` vs SCORE

| Path | Critique |
| --- | --- |
| Default SCORE | **Off** — `mog-repo-map` + `run-validation` only |
| Fail/repair or harness prep | **Opt-in** — open `docs/mog-critique.md`; 3–10 rounds, stop early when clean |

## Vitest determinism policy (existing lock pin — choice A)

**Do not invent a new lock.** Cite existing pins already frozen in `pnpm-lock.yaml` (catalog resolution). Do not bump during an eval run without documenting it in the Evaluation Run Record.

| Package | Version in `pnpm-lock.yaml` |
| --- | --- |
| `vitest` | `4.1.11` |
| `@vitest/coverage-istanbul` | `4.1.11` |
| `@vitest/runner` | `4.1.11` |
| `@vitest/snapshot` | `4.1.11` |
| `vite` | `8.3.0` |

Shared config: `@cellix/config-vitest` (`nodeConfig` / `archConfig`) — no intentional random shuffle / custom seed. Keep the frozen lockfile as the pin source of truth.

## Token / cost capture (reuse Evaluation Run Record only)

**No parallel schema.** Eval Runner fills the existing fields in [`evaluation-run-record.md`](../evaluation-run-record.md) only (see also [`docs/harness-cost-usage.md`](harness-cost-usage.md)):

| Evaluation Run Record field | Use |
| --- | --- |
| Input Tokens | Prompt / input tokens |
| Cached Tokens | Cache-hit tokens when reported; else `n/a` + reason |
| Output Tokens | Completion / output tokens |
| Total Tokens or Credits Used | Sum or provider credits |
| Estimated Cost | Currency estimate when available |

Also record Model / Harness / Branch / Commit in that same table.

### Competitiveness target

When the SCORE run is comparable (same Task Set A catalog-search scope, implement + tests + verify), aim to **beat the nrn-xai baseline of ~3.6M total tokens / ~$0.86**. Lower is better. Record actuals in the five fields above; do not invent numbers.

### Provisional Grok aspirational ceiling

**Provisional aspirational ceiling: 800,000 total tokens per SCORE attempt** (Input+Output; Cached counted separately if available) — provisional / **unmeasured** for Grok. Keep as aspirational until a metered Grok SCORE exists; revise when measured. Do not invent alternate field names (e.g. do not create a separate `input_tokens` table).

**Mohit-confirmed SCORE meter (2026-10-01):** fresh **Grok Build** session → unmodified TS-A → **`/usage`** at end → fill the five fields above (see [`docs/score-metering.md`](score-metering.md)). Map whatever `/usage` exposes; if Cached is absent, `n/a` only for that field with a note. Note meter source `Grok Build /usage` + session timestamp in Config / Diff Notes. **Do not declare SCORE complete** until those fields are filled.

**Forbid silent `n/a`:** if `/usage` (or a fallback meter) exposes a field, fill it. Only use `n/a` with an explicit reason when a field is truly absent. Background Grok Bot executor / sand-subagent alone still has no panel — do **not** use executor-only as the metered SCORE path when Build `/usage` is available. Other meters (Cursor, Claude Code, Codex, etc.) are **fallbacks only**.

## OVERNIGHT PREP DONE (mog-xai-1 harness)

Checklist of prep that may complete overnight. Items may be marked **NOT SCOREABLE** and still count as prep-ok.
The endpoint was intentionally not implemented during overnight prep; clean SCORE later completed on a-out.

- [ ] Portable harness intact: `AGENTS.md`, `.agents/skills/**`, verify gate, `dev:worktree`, cost doc
- [ ] Skills defaults documented: **`mog-repo-map`** + **`run-validation`** on SCORE; `docs/mog-critique.md` opt-in (by path); other skills archived (`docs/skills-archive/`); never auto-open `.github/agents/*`
- [ ] Copilot agents ported under `.github/agents/` (orchestrator/planner/implementer/reviewer/validator/security/…)
- [ ] Copilot hooks under `.github/hooks/` (`workflow-enforcement.json` + enforce scripts); session-only (not husky)
- [ ] Thin `.github/copilot-instructions.md` discovers agents/hooks
- [ ] Vitest: existing **`4.1.11`** pin + frozen `pnpm-lock.yaml` documented (no new lock invented)
- [ ] Cost/usage: reuse `evaluation-run-record.md` fields only + `docs/harness-cost-usage.md`; Mohit-confirmed meter **Grok Build `/usage`** (`docs/score-metering.md`)
- [ ] This `docs/eval-contract.md` committed on `mog-xai-1`
- [ ] Local commit(s) on `mog-xai-1`; **no push**; **no unmodified TS-A prompt run**
- [ ] `GET /api/courses` **not** implemented overnight (**expected**)
- [x] Token competitiveness target documented: beat nrn-xai ~3.6M / ~$0.86 when comparable; provisional Grok **800k** remains aspirational until measured
- [ ] a-out worktree/branch **not** created by harness overnight (Eval Runner creates it in MORNING SCORE GO if absent)

## MORNING SCORE GO (scoring readiness; completed PASS)

**SCORE GO** requires **all** of:

1. **`mog-xai-1-a-out` exists** — Eval Runner **creates `mog-xai-1-a-out` if absent** (documented Eval Runner morning step; harness does not create it during overnight prep).
2. **Contract present for scoring:** `docs/eval-contract.md` present on **`mog-xai-1-a-out`** **OR** the full contract text included in the Eval Runner brief.
3. **Resolvable prompt + requirements paths** on the scoring machine (see Path resolvability).
4. **Mohit-confirmed meter before SCORE GO**: fresh Grok Build session + `/usage` after SCORE (record runner host + session window). Executor/sand-subagent-only is not the metered path when Build `/usage` is available. Fallbacks only if Build `/usage` cannot cover the run.
5. **Nothing critical marked NOT SCOREABLE** blocked (2)/(3); source paths were resolvable for this SCORE.

Morning checklist (Eval Runner):

- [x] **Create `mog-xai-1-a-out` if absent** (Eval Runner step)
- [x] Place `docs/eval-contract.md` on a-out **or** paste full contract text into Eval Runner brief
- [x] Confirm `task-set-a-prompt.md` + `task-set-a-requirements.md` paths resolvable
- [ ] Confirm Mohit-confirmed meter: fresh **Grok Build** + **`/usage`** after SCORE (see `docs/score-metering.md`); executor-only is not the metered path
- [x] Write boundary understood; feature implementation happened on a-out clean eval (not overnight prep)
- [x] Success = A1–A11 + A-AC1–12 + `pnpm run verify`
- [ ] After SCORE: run **`/usage`** in the Grok Build session; fill **Evaluation Run Record** Input / Cached / Output / Total / Estimated Cost from `/usage` **before declaring complete** (see [`docs/harness-cost-usage.md`](harness-cost-usage.md)); prior SCORE was n/a (no meter)
- [x] **GO** conditions (1)–(3) were met; SCORE PASS 100% (a-out `58f31aa`, feature `22808ca`)

### Explicit a-out rule

Overnight harness prep on `mog-xai-1` must **not** create `mog-xai-1-a-out`. In the morning, **Eval Runner creates `mog-xai-1-a-out` if absent**, then ensures this contract is on a-out (or fully inlined in the brief) before scoring.

## SCORE result

**PASS 100% @ a-out `58f31aa` / feature `22808ca`; tokens n/a this run (no meter). Next SCORE: fresh Grok Build + unmodified TS-A + `/usage` → fill cost fields before complete; hold 12/12; aim under ~3.6M / ~$0.86 when comparable.**
