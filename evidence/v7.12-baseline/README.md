# v7.12 baseline run and test evidence

This bundle preserves the completed baseline Task A attempt, including failures, on `df-oai-0-a-out`. The read-only `hac-oai-0-a-out` reference supplied the Evaluation Run Record format only. Its implementation and measurements were not imported.

Read `summary.json` and `evaluation-records/task-a-baseline.md` for results. `task-a/` contains exact frozen inputs and execution sources, all model requests/responses, per-call provider counters, rejected attempts, repair logs, independent validation, generated-file snapshots, and the comparison record. The application files in the commit are the model's measured output; no manual repair was applied.

`harness/` contains the complete v7.12 harness, regression tests, original release checks and checksum manifest. The exact release ZIP is also preserved. All three regression rerun logs are included: an initially skipped run, a failed environment-dependent run, and the final 171-pass run. Dependency install and audit output and supplemental checks are preserved separately. Passing harness tests do not establish successful Task A delivery.

Historical adapter contract checks used 514 recorded Ollama tokens across four calls. The shared 20-call retry-accounting aggregate spans release checks and overlaps these calls; it is not an additional v7.12 total. Preflight byte estimates are estimates and are excluded from recorded totals. Original source evidence is retained without rewriting its historical claims.

`usage.json` records this coordinating commit task's Codex counters, scope and pending final-response accounting. The previously initiated baseline's Ollama counters are separate imported evidence, not new inference calls by this chat. Cached input and reasoning output are subsets and must not be added twice. Token totals are not monetary costs.

`SHA256SUMS.json` covers the evidence files except itself. Regenerate that manifest whenever updating the pending usage record. Use the original task/turn boundary to recover final Codex counters on a later message without including the later turn's usage.

The final baseline failed all eight validation groups. The pre-commit hook is bypassed to preserve exact generated files and original evidence; its mutating formatter would alter the measured attempt. Required validation was recorded before adding evidence and the Evaluation Run Record. Request 20 was prepared but rejected by the budget before inference, so its absent response is not an unmeasured inference call. Snyk was skipped because its required token was unavailable.
