# OpenAI harness v7.12.03

Reduce model round trips and reporting overhead while preserving the fixed Task A
prompt, specification, allowed/protected paths, model settings, and **all eight
mandatory final validation commands**. No new dependencies. No live savings claim.

## Changes

- **Native repair checkpoints.** `repair --evidence PATH` runs scoped, fingerprint-aware format/build/unit checks and writes bounded feedback for the next host packet. It never records final acceptance or skips any final gate.
- **Fresh review handoff.** `review-packet` also writes `review-handoff.json` with native `spawn_agent` arguments using `fork_turns: "none"`, a packet hash, explicit omitted-diff retrieval, and current-snapshot validation summaries. The host must honor the handoff; no reviewer is spawned automatically.
- **Deterministic efficiency reporting.** `finish`, `check`, `report` and `recover` write `efficiency.json` from recorded counters. The standalone `efficiency` command reads saved usage without a model call. Unknown counters and incomplete call accounting stay explicit.
- **Stronger readiness.** Preflight checks the exact pnpm pin and executable Turbo/Biome/tsgo tools with no-download controls and specific remediation. Failed readiness blocks native host packets and repair as well as adapter execution.

The following v7.12.02 behavior remains unchanged:

- **Guarded two-file actions.** The adapter exposes only the next two planned
  targets. Both writes pass path, dependency, script, source-contract and edit
  checks before either is applied. Legacy single-file actions remain valid. Both
  variants use the same batch policy and unchanged generation limits.
- **Focused, stateless context.** Related declarations are read together. Source
  inventory is retrieved in pages rather than repeated in every request. Pending
  plan descriptions are omitted when already present in the fixed specification;
  current guarded instructions remain. Full logs stay on disk with short summaries.
- **Focused repair, one full final pass.** Compilation and application-service
  tests still support local repairs, with existing fingerprint-aware reuse. The
  independent endpoint oracle now runs in the mandatory final suite rather than
  both the repair loop and the final suite. Every explicit `check` or `finish`
  runs all original final gates; no final gate is cached away by this controller.
- **One-command evidence.** `finish` runs final validation, creates the evaluation
  record, usage/projection/cost files, a review packet, and optionally an evidence
  ZIP. `--execute` runs the adapter first; final validation still runs if it fails.
- **Narrow reviewer handoff.** The bounded review packet includes the complete
  fixed task/specification, changed-file diffs, file paths and validation location.
  Truncation is explicit. Use a fresh reviewer context instead of forking chat
  history. The harness does not spawn a reviewer or claim a review was performed.
- **Call-aware forecasts and accounting.** Forecast cumulative tokens using
  expected calls × (input + output per call). An adapter usage status file flags
  projection overruns separately from its unchanged hard token ceiling. Codex
  imports ignore duplicate counter snapshots, handle forked counter origins only
  with evidence, retain separate subagent deltas, and recover final-response usage
  without rerunning tests or invoking a model.

## Native Codex / host workflow

Restore locked dependencies and install the existing Node, pnpm, Azure Functions,
Java and TypeScript prerequisites first. Use a clean isolated checkout already at
its declared base and branch. Harness commands do not install dependencies, access
a registry, change permissions, reset a checkout, create commits or push branches.
Preparation runs concurrent read-only runtime/dependency/localhost
preflight once; an unready environment blocks adapter execution and quality claims.

```sh
python3 -B run_task_a.py prepare \
  --repo /path/to/fresh-axc --base BASE_COMMIT --branch DESTINATION_BRANCH \
  --evidence /path/to/run --external --operator "Dane Fortun" \
  --expected-calls 15 --input-tokens-per-call 60000 --output-tokens-per-call 1000 \
  --projection-assumptions "Illustrative forecast; replace with observed context size and expected calls"
python3 -B run_task_a.py host-context --evidence /path/to/run
```

The example predicts **915,000 tokens**, not a measured target or saving. Use
observed input sizes and realistic call counts. [Efficiency recommendations](EFFICIENCY.md) explain selective skills, batching and bounded review. A fresh host context can use
`host-context.txt` and native editing tools. Rebuild that packet after a useful
batch or failed final validation instead of replaying the entire conversation.
Native-host forecasts describe host usage; adapter model settings and token limits
do not control the native host. The host controls its tool catalog, system instructions and history; the
harness cannot remove that fixed overhead. The packet is not an OS sandbox.

During implementation, use focused local checks after a useful batch or diagnostic repair:

```sh
python3 -B run_task_a.py repair --evidence /path/to/run
python3 -B run_task_a.py host-context --evidence /path/to/run
```

Local success is not final acceptance. After implementing the feature:

```sh
python3 -B run_task_a.py finish --evidence /path/to/run \
  --codex-log /path/to/original-session.jsonl --turn-id ORIGINAL_TURN_ID \
  --subagent /path/to/reviewer-session.jsonl REVIEWER_TURN_ID \
  --archive /path/to/run-evidence.zip
```

Omit `--subagent` when unused; repeat it for separate reviewer sessions. Omit Codex
flags for provider-ledger runs. Failed checks remain failures; repair the cause,
then explicitly run `finish` again. A live original response remains incomplete
until its final response counters and task completion are recorded.

On the next user message, recover **original** turn IDs before answering:

```sh
python3 -B run_task_a.py recover --evidence /path/to/run \
  --codex-log /path/to/original-session.jsonl --turn-id ORIGINAL_TURN_ID \
  --subagent /path/to/reviewer-session.jsonl REVIEWER_TURN_ID \
  --archive /path/to/run-evidence-final.zip
```

Recovery refreshes reports and optionally packages them. It performs no model call
or validation rerun and excludes every follow-up turn. Use a new archive path.
For resumed chats, choose the rollout containing the original turn ID; the filename
may include a context-window suffix. Counters remain unknown when their boundary is unavailable. Cached input is inside
input; reasoning output is inside output. Duplicate snapshots are not model calls.
Incomplete per-request events do not invalidate known cumulative token deltas,
but the importer does not then claim a complete model-call count.

## Supplied model adapter

Omit `--external` in preparation, then run `finish --execute --evidence /path/to/run`
with optional usage, rates and archive flags. This preserves the existing
`gemma4:26b` settings and verified cold-cache policy; no model was run as part of
this release validation. `--no-harness` remains a separate external control using
only its original prompt/specification; it cannot request harness host context or
execute the adapter. Do not conflate native Codex runs with matched Ollama trials.

The existing `execute`, `check`, `report`, `record-codex-usage`, `package` and
`preflight` commands remain available. `review-packet --evidence PATH --limit 40000`
creates a reviewer brief and `review-handoff.json` without invoking a model. Start a reviewer with the handoff's `fork_turns: "none"`; do not fork full chat history. Limits are characters for file
safety, not measured or projected token usage. Reports never assign rubric scores
or verified savings automatically.

## Optional calculated cost

Pass `--rates rates.json` to `finish` or `recover`. Recovery retains previously
recorded rates when omitted. See `rates.example.json`: prices are supplied per
million for `input`, `cached_input`, and `output`. The calculator requires explicit
`cache_writes_in_input_rate: true` and `long_context_adjustment_required: false`
for that simple pricing treatment. Unsupported pricing remains null; actual billed
charges are never inferred. Cache-write or long-context tiers require a separate
provider-specific calculation. Projections stay in `projection.json` and trial
metadata, separate from measured counters in `usage.json`.

## Verification and limitations

```sh
HARNESS_TEST_TYPESCRIPT=/absolute/path/to/typescript/lib/typescript.js \
  python3 -B -m unittest discover -v
```

Tests exercise guarded batched writes, unchanged legacy actions, focused repair
checks, frozen-controller tamper detection, final gates, real Git/Node fixtures,
CLI finalization/recovery, duplicate counters, subagents and bounded review packets.
Controlled fixtures are not a live Task A model trial. Repeat matched trials with
identical model/cache/validation conditions before claiming lower tokens, cost or
latency. See `VALIDATION.json`, `TEST_RESULTS.log` and `CHANGES.md`.

Historical release records remain labeled in `parent-v7.12.02/`, `parent-v7.12.01/` and `parent-v7.12/`.
Source/model logs may be present in evidence ZIPs. Packaging never publishes them.

## Inspect recorded efficiency

```sh
python3 -B run_task_a.py efficiency --usage /path/to/run/usage.json --out /path/to/efficiency.json
```

This reads measured usage only. Primary and subagent volumes remain separate; cache ratio does not imply fewer input tokens, and descriptive ratios do not establish cost or savings. Call-count averages stay null when request accounting is incomplete. See [EFFICIENCY.md](EFFICIENCY.md) for the next matched experiment and host limitations.
