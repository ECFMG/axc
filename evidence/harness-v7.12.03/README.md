# Harness efficiency release v7.12.03

This follow-up implements the efficiency recommendations after the original Task A run. It preserves the supplied v7.12.02 archive and all original Task A measurements. The [new archive](openai-harness-v7.12.03.zip) and [source](source/) include:

- Explicit fresh-context reviewer handoff using `fork_turns: "none"`, complete fixed inputs, current-snapshot validation summary, packet hash and explicit omitted-diff retrieval.
- Native `repair` checkpoints using existing scoped/fingerprint-aware local checks. Local success never establishes final acceptance; all eight final gates remain mandatory.
- Stronger read-only preflight for pinned pnpm and executable Turbo/Biome/tsgo, with no-download controls and actionable remediation. Unready environments block native host packets and repair.
- Deterministic efficiency metrics and CLI, keeping primary/subagents separate, unknown usage explicit, and token volume distinct from pricing.
- [Host workflow recommendations](source/EFFICIENCY.md) for selective skills, batched inspection, focused repair, final-response recovery and matched experiments.

All **224 tests pass**, including **23 new tests**. A second 23-test check passes from the delivered standalone source directory. Fresh-context code review reports no issues. The real CLI reproduces the original Task A total of 2,975,364 tokens; it does not reinterpret later work as part of that run.

See [release validation](source/VALIDATION.json), [full test log](source/TEST_RESULTS.log), [packaged-source test log](packaged-tests.log) and [changes](source/CHANGES.md). Release-history metadata is labeled under parent version directories.

No live model Task A rerun or matched savings comparison was performed. This release does not establish a lower token count, new cost or new rubric score. Native host tool/system context and context inheritance remain host-controlled. Original Task A usage, cost and rubric remain unchanged; development usage is recorded separately and stays incomplete while this follow-up's final response is pending.

[Development usage](development-usage.json) is separate from Task A: its projection is retained even when exceeded. Counters are recorded through the timestamp in that file; this follow-up's final-response usage remains pending. The local recovery utility is [preserved as evidence](recover-development-usage.py) and references the operator's local source logs.
