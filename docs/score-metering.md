# SCORE metering checklist

Use this checklist for **one SCORE attempt on one runner host**. A SCORE record must name the
runner host, model/harness, branch/commit, session window, and the meter source before the
attempt starts. Capture these five fields from that same window:

- **Input Tokens**
- **Cached Tokens** (cache-read/hit tokens; `n/a` only with a reason)
- **Output Tokens**
- **Total Tokens or Credits Used**
- **Estimated Cost**

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

### Grok Bot / Eval Runner executor

The Eval Runner Grok Bot executor currently has **no usage panel and does not produce a
session `usage.json`**. Therefore:

- The operator **must** supply a platform usage UI/report covering this exact executor
  session, or re-run SCORE under a metered host (for example Cursor, Claude Code, or Codex).
- If neither is available, record each unavailable field as `n/a — Grok Bot Eval Runner
  executor has no usage panel or usage.json for this session` and put the same explanation
  in Config / Diff Notes. This is an explicit exception, not a successful meter capture.
- Do not derive tokens from the transcript, tool calls, elapsed time, or RTK output. Do not
  label the run comparable to a metered SCORE when its fields are `n/a`.

If the workload is actually using the **xAI developer API**, rather than the Grok Bot
executor, an operator may use the xAI Console team's usage/billing view or its Management
API with a least-privilege **Billing: Read Only** management key. An ordinary inference key
is not a billing meter. Filter to the exact team and time window, and note that an API billing
report may provide cost/credits without all five token fields. xAI API billing is not proof
of usage for a consumer/platform Grok Bot session.

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

## References

- [Cursor Usage Analytics](https://cursor.com/docs/account/teams/analytics)
- [Cursor APIs](https://cursor.com/docs/api)
- [xAI Management API](https://docs.x.ai/developers/rest-api-reference/management)
- [Headroom metrics and stats](https://headroomlabs-ai.github.io/headroom/metrics/)
