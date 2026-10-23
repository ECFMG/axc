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
