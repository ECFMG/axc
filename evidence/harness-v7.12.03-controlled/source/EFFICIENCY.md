# Measured token efficiency

Use [CONTROLLED_WORKFLOW.md](CONTROLLED_WORKFLOW.md) for the enforced v7.12.03 protocol.

The objective is measured total token reduction against a frozen measured baseline:

`reduction = 100 × (baseline tokens − candidate tokens) / baseline tokens`

Quality is an eligibility gate. Every predeclared paired trial must pass all eight fixed final commands, scope/specification/branch audits and fresh review. Every primary/reviewer/final response must be accounted for within the same budget. A failed or incomplete run cannot claim savings, even if it consumes fewer tokens. Its consumption remains in the statistics.

Relevant files, paged inventory, bounded diagnostics, batched independent reads and fresh review requests reduce repeated context automatically in the adapter. Local repair checks reuse only unchanged successful results; final gates always run. Reporting and accounting use scripts, so the controlled final report adds no model call. Any external model reporting falls outside this controlled protocol and cannot be silently treated as zero.

Forecasts remain in `projection.json` for planning. They never determine efficiency, eligibility or a rubric score. Increasing a forecast from one million to ten million tokens does not improve the measured result.

Reports separate total/input/output/cached/reasoning tokens, tokens per accepted task, success rate, cost and time. Cached input is already included in input; reasoning output is already included in output. Unknown counters stay null and prevent a complete accounting claim. Costs require explicit rate provenance; model latency is not full development wall time.

Native host guidance and reviewer handoff files are advisory. They cannot establish that the host exercised the controller's controls. Native JSONL accounting can be recovered through the original turn, including its final response, without counting a later follow-up or invoking another model.

No live measured token reduction is established by this release. Tests demonstrate enforcement and accounting behavior, not model coding quality or production savings.
