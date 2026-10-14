# v7.12.1 fixes

Corrected the reference-aligned architecture plan and additive workspace dependency policy; prioritized diagnosed repairs; delayed full builds until implementation wiring exists; used complete-file actions for planned targets; rejected labeled lexical declarations; added a snapshot-checked baseline commit command, explicit failed-baseline preservation, repository check logs, one-commit hook bypass and no automatic push. Recorded tool versions now run in the target checkout. Comparison labels accept patch versions. The allowed call ceiling is 40; the 300,000-token ceiling is unchanged.

Original task prompt, requirements and independent acceptance oracle are unchanged. Added regression tests execute real Git commits and test failure preservation, stale validation, scope/specification protection, branch changes, hook mutation prevention, Git line-ending filters, workspace dependency limits and frozen CLI integration. Historical v7.12 release metadata is retained separately. No new live model results are asserted.

# Changes in v7.12

This iteration adds the following to v7.11:

- Recomputes source context per target instead of accumulating all changed/requested files.
- Source is rendered as readable text; repeated and successful diagnostic logs are omitted from requests.
- Outstanding validation remains visible after reads, rejected actions and truncated generation.
- Explicit reads/log pages last one request; original sources and logs remain retrievable, including beyond 50,000 characters.

Included earlier iterations: v7.10, v7.11.

Common release infrastructure in every package: source-integrity freezing, the same external acceptance evaluator, separate no-harness preparation, complete provider-ledger comparisons (including reported counters on failed responses), and the shared 20-call / 4,000-output / 300,000-run-token settings. These shared changes are not attributed to an individual later iteration. No task prompt, requirements or original endpoint oracle was changed.

Live compatibility correction shared by all four packages: use a flat required action object in the native schema. The controller retains write/edit exclusivity and atomic patch checks. Four live action contract checks passed per package on Ollama 0.40.0.
