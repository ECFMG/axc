# v7.12.02 changes

Parent: supplied `openai-harness-v7.12.01.zip`. Parent documentation and validation
remain labeled in `parent-v7.12.01/`; older v7.12 history is unchanged.

## Implemented

1. Add optional, guarded two-file actions. The controller exposes only next planned
   targets, rejects duplicate/mixed/oversized writes, and checks the entire batch
   before applying files. Legacy one-file actions remain supported.
2. Page source inventories instead of repeating them, omit duplicated pending-plan
   prose, and retain stateless target-specific source and diagnostics. Add explicit
   native-host mode and fresh host work packets without invoking the adapter or
   conflating harness-assisted host execution with a no-harness control.
3. Preserve focused compilation/unit repair checks and their success cache. Move
   the repair-loop independent oracle to the unchanged mandatory final suite.
   A failure can still trigger bounded repairs; final quality requires every gate.
4. Add `finish` for optional execution plus final gates, reports, a reviewer brief
   and optional ZIP. Adapter failure does not skip final checks or qualify success.
   Existing scope/frozen-source violations still block unsafe command execution.
5. Add bounded fresh-context review packets, explicit truncation, and paths to full
   source/evidence. No full-history reviewer fork, automatic reviewer, rubric score,
   or asserted review result is introduced.
6. Add call-aware forecasts, separate projection files, and overrun status derived
   from provider counters. Preserve the existing hard generation/token limits.
7. Add `recover` for original final-response accounting, separate subagent deltas,
   report/archive refresh, and retained rates. It performs no model call or tests.
   Repeated cumulative snapshots no longer inflate call counts. Forked origins
   require first cumulative usage to equal first-call usage. Unknown boundaries
   remain unknown, and missing request events prevent a complete call-count claim.

## Validation

All **201 tests pass**, including **14 new tests**. Tests use real local Git, Node,
TypeScript AST checks, and controlled model fixtures. A four-file fixture finishes
in two guarded write calls. Real CLI finalization runs its fixture gate once;
recovery updates the report without rerunning that gate. Regression against the
original Codex Task A logs returns **3,253,310 tokens, 41 distinct model calls**,
including both final responses and excluding follow-ups. One duplicate snapshot
is ignored without changing token totals. Resumed rollout filenames retain the
thread UUID rather than reporting their context-window suffix as the session ID.

Fixed Task A prompt/specification, independent endpoint oracle, planned files,
model settings, allowed/protected paths and all eight final gate commands are
unchanged. See `VALIDATION.json` and `TEST_RESULTS.log`.

No live model Task A trial or matched token/cost comparison was run. These tests
prove controller behavior and accounting, not a measured savings percentage.
