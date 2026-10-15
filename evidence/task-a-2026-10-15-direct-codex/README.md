# Task A original run evidence

This directory preserves the October 15 direct Codex implementation, original validation results, finalized usage and separate projection. The original task used AXC base `fe47c38`. Statements in preserved original reports about uncommitted work describe task completion before the later publication request.

Start with [evaluation-run-record.md](evaluation-run-record.md), [report.txt](report.txt), [validation-results.json](validation-results.json) and [usage.json](usage.json). The original patch and source ZIP preserve the pre-publication implementation. The source ZIP omits dependencies and Git history.

`usage-snapshots.json` contains only token-counter events, with duplicates retained as source evidence. Never sum cumulative snapshots. Full conversation/session logs are not published. `recover_usage.py` is the original local recovery utility; it references the operator's local session logs and is not needed to consume the finalized JSON.

Publication uses a newer AXC base. See [publication validation](../publication-2026-10-15-df-oai-3-out/) for new-baseline results. Publication work is excluded from original usage.
