# Harness cost / usage capture

Portable guidance for recording token and cost data from an AXC evaluation run (for example Task Set A) into the fields already defined in [`evaluation-run-record.md`](../evaluation-run-record.md).

This is documentation only. It does not install tooling and does not change verify gates.

## Target fields (from evaluation-run-record)

Fill these when the eval run completes (or as soon as the harness/tool exposes a usage summary):

| Record field | What to capture |
| --- | --- |
| Input Tokens | Prompt / input tokens for the run |
| Cached Tokens | Cache-hit / cached prompt tokens when the tool reports them; otherwise leave blank or `n/a` |
| Output Tokens | Completion / output tokens |
| Total Tokens or Credits Used | Sum of tokens, or provider credits if that is what the plan bills |
| Estimated Cost | Currency estimate for the run when available |

Other record fields (elapsed time, interventions, branch/commit, acceptance counts) stay as defined in `evaluation-run-record.md`.

## Capture options (no Headroom / RTK required)

Headroom and RTK are **not** installed in this worktree and are **not** required for a valid record. Prefer whatever the workstation already exposes:

1. **Tool-native usage summary** — After the eval session, copy Input / Output / Cached / total / cost from the IDE or CLI usage panel (Cursor, Claude Code, Codex, Gemini CLI, etc.) into the record. Prefer the session totals that cover the eval attempt, not unrelated chat.
2. **Provider / plan dashboard** — If the tool UI omits cost but the vendor dashboard shows credits or USD for the same window, use that for Estimated Cost and note the source under Config / Diff Notes.
3. **Manual fields** — When only partial numbers exist, record what is known, mark unknowns explicitly (`unknown` / `n/a`), and say so in Config / Diff Notes. Do not invent token counts.

One run → one Evaluation Run Record. Do not merge unrelated sessions into a single row.

## Optional workstation tools

If a given workstation already has **Headroom**, **RTK**, or a similar usage exporter installed, you may use it to populate the same fields. Treat those tools as optional conveniences, not harness dependencies: do not add them to this repo, do not fake-install them, and do not fail an eval because they are missing.

## When to fill the record

- After a Task Set A (or B) eval attempt finishes or is stopped.
- Include Branch / Commit for the worktree under test.
- Keep cost/usage capture out of application feature work; it belongs with the evaluation operator checklist, not with `GET /api/courses` implementation.
