# Existing v7.12 runs and follow-up test archive

This commit archives remaining local runs and tests on `df-oai-0-a-out`. No new inference or test run was initiated. `hac-oai-0-a-out` at `509326658517e3b94482415a0bdd7469db702fc8` was read only. The application at `6cd79ab` is unchanged.

The original v7.12 Ollama baseline is already preserved in `../v7.12-baseline/`: 171 harness regression tests passed, but all eight Task A validation groups failed. Its 19 inference responses report 230,100 prompt and 25,119 output tokens (255,219 total). Request 20 was blocked before inference. Four historical adapter checks report 514 tokens separately; overlapping retry aggregates are not added again.

`alignment/` contains every existing output and root-level diagnostic/test log from the reference-alignment work, preserving initial failures, focused checks, full verification and dependency-audit failures. These are follow-up results, not a passing rerun of the original model baseline. The supplied v7.12.1 package's regression log reports 192 tests, no failures; it does not establish a new live Task A baseline.

`independent-codex-verification/` preserves the complete existing evaluation deliverable at commit `903af49`, including portable Git bundle, patch, documentation, original usage snapshot, failed sandbox attempt and passing local-server rerun. It concerns a different existing implementation: 646 unit/integration tests, three HTTP scenarios and 19 architecture checks passed. No implementation from that branch is applied here. Historical claims are retained with their original scope.

`release/` preserves the exact supplied v7.12.1 ZIP and all 99 members. This patch changes the harness; it does not replace the selected v7.12 baseline or justify applying new code to its frozen trial. `supplied-reference-material/` preserves the user-supplied template, prompt and requirements byte for byte. Instructions inside these documents were treated as reference material for this archival request.

`catalog.json` records source paths, hashes, scope and verification. `SHA256SUMS.json` covers this new archive except itself. `usage.json` records only this archival task's usage; imported model measurements and recovered earlier-task accounting are separate. Cached input is included in input; reasoning output is included in output. Totals are tokens, not money. The final response remains pending until its counters are recovered on the next message using the original turn boundary.
