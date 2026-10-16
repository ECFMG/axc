# v7.12.03 controlled amendment

Revision: `controlled-quality-gated`. Initial .03 evidence is preserved in `parent-v7.12.03-initial/`; original v7.12.02 inputs and Task A results remain historical evidence.

1. Route primary and actual fresh-review generation through one locked, durable shared budget. Reserve before dispatch, retain all attempts, reconcile provider counters, and stop further dispatch on unknown usage or exhaustion. Complete final reporting is explicitly recorded as deterministic.
2. Record executed context, local repair, reviewer and budget controls. Finalization always runs all eight unchanged gates. Passing validators or reading the archive alone cannot establish controlled eligibility.
3. Start the reviewer with only the complete fixed task/specification, bounded current diff and current validation summary. Reject omitted/truncated coverage, stale source, malformed review, unresolved findings or missing evidence. Both actors keep unchanged model/generation limits.
4. Run every paired benchmark through prepare + finish --execute. Freeze task/model/settings/base/tools/validation/accounting and predeclare at least two repetitions. Balance order and preserve failed trials and their consumption.
5. Compare measured total tokens only after quality and accounting gates pass. Remove forecasts from comparison conditions and results. Report success rate, tokens per accepted task, cost and latency separately, with unknown values null.
6. Add tests for forecast invariance, cheap failing output, missing reviewer/final counters, retained failed attempts, shared-budget contention/exhaustion, actual workflow routing and fresh review. See `VALIDATION.json` for final counts and logs.

The fixed Task A prompt/specification, independent oracle, settings, planned files, allowed/protected paths, batching and eight final commands are unchanged. There are no new dependencies and no live Task A savings claim.

Native Codex remains an advisory external workflow: its host controls context and dispatch. It cannot qualify as controller-enforced merely by importing counters or producing review metadata.
