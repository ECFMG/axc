# Harness trim log

On-demand only (not a skill, not loaded at session start, excluded from the trim-guard budget).

Trimming is AI-driven with no human step: when `scripts/trim-guard.mjs` fails during harness work, trim in a harness round — never inside a SCORE run (the guard only reports). Order: 1) remove duplicates, 2) remove rules whose `docs/mog-rules-ledger.md` entry shows no matching sink in recent runs, 3) compress wording, 4) move detail into on-demand files. Never drop a rule tied to a sink seen in the last TRIM_PROTECT_RUNS = 20 runs (single value in `scripts/trim-guard.config.json`).

Each entry: date (ET) · commit (a commit can't name its own SHA, so it is filled in by the next trim/guard commit) · file · bytes before → after · what was removed/moved/reworded · why.

## 2026-10-23 — run-validation duplicates
- commit: dcf34cf
- file: `.agents/skills/run-validation/SKILL.md` · 716 → 559 bytes
- removed (kind 1, duplicates): "- Never run `pnpm run verify`, `test:arch`, acceptance or `git commit` yourself; never `--no-verify`." / "- No Stop hook (non-Grok tool): `node scripts/stop-gate.mjs run` once at the end." / "- Repeated failure → `docs/mog-critique.md` (by path; 3–10 rounds)." — all three now live once in `AGENTS.md` (recipe step 3, write-boundary line, fail-repair line); replaced by a one-line pointer.
- why: ≥75% word containment with AGENTS.md lines; no rule dropped, so the 20-run protection is not affected.

## 2026-10-23 — map orientation duplicates
- commit: 085f5bc
- file: `.agents/skills/mog-repo-map/SKILL.md` · 12138 → 11991 bytes
- removed (kind 1, duplicates): "Authoritative — don't re-verify it in source or cellixjs (cellixjs only to port a missing package)." and "or anything AGENTS bans; never list cellixjs" — same rules stay once in `AGENTS.md` (line 5 "cellixjs only to port a missing package (never list)", recipe step 1 "authoritative — don't re-verify in source/cellixjs", the Never-read line). Kept: "**Never** open `packages/cellix/**` sources you won't edit."
- why: 83% word containment with AGENTS.md line 5; no rule dropped, 20-run protection unaffected.

## 2026-10-23 — domain import trap stated once
- commit: 279053e
- files: `AGENTS.md` · 2239 → 2075 bytes; `.agents/skills/mog-repo-map/SKILL.md` · 11991 → 12115 bytes
- moved (kind 1, duplicates): AGENTS trap "- `packages/axc/domain/src/**` (tests too) must not import `hono`, `@azure/`, `mongoose`, `mongodb`, `@axc/rest|persistence|service-mongoose|application-services`." → merged into the map's Layering line, which now also states this round's REST / application-services / apps/api arch rules (test:arch prints file + rule + fix).
- why: the same layering rule lived in AGENTS, the map and test:arch; one copy in the map. No rule dropped (sinks in the last 20 runs: none recorded), so the 20-run protection is unaffected.

## 2026-10-23 — Copilot instructions point at the AGENTS write boundary
- commit: a2b85be
- file: `.github/copilot-instructions.md` · 2169 → 2003 bytes
- removed (kind 1, duplicates): "Write only under: `apps/api`, `apps/docs`, `packages/axc/*`, `packages/axc-verification/*`." / "May port `packages/cellix/**` from `/Volumes/files/src/cellixjs` when a required Cellix capability is missing." / "Do not weaken verify/guardrails. Never `--no-verify`." — the same rules are in `AGENTS.md` "Write boundary" (Copilot loads AGENTS too) and enforced by the write-boundary hook; replaced by one pointer line.
- why: 88% word containment with AGENTS.md:13; no rule dropped, 20-run protection unaffected.

## 2026-10-23 — AGENTS: Dev line deduped, Territory and eval-docs lines reworded (room for the b-out-6 fixes)
- commit: 3335bd7
- file: `AGENTS.md` · 2075 → 1974 bytes
- removed (kind 1, duplicate): "Dev: `pnpm run dev` / `pnpm run dev:worktree`." — same commands live in `.github/copilot-instructions.md` (Commands block); not used on the SCORE path.
- reworded (kind 3): "Branch `mog-xai-1`. Local commits only — no push/PR. Don't drive `mog-xai-1-a-out*`; don't run `task-set-*-prompt.md` yourself." → "Local commits only — no push/PR. Don't drive other `mog-xai-1-*` worktrees or run `task-set-*-prompt.md`." (stale branch name dropped; rule kept and widened to every run worktree). "Never read or edit `evaluation-run-record.md` or eval/score docs (…) — the operator fills them." → "Never read or edit `evaluation-run-record.md`, `docs/eval-contract.md`, `docs/score-metering.md`, `docs/harness-cost-usage.md` (operator-owned)."
- why: AGENTS is at its 2075-byte budget and the b-out-6 fixes (tool-neutral stop, never-run checks, never-read list) need ~80 bytes. No rule dropped; none of these lines is tied to a sink in the last 20 runs.

## 2026-10-23 — map: three duplicated clauses (room for the b-out-6 read list and hints)
- commit: 2825942
- file: `.agents/skills/mog-repo-map/SKILL.md` · 12115 → 11971 bytes
- removed (kind 1, duplicates): Layout "new page id must be in sidebars.ts docs: [...] (ids = file names)" → pointer "(page ids: see Docs fact)" (the Docs fact already says "add its id (= filename) to `sidebars.ts` `docs: [...]`"); Layout row "packages/cellix/*                 vendored, reuse" (AGENTS trap "`packages/cellix/**` is vendored: reuse, don't fork"); Unit "Tests elsewhere need new devDeps → lockfile churn." (Lockfile fact "Anything else = lockfile churn" + AGENTS trap).
- why: the map is at its 12115-byte budget; the b-out-6 fixes (complete one-round read list, useAwait / knip-export wording) need ~135 bytes. The lockfile rule (sink a-out-18, a-out-20, b-out-5 — inside the 20-run window) is kept in two places; only its third copy went.

## 2026-10-23 — mog-xai-1-grok: map, write skeleton and patterns move into preloaded `.grok/rules/` (budget change, no rule dropped)
- commit: 4685339
- files: `.agents/skills/mog-repo-map/SKILL.md` 12115 → 321 bytes (pointer; budget 12115 → 321) · new `.grok/rules/mog-repo-map.md` 11816 (the map body, read-list line now names only what is not preloaded) · `.agents/skills/mog-repo-map/write-skeleton.md` → `.grok/rules/mog-write-skeleton.md` 4423 → 4404 (header says preloaded) · new generated `.grok/rules/mog-patterns.md` 3303 (healthcheck.steps.ts, questions.ts, health.test.ts; `scripts/grok-rules.mjs`, sync-tested)
- budget: new per-file budgets for the three rules files plus a `.grok/rules` total of 19545 = old map 12115 + write skeleton 4423 + pattern sources 3007 (what the agent used to read in orientation); every `.md` there must carry a budget. AGENTS stays at 2075 (2067), run-validation 559, copilot 2003.
- why: Grok preloads `.grok/rules/*.md` at session start (grok inspect: Project Instructions), so the b-out-5/6 orientation reads of these files (in the last 20 runs) go away; content is preloaded once, not also via the skill.

## 2026-10-23 — grok map: questions.ts API list now preloaded
- commit: fd424db
- file: `.grok/rules/mog-repo-map.md` · 11816 → 11755 bytes (budget lowered to match)
- removed (kind 1, duplicates): "(`responseBody<T>()`, `resolved()`, `patchJson(path, body)`)" after `questions.ts` in the Acceptance fact — the full `questions.ts` source is preloaded in `.grok/rules/mog-patterns.md`.
- why: same content was preloaded twice; `.grok/rules` total drops toward its 19545 cap. No rule dropped (the `responseBody<T>()` sync note under biome `useAwait` stays: sink b-out-6, inside the 20-run window).

## 2026-10-23 — grok: lever 6 dropped (native `[permission]` deny rules removed)
- commit: filled in by the next trim commit
- files: `.grok/config.toml` (34 `Bash(...)` deny rules) deleted · ledger row "`Bash(git commit*)` | .grok/config.toml" dropped · `scripts/grok-config.test.mjs` now asserts the project config sets no Bash deny/ask rule
- why: headless smoke (grok 1.0.67 `-p --always-approve`, throwaway worktree of fd424db): with the rules loaded `echo $(git rev-parse --short HEAD)` was refused ("could not be checked against the permission rules, so it was not run"); with them removed it ran. Per the docs an interactive session prompts instead (unattended → hang; unverified). No rule set avoids that path, so the write-boundary PreToolUse hook (same denials, sink b-out-6) stays the only command deny. No agent-facing rule removed.

