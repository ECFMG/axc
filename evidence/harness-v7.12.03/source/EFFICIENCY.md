# Token efficiency workflow

Reduce repeated context and avoidable model round trips while preserving the fixed Task A specification, write boundary, generation settings and all eight final validation gates. Changes here do not establish measured savings; verify those in matched trials.

## Before model work

Restore the repository's locked dependencies and activate its pinned package manager outside the harness. Run `prepare` once against a clean checkout at the declared base and branch. Preflight concurrently checks Node, exact pinned pnpm, Azure Functions, Java, TypeScript, Turbo, Biome, tsgo, direct dependency links and localhost binding. Version probes disable package-manager network downloads and automatic pin edits. A missing tool or denied localhost bind produces a specific remediation and blocks model work.

Readiness does not prove lockfile/install coherence. Final build and tests remain mandatory. Preflight never installs dependencies, grants permissions, rewrites the package manager, changes source or accesses a package registry. Use an explicitly activated pnpm binary if a launcher would otherwise download or switch versions.

## Keep the native host context narrow

Load the task, fixed requirements and `host-context.txt` in a fresh work context. Select only skills needed for the current task; avoid repeating full skill bodies or overlapping style guidance. Keep mandatory security, validation and repository instructions intact. The harness does not edit installed skills or host configuration.

Batch independent source inspections in one tool orchestration. Group related edits within the existing next-two-target guard; do not raise the batch limit or generation cap. Passing check summaries include exit codes and log paths; read bounded failure excerpts and retrieve additional log/source pages only when needed. The adapter already performs these actions; native hosts must follow the same practice.

The desktop host owns its injected instructions, tool catalog and conversation history. This harness cannot remove that overhead or force a native host to start with an empty history. Character caps bound file size and are not token measurements.

## Repair locally and preserve final validation

```sh
python3 -B run_task_a.py repair --evidence /path/to/run
python3 -B run_task_a.py host-context --evidence /path/to/run
```

`repair` reuses the existing formatter and focused API build/application-service tests. Successful build/unit results may be reused only for the same source fingerprint. Failed checks rerun. Fresh local feedback is available in the next host packet; changed files invalidate it. Commands and full logs stay in the evidence directory. Local success always reports `completion_established: false`.

After implementation, run `finish` once for the complete final suite. After a failed final suite, repair affected source, then run `finish` again. Every explicit `check` or `finish` executes all eight mandatory final gates; no final gate is removed or replaced by a local repair/cache result.

## Hand off review without full conversation history

```sh
python3 -B run_task_a.py review-packet --evidence /path/to/run
```

Use `review-handoff.json` as the native reviewer's spawn arguments. It explicitly requests `fork_turns: "none"` and points at a bounded packet containing the complete task and requirements, changed-file diffs, source paths and a validation summary. Keep independent review. The efficiency change is its input context, not its removal.

The packet hash identifies the handed-off content. Any truncated diff is flagged; retrieve omitted files before claiming complete review coverage. Saved validation is presented as passing only when its source snapshot matches the current change. Handoff generation sets `reviewer_executed: false`; it does not perform review or verify that the host obeyed the context request. Record each reviewer's original-turn usage separately.

## Generate evidence without model interpretation

`finish` generates the evaluation template, actual usage, separate projection, optional rate-based cost, efficiency metrics and review handoff. On the next user turn, use `recover` to include the original final response without counting the follow-up. Recovery refreshes reports without another model call or test run.

```sh
python3 -B run_task_a.py efficiency --usage /path/to/run/usage.json --out /path/to/efficiency.json
```

`efficiency.json` contains supplied token totals, request counts, mean input per model call, cached-input ratio and output-token ratio, separately for primary and subagents where attributed. Unknown counters remain null. Incomplete request histories never produce a complete call-count/average claim. Cached input is included in input; reasoning output is included in output. Token volume, cache discount and cost are different measures. Descriptive metrics never calculate a savings claim or invent billed dollars.

## Test the next efficiency hypothesis

For the next native-host experiment, keep repository base, model, reasoning, task/specification, validation and measurement scope fixed. Change only review-context handoff: compare full-history review with the fresh packet while keeping review requirements equal. Repeat paired trials and retain failures. Compare median recorded total/input/output tokens, request counts, known cache ratios, separately calculated cost, elapsed time and correctness. Do not infer reviewer savings from its share of one run's tokens, and do not claim a win if checks or review coverage regress.

The October 15 original run had 27 primary calls averaging 92,767 input tokens; the reviewer consumed 373,139 total tokens with inherited history. Those are baseline observations from that run, not a forecast or result for this release. API cost assumptions and desktop subscription billing remain separate. A new native-host or provider trial must record its own actual counters.
