# SCORE metering checklist

Use this checklist for **one SCORE attempt on one runner host**. A SCORE record must name the
runner host, model/harness, branch/commit, session window, and the meter source before the
attempt starts. Capture these five fields from that same window:

- **Input Tokens**
- **Cached Tokens** (cache-read/hit tokens; `n/a` only with a reason)
- **Output Tokens**
- **Total Tokens or Credits Used**
- **Estimated Cost**

### Quick paste map (Grok Build `/usage` → record)

After SCORE, run `/usage` in that same fresh Grok Build session and paste — **do not invent numbers**:

| `/usage` shows | → `evaluation-run-record.md` field |
| --- | --- |
| Input | Input Tokens |
| Cached / cache-read | Cached Tokens (`n/a` + reason if absent) |
| Output | Output Tokens |
| Total | Total Tokens or Credits Used |
| Cost / estimated cost | Estimated Cost |

Preserve `/usage` definitions; do not double-count cache into Input. Note `Grok Build /usage` + session timestamp under Config / Diff Notes.

Do not estimate tokens from transcript length, shell output, elapsed time, or RTK savings.
Keep the export/screenshot or a reference to the platform report with the evaluation record
when policy permits; never copy credentials or session cookies into the repository.

## Before SCORE GO

- [ ] Name the runner host and harness (for example, `Cursor on host A` or `Grok Bot Eval
      Runner on host B`).
- [ ] Choose one meter source and confirm it can cover the whole SCORE window: native usage
      panel/export, provider usage dashboard, or an approved metered host.
- [ ] Record the start time, expected end time, model, branch, and commit. Use the user's
      local timezone in the record.
- [ ] Use a fresh session, or write down the exact time/session filter so unrelated work is
      excluded.

## Runner-host procedures

### Cursor

1. After the session, open **Cursor Dashboard → Usage** (or the editor's **Settings →
   Usage** panel when that client exposes it).
2. Select the runner user/host and the narrow date/time window for this SCORE. Use the
   dashboard's **Export/CSV** control when available; otherwise save the visible usage
   summary according to local policy.
3. Map the export's input, cache-read/cache-write, output, total, and cost columns to the
   five record fields. Preserve the export's definitions: do not add cache-read tokens to
   input a second time. If the export is account-wide rather than session-specific, use a
   dedicated account/session window and state that limitation in Config / Diff Notes.
4. Cursor's documented agent hooks can expose per-response `input_tokens`,
   `output_tokens`, `cache_read_tokens`, and `cache_write_tokens` when hooks are configured.
   These are a useful local cross-check; team/enterprise usage export is preferred when
   subagents or multiple model calls must be included.
5. There is no guaranteed portable `usage.json` path. Check only an operator-configured
   hook/export location. On this Mac, no `~/.cursor`, `~/Library/Application Support/Cursor`,
   or `~/.config/Cursor` usage directory was present when this checklist was prepared;
   that absence is not a reason to invent values.

### Claude Code / Codex

1. Use the client-native session usage/cost summary before closing the session (the exact
   command or UI label varies by installed version).
2. Export or transcribe Input, Cached, Output, Total, and Cost for the dedicated SCORE
   window. If the native view reports credits instead of USD, put credits in Total and
   explain the unit in Config / Diff Notes.
3. Optional: if already installed, run the session through Headroom (`headroom wrap …`) and
   retain `headroom stats` as a context-compression report. Headroom is not a replacement
   for the native provider meter.

### Copilot CLI

Use the CLI's native usage/cost summary if this version and plan expose one. Capture the
same five fields and its session/window identifier. If no native or provider meter exists,
record `n/a` with the precise reason; do not treat shell-output savings as usage.

### Grok Bot / Eval Runner (Mohit-confirmed meter path)

**Required SCORE meter path (confirmed 2026-10-01):** run unmodified Task Set A in a **fresh
Grok Build session**, then run **`/usage`** at the end of that same session and fill
[`evaluation-run-record.md`](../evaluation-run-record.md) from that `/usage` output.

Procedure:

1. Carve a **new clean** `mog-xai-1-a-out` from the current harness tip (no leftover feature).
2. Open a **fresh Grok Build session** scoped only to this SCORE (no unrelated chat).
3. Run the unmodified `task-set-a-prompt.md` (+ `task-set-a-requirements.md`) on that a-out
   with default skill `run-validation` only.
4. When the SCORE attempt finishes (pass or fail), run **`/usage`** in that same Grok Build
   session before closing it.
5. Map `/usage` Input / Cached / Output / Total / Cost (or credits) into the five evaluation
   run-record fields. Preserve `/usage` definitions; do not double-count cache.
6. Local-commit the filled record on a-out. Do not invent numbers. Do not use RTK/transcript
   length as a substitute meter.

**Background Grok Bot executor subagents** (sand-subagent) still have **no** usage panel and
do **not** produce `usage.json`. Do **not** use an executor-only run as the metered SCORE
path when `/usage` in a Grok Build session is available. If a future run is forced through
an executor-only path with no `/usage`, record `n/a` with that explicit reason — that run is
**not** comparable to a metered SCORE.

If the workload is actually using the **xAI developer API**, rather than Grok Build /
Grok Bot, an operator may use the xAI Console team's usage/billing view or its Management
API with a least-privilege **Billing: Read Only** management key. An ordinary inference key
is not a billing meter. Filter to the exact team and time window. xAI API billing is not
proof of usage for a Grok Build `/usage` session.

## Optional aids (not bill meters)

### Headroom

Headroom measures context compression and savings; it does not independently establish the
provider's billed Input/Cached/Output/Total/Cost. If it is already installed:

```bash
headroom wrap claude       # or: headroom wrap codex / headroom wrap <supported runner>
headroom stats
```

For a proxy-based runner, start the proxy and query its local session stats:

```bash
HEADROOM_TELEMETRY=on headroom proxy --port 8787
curl http://localhost:8787/stats
```

Use `/stats-history` only for durable compression history. Keep native/provider usage as
the SCORE meter and record Headroom savings separately. The open-source install is optional
and external to this repository:

```bash
uv tool install --python 3.13 "headroom-ai[all]"
```

### RTK

`rtk gain` (when RTK is installed) reports bash/tool-output reduction. It is an optional
context-noise aid, **not** a model billing meter and must never populate the five fields.

## Record rule

Fill the existing fields in [`evaluation-run-record.md`](../evaluation-run-record.md); do not
create a parallel schema. For every `n/a`, include a short reason. A source that reports
only some fields is still useful: record the known values and explain each unknown.

## Workstation check (2026-10-01 ET)

- `uv` was not on PATH, so the optional Headroom install was **not attempted**.
- `headroom` was not on PATH and no `~/.headroom` state directory was present; Headroom is
  therefore **not installed** on this Mac.
- `rtk` is installed, but remains only an output-reduction aid, not a bill meter.
- **Mohit confirmed (2026-10-01 ET):** next SCORE meters via fresh **Grok Build** session
  + **`/usage`** at end (not the background Eval Runner executor).

## References

- [Cursor Usage Analytics](https://cursor.com/docs/account/teams/analytics)
- [Cursor APIs](https://cursor.com/docs/api)
- [xAI Management API](https://docs.x.ai/developers/rest-api-reference/management)
- [Headroom metrics and stats](https://headroomlabs-ai.github.io/headroom/metrics/)
