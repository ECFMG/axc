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

## 2026-10-23 — map wording, to fit the negtests rule (branch mog-xai-1-negtests, on 64a3b03)
- commit: b89d2cd
- file: `.agents/skills/mog-repo-map/SKILL.md` · 12115 → 11976 bytes
- reworded (kind 3, wording): Step wiring "features from `src/features/**/*.feature`; steps via `require` = `src/serenity.ts`, `src/world.ts`, `src/step-definitions/**/*.steps.ts` (loaded through `tsx/cjs`). A new step file must be `src/step-definitions/<feature>.steps.ts` — any other name/folder is never loaded (undefined steps)." → "features `src/features/**/*.feature`; steps load only from `src/serenity.ts`, `src/world.ts`, `src/step-definitions/**/*.steps.ts` — name a new file `src/step-definitions/<feature>.steps.ts`, else undefined steps."; Derived check "so pass it through `resolved()` (else TS2345 `Expectation<boolean>` vs `Expectation<Promise<boolean>>`):" → "— wrap it in `resolved()` (else TS2345):".
- why: the map is at its 12115-byte budget and the boundary/negative-test rule needs ~120 bytes. No duplicates or sink-less rules left to drop, so wording only. Both rules kept (ledger keys `src/step-definitions/<feature>.steps.ts`, `TS2345` still present; step wiring's a-out-18 sink inside the 20-run window is unaffected).

## 2026-10-23 — map: duplicates + host wording (room for the b-out-8 orientation notes)
- commit: 79bbcc4
- file: `.agents/skills/mog-repo-map/SKILL.md` · 12115 → 11880 bytes
- removed (kind 1, duplicates): Public-API line "Imports use `.ts` extensions." (TypeScript block: "NodeNext + `.ts` import extensions"); Acceptance "(global patterns)" (the "Step patterns are global" line); Query-validation "; the skeleton's is a placeholder" (skeleton comment "placeholder: use the task spec's error shape"); frontmatter "Then open only files you will change." (read list: "files you'll change"); Layout domain ", no infra imports" (Layering line lists the domain import bans).
- reworded (kind 3): Routes "(proven)" dropped; Acceptance host "Host: `apps/api` via `scripts/start-host.ts` on 127.0.0.1:7071 (main checkout) or 7071 + worktree offset (`acceptance-port.ts`); started and stopped per run — never start it. Relative paths only; runs only in the Stop hook." → "Host (`scripts/start-host.ts`, port 7071 + worktree offset) is started/stopped by the Stop hook — never start it; relative paths only." (no ledger sink).
- why: the map is at its 12115-byte budget; the b-out-8 notes (literal requirements paths in the read list, static Serenity imports) need ~210 bytes. No rule dropped; every ledger key still present, 20-run protection unaffected.

## 2026-10-23 — map: duplicate stop line + sink-less biome clause (room for the mog-xai-2 rules)
- commit: (this commit, branch mog-xai-2)
- file: `.agents/skills/mog-repo-map/SKILL.md` · 12081 → 12014 bytes
- removed (kind 1, duplicate): read-list tail " Write in ≤2 calls, then stop." — `AGENTS.md` (always loaded) says "Write all files in ≤2 calls (one batch + one optional fix-up). Then stop." (ledger keys `Write all files in ≤2 calls`, `Then stop` live there).
- removed (kind 2, no sink): Biome "; commit runs `biome check --write`" — agents never commit (the Stop hook does); no ledger row, no run names it.
- why: the map has 34 bytes of headroom and the two mog-xai-2 rules (hand-removed exports, multi-error field order) need ~100. No rule with a sink in the last 20 runs dropped; every ledger key still present.
