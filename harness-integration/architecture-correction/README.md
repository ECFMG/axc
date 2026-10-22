# Cellix-alignment correction

The root instructions and native harness skill now mandate source-level Cellix mapping and alignment review. A Cellix architecture skill and reference map are adapted from dn-oai-8 (commit recorded with the skill) and verified against upstream Cellix commit 0dda578701214d524dd961849c9ae3e39f882834.

`configuration.patch` shows the operative instruction changes. Both skills pass the official validator; all 43 reference anchors exist. A fresh read-only Codex probe loaded the root instructions and both skills, inspected actual Cellix source, and rejected a prior simplified enrollment implementation for missing domain/persistence ownership and contracts. `probe-findings.md` records the verdict. `agent-review-transcript.jsonl` keeps actual loading output and source-read command evidence; large reference outputs are replaced by byte counts and hashes. The full local transcript is retained in the task workspace. `probe-usage.json` measures only that probe, including its final response.

The probe specimen was the earlier implementation available in this chat workspace. It was not the inaccessible /Volumes/files/src/axc working tree shown in the screenshot. That local source was not overwritten and is not claimed refactored. No application feature, original task specification, vendored Cellix package or archived harness source changed. The branch remains a harness-only baseline.

The original historical Task A preset directs model and fixture code into application services; it is now explicitly excluded as the default Cellix feature implementation profile. Native runs follow the active repository skills. A separate controlled Cellix preset is not claimed.

The review also identified the fixed task's directory/lockfile boundary conflict. Future runs must resolve that scope explicitly before creating the required Cellix directories/dependency edges, rather than silently flattening layers. This correction demonstrates instruction loading and one meaningful rejection behavior, not a completed Task B implementation, complete architecture enforcement, independent human approval or efficiency improvement.
