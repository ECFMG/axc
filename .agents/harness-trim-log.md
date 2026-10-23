# Harness trim log

On-demand only (not a skill, not loaded at session start, excluded from the trim-guard budget).

Trimming is AI-driven with no human step: when `scripts/trim-guard.mjs` fails during harness work, trim in a harness round — never inside a SCORE run (the guard only reports). Order: 1) remove duplicates, 2) remove rules whose `docs/mog-rules-ledger.md` entry shows no matching sink in recent runs, 3) compress wording, 4) move detail into on-demand files. Never drop a rule tied to a sink seen in the last TRIM_PROTECT_RUNS = 20 runs (single value in `scripts/trim-guard.config.json`).

Each entry: date (ET) · commit (a commit can't name its own SHA, so it is filled in by the next trim/guard commit) · file · bytes before → after · what was removed/moved/reworded · why.

## 2026-10-23 — run-validation duplicates
- commit: (filled in by the next commit)
- file: `.agents/skills/run-validation/SKILL.md` · 716 → 559 bytes
- removed (kind 1, duplicates): "- Never run `pnpm run verify`, `test:arch`, acceptance or `git commit` yourself; never `--no-verify`." / "- No Stop hook (non-Grok tool): `node scripts/stop-gate.mjs run` once at the end." / "- Repeated failure → `docs/mog-critique.md` (by path; 3–10 rounds)." — all three now live once in `AGENTS.md` (recipe step 3, write-boundary line, fail-repair line); replaced by a one-line pointer.
- why: ≥75% word containment with AGENTS.md lines; no rule dropped, so the 20-run protection is not affected.
