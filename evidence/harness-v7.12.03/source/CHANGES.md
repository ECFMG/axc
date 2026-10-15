# v7.12.03 changes

Parent: supplied v7.12.02. Original release metadata, task definition and validation evidence remain labeled in `parent-v7.12.02/`. The original published Task A evidence is unchanged.

## Implemented

1. Add `review-handoff.json` with native `spawn_agent` arguments explicitly requesting `fork_turns: "none"`. Preserve the complete fixed task/specification and bounded diff packet. Add compact validation summaries tied to the current file snapshot, a packet hash and explicit omitted-diff retrieval. No reviewer is invoked or claimed by generation of the handoff.
2. Expose native `repair --evidence PATH` using existing scoped format/API build/application-service tests and successful fingerprint-aware cache. Local results never establish completion. Changed source invalidates saved feedback; failures rerun. Every `finish` or `check` still runs all eight mandatory final gates.
3. Strengthen concurrent read-only readiness checks: exact repository pnpm pin and installed Turbo/Biome/tsgo execution, bounded timeouts, no-download controls and per-check remediation. Failed preflight now blocks native host packets and repair as well as adapter execution. No registry, install, permissions or source mutation is introduced.
4. Add deterministic `efficiency.json` to reports and a standalone `efficiency --usage FILE [--out FILE]` command. Separate primary/subagent volume and request metrics, preserve unknown counters, and withhold call averages when request histories are incomplete. No model invocation, inferred dollars, rubric score or savings claim is introduced.
5. Document selective skills, independent-read batching within existing guards, focused repair followed by full final validation, deterministic final-response recovery, and matched experimentation. Native host instructions, tools, history and context inheritance remain host-controlled.

## Verification

All **224 tests pass**, including **23 new tests**. Tests exercise read-only prerequisite failures, duplicate and incomplete usage records, live-final accounting gaps, source-fresh local feedback, guarded repair execution, fresh-context reviewer metadata, and all eight fixture gates rerunning on every explicit finalization. Existing controller, source-contract, API-oracle and accounting tests remain enabled.

The real `efficiency` CLI also reproduces the original Task A total of **2,975,364 recorded tokens** from disjoint main, reviewer and automatic-review turn deltas. Their final responses are included; later follow-ups are excluded. These are original-run observations, not a new feature implementation or a matched efficiency trial.

Fixed Task A prompt/specification, independent endpoint oracle, planned files, model/generation settings, allowed/protected paths and all eight final commands remain unchanged. No live model Task A rerun or measured savings percentage is claimed.
