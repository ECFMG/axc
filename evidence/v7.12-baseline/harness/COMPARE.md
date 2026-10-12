# Task A comparison protocol

The reference is **no harness**. v7 is the starting harness version. The four packages are cumulative, self-contained candidates. Never treat the inherited `--variant baseline` option as no harness: it means broad source context inside the adapter. The inherited coding_benchmark.py/coding_comparison.py are labeled legacy internal context comparisons; use run_task_a.py and compare_versions.py for the comparison requested here.

Freeze the repository commit, exact prompt and requirements, model identity/digest, tool versions, model settings, resource limits, and acceptance checks before evaluation. Use fresh isolated checkouts for every trial. Predeclare repetitions and balance execution order (for example, two repetitions per candidate with reversed order in the second block). Do not reuse already-completed feature work as a fresh implementation success. The shared no-harness records may be compared independently against each version.

All four candidates use the same settings: gemma4:26b, temperature 0, reasoning disabled (inherited v7), context limit 98,304, response limit 4,000 tokens, at most 20 generation calls, and a 300,000-token run ceiling. These are resource limits, not predicted usage. They differ from original v7's four calls / 12,288 output / 180,000 run ceiling to permit smaller actions. If you change any settings, declare and use the same new conditions for all compared trials, including no harness. More calls can increase repeated prompt overhead; measure total tokens, not call count alone.

Every package shares the exact same external final checks: original repository test/lint/build/typecheck/architecture commands, unchanged independent course oracle in both in-process and Azure HTTP modes, and the common submitted-test/documentation verifier. This last verifier is scoring infrastructure for every variant and no harness; only v7.13 also uses its results inside generation/repair. The common checker does not inject a solution into no-harness execution.

Prerequisites: Python 3.9+, the target repository's locked dependencies and runtimes (Node/pnpm, Azure Functions host and original test prerequisites), and a running local Ollama server with the configured model. v7.11+ use the repository's installed TypeScript parser. No new project dependencies are added. The inherited Ollama adapter requires verified local model identity, cold model unload, render-only preflight, and provider counters; unsupported provider behavior stops rather than fabricating usage. RUNTIME_SETUP.md preserves original setup context; machine-specific recorded paths there must be adapted.

The clean target repository must already contain task-set-a-requirements.md with the identical packaged bytes. Preparing a run rejects a mismatch. Do not copy new files into a frozen evaluation checkout after preparation. Keep the harness outside the target repository so its source is not model task context.

## Candidate trial

From the extracted package root:

    python3 -B run_task_a.py prepare --repo /path/to/fresh-axc-checkout --evidence /path/to/new-v7-trial --repetition 1
    python3 -B run_task_a.py execute --evidence /path/to/new-v7-trial
    python3 -B run_task_a.py check --evidence /path/to/new-v7-trial

The first command freezes this package and the exact task outside the checkout. The execution command changes only the isolated target checkout. Always run check even if execution exits unsuccessfully: failed attempts still belong in the comparison. Check writes comparison-record.json and detailed evidence. Rechecks create new validation directories. It does not commit or publish generated work.

## No-harness trial

    python3 -B run_task_a.py prepare --repo /path/to/separate-fresh-checkout --evidence /path/to/new-no-harness-trial --no-harness --repetition 1

Then run the exact packaged Task A prompt and referenced requirements through your ordinary agent without this package's instructions, plan, context selection or file-action adapter. The evaluation preparation does not run the coding adapter. Use the same underlying model and shared conditions where possible, and record actual provider calls including failures, retries and any inference used by the task. Respect the declared budgets. Do not substitute account usage percentages or token predictions for actual counters. Different underlying models or cache conditions cannot isolate the harness effect.

Provide the external provider ledger and score the resulting checkout:

    python3 -B run_task_a.py check --evidence /path/to/new-no-harness-trial --usage /path/to/external-provider-usage.json

Ledger format:

    {"complete": true, "calls": [{"source": "provider", "model": "EXACT_PROVIDER_MODEL_IDENTITY", "input_tokens": 123, "output_tokens": 45, "cached_tokens": 0, "cache_reset": {"verified_unloaded": true}}]}

Those numbers are format examples only. Replace them with real counters; do not use them as evidence. A cold-cache declaration requires actual unload verification for every call. If your ordinary agent cannot report these conditions, the comparator blocks the matched saving claim. Unknown usage can be recorded by omitting the --usage argument; it cannot qualify as savings. The external execution/conditions metadata is declared provenance, not authentication of provider logs or enforcement of an external agent's settings.

## Independent comparisons

    python3 -B compare_versions.py /path/no-harness-1/comparison-record.json /path/no-harness-2/comparison-record.json /path/v7.10-1/comparison-record.json /path/v7.10-2/comparison-record.json --repetitions 2 --out /path/v7.10-comparison.json

Repeat with v7.11, v7.12 and v7.13 records. You can also pass every version's records in one command: each is compared separately against no_harness. Matching conditions and all predeclared repetitions are required. Every compared trial must pass the same external checks and have complete measured usage to qualify. Failed calls and repairs remain counted. Reports distinguish raw consumption change from accepted savings. Local token counts do not establish dollar savings, Codex account-limit reductions or general performance.

## Verification status and practical limits

VALIDATION.json records offline regression results for this release. Tests include real Node test execution and installed TypeScript AST parsing, plus controlled provider simulations for failure/accounting paths. Live adapter contract checks passed on Ollama 0.40.0 with gemma4:26b after simplifying the native action schema to a flat required object. All four action modes were checked for each version; controller guards remain unchanged. Initial failed calls remain accounted for in OLLAMA_RETRY_ACCOUNTING.json. There are still no full live Task A model trials or proven token savings; the configured per-step budgets need end-to-end evaluation.

The file guards are not an OS sandbox. Use an isolated checkout and the normal repository controls. Execution evidence verifies discovered, passing, unskipped cases, not assertion quality or coverage by itself. The documentation gate checks required terms, not semantic completeness. The independent endpoint oracle and source review remain necessary. Only simple existing Vitest and Node test script shapes are supported by the submitted-test adapter; unsupported runners fail with explicit diagnostics. No dashboard, model judge, database service or new provider was introduced.
