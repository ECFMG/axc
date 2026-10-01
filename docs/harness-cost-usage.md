# Harness cost / usage capture

Portable guidance for recording token and cost data from an AXC evaluation run (for example Task Set A) into the fields already defined in [`evaluation-run-record.md`](../evaluation-run-record.md).

This is documentation only. It does not install tooling and does not change verify gates.

For the runner-specific procedures and the **Mohit-confirmed** Grok Build `/usage` meter path, see [`docs/score-metering.md`](score-metering.md).

## Target fields (from evaluation-run-record)

Fill these when the eval run completes (or as soon as the harness/tool exposes a usage summary):

| Record field | What to capture |
| --- | --- |
| Input Tokens | Prompt / input tokens for the run |
| Cached Tokens | Cache-hit / cached prompt tokens when the tool reports them; otherwise `n/a` **with reason** |
| Output Tokens | Completion / output tokens |
| Total Tokens or Credits Used | Sum of tokens, or provider credits if that is what the plan bills |
| Estimated Cost | Currency estimate for the run when available |

Other record fields (elapsed time, interventions, branch/commit, acceptance counts) stay as defined in `evaluation-run-record.md`.

## SCORE operator steps (before / after)

### Before the SCORE attempt

1. Note Model / Harness / License / Plan, runner host, and Branch / Commit you will score.
2. **Confirm the Mohit-confirmed meter before SCORE GO:** fresh **Grok Build** session + **`/usage`** at end (see `score-metering.md`). Background Grok Bot executor / sand-subagent alone has no panel — do not use executor-only as the metered path when Build `/usage` is available.
3. Record the session start/end window and how it will be filtered. See [`score-metering.md`](score-metering.md) for Cursor, Claude Code, Codex, Copilot CLI, Grok Build `/usage`, Headroom, and RTK procedures.
4. If RTK is installed on the workstation, optionally note a pre-run `rtk gain` baseline (bash-output savings only — see below). Do **not** treat missing RTK as a blocker or a bill meter.
5. Prefer a **fresh Grok Build session** scoped to the SCORE attempt so totals are not mixed with unrelated chat.

### After the SCORE attempt

1. In that same Grok Build session, run **`/usage`** before closing (do not silently substitute RTK or Headroom savings).
2. Copy `/usage` into the five record fields using the paste map in [`evaluation-run-record.md`](../evaluation-run-record.md) and [`score-metering.md`](score-metering.md) (Input / Cached / Output / Total / Estimated Cost). Map whatever `/usage` exposes; if Cached is absent, `n/a` **only for that field** with a note. Do not invent numbers.
3. Note meter source `Grok Build /usage` + session timestamp under Config / Diff Notes.
4. If `/usage` reports tokens but omits USD, fill token fields and use the provider/plan dashboard for Estimated Cost when the window matches; note the source under Config / Diff Notes.
5. **Do not write silent `n/a` when a meter exists.** If Input/Output/Total (or cost) is visible in `/usage` or a fallback UI/export, record it.
6. If **truly** no meter is available for a field, write `n/a` **and** a short reason in that cell or in Config / Diff Notes.
7. One run → one Evaluation Run Record. Do not merge unrelated sessions into a single row.
8. **Do not declare SCORE complete** until the five fields are filled from `/usage` (or explicit per-field `n/a` + reason).

## Capture options (no Headroom / RTK required)

Headroom and RTK are **not** repo dependencies and are **not** required for a valid record.

1. **Default (Mohit-confirmed): Grok Build `/usage`** — After unmodified TS-A SCORE in a fresh Grok Build session, run `/usage` and copy into the record (see `score-metering.md`).
2. **Fallback tool-native usage summary** — Cursor, Claude Code, Codex, Gemini CLI, Copilot CLI, or another metered runner when Build `/usage` cannot cover the window.
3. **Provider / plan dashboard** — If the tool UI omits cost but the vendor dashboard shows credits or USD for the same window, use that for Estimated Cost and note the source under Config / Diff Notes.
4. **Partial meters** — Record what is known; mark unknowns as `n/a` + reason. Do not invent token counts.

## Optional workstation tools

### RTK (Rust Token Killer) — free, recommended when available

Install on the Mac (not as a repo dependency):

```bash
brew install rtk-ai/tap/rtk
rtk --version
rtk gain
```

- `rtk gain` reports **bash/tool-output compression savings**, not the full model bill. Still useful for operators reducing shell noise into the context window.
- Optional `rtk init` (project or `-g` global) only writes local agent hook configs. Prefer documenting it as an **operator step** rather than committing tool-specific hook spam that can break portable Grok/Cursor paths. Do not add RTK to `package.json` / lockfiles. RTK output reduction is not a bill meter.

### Open-source Headroom CLI — optional external (not installed by harness)

Skip the paid Headroom.app cask. If you want the Apache-2.0 CLI later (heavy; not required tonight):

```bash
uv tool install --python 3.13 "headroom-ai[all]"
```

See [headroomlabs-ai/headroom](https://github.com/headroomlabs-ai/headroom). Treat as optional convenience only.

## When to fill the record

- After a Task Set A (or B) eval attempt finishes or is stopped — **and after `/usage`** on the SCORE Grok Build session.
- Include Branch / Commit for the worktree under test.
- Keep cost/usage capture out of application feature work; it belongs with the evaluation operator checklist, not with `GET /api/courses` implementation.
