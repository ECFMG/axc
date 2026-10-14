# Changes in v7.12

This iteration adds the following to v7.11:

- Recomputes source context per target instead of accumulating all changed/requested files.
- Source is rendered as readable text; repeated and successful diagnostic logs are omitted from requests.
- Outstanding validation remains visible after reads, rejected actions and truncated generation.
- Explicit reads/log pages last one request; original sources and logs remain retrievable, including beyond 50,000 characters.

Included earlier iterations: v7.10, v7.11.

Common release infrastructure in every package: source-integrity freezing, the same external acceptance evaluator, separate no-harness preparation, complete provider-ledger comparisons (including reported counters on failed responses), and the shared 20-call / 4,000-output / 300,000-run-token settings. These shared changes are not attributed to an individual later iteration. No task prompt, requirements or original endpoint oracle was changed.

Live compatibility correction shared by all four packages: use a flat required action object in the native schema. The controller retains write/edit exclusivity and atomic patch checks. Four live action contract checks passed per package on Ollama 0.40.0.
