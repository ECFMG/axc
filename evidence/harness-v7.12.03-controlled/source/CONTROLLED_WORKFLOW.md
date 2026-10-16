# Controlled v7.12.03 workflow

The amended objective is **measured token reduction subject to complete quality and
accounting eligibility**. A smaller prompt or a forecast is not a savings result.
No live Task A token or cost savings have been established for this revision.

## Controls that actually execute

The version adapter dispatches primary implementation and fresh reviewer requests
through one durable `shared-budget.json` ledger. Both actors share the same token
and call limits. Reservations precede dispatch; measured usage settles them.
Failed, rejected, truncated and retry responses remain in consumption. Unknown
provider usage, unsettled reservations or exhausted limits block eligibility;
unknown usage also blocks further model dispatch.

Context limits and focused repair checks produce execution receipts. After all
final validation passes, a fresh reviewer receives the complete fixed task,
specification, change and validation evidence, without inherited conversation.
Its structured response must report complete scope, no findings and no missing
evidence. A truncated packet or response cannot pass. Review evidence must match
the current source files. The script produces the final report deterministically;
the reporting actor closes with zero model tokens and no extra narrative model call.

These controls apply to the version adapter. Native Codex `--external` mode can
provide context, checks and usage evidence, but its controls remain advisory: the
harness cannot impose a hard model token/call cap on the native host or establish
the same controlled actor boundary. External runs are ineligible for controlled
savings claims. `--no-harness` is a separate external mode.

## Fixed settings and quality gates

Task A keeps `gemma4:26b`, temperature `0`, context `98304`, maximum output `4000`,
maximum calls `20`, shared token budget `300000`, and request timeout `900` seconds.
The cache policy requires verified model unload before every generation. This is
a local model experiment; hosted cost is unmeasured. The task, allowed/protected
paths, requirements, acceptance evidence and these eight final gates stay fixed:

1. `pnpm test --env-mode=loose`
2. `pnpm run lint`
3. `pnpm run build --env-mode=loose`
4. `pnpm run typecheck --env-mode=loose`
5. `pnpm run test:arch --env-mode=loose`
6. `node {verification_dir}/course_acceptance.mjs`
7. `node {verification_dir}/course_acceptance.mjs --host`
8. `python3 {verification_dir}/task_a_gates.py --repo . --base {base_commit} --out {validation_dir}/submitted`

All eight must pass, with passing scope, unchanged specification and declared
branch, complete fresh review, executed control receipts and reconciled accounting.
Passing commands alone do not establish assertion adequacy or independent review.

## Run a controlled trial

From this harness directory, use a clean isolated checkout containing the packaged
Task A requirements and a fresh evidence directory outside that checkout:

```sh
python3 -B run_task_a.py prepare --repo /path/to/clean-checkout \
  --base FIXED_COMMIT --branch harness/trial \
  --evidence /path/to/new-evidence --context-variant relevant_context \
  --repetition 1 --expected-repetitions 2
python3 -B run_task_a.py finish --execute --evidence /path/to/new-evidence
```

Preparation freezes the protocol and sources and checks the environment. Finalization
executes implementation, repairs, final gates, fresh review and deterministic
reporting. Keep the entire evidence directory, including unsuccessful attempts.

For the paired experiment, restore dependencies from an existing offline package
store and predeclare at least two repetitions:

```sh
python3 -B coding_benchmark.py --repository /path/to/source-repository \
  --base FIXED_COMMIT --work /path/to/new-checkouts \
  --out /path/to/new-benchmark-evidence --store /path/to/pnpm-store \
  --repetitions 2
```

The runner alternates pair order and invokes `finish --execute` for both variants.
Here `baseline` means the harness's broad-context internal baseline; the candidate
is `relevant_context`. This does not measure a no-harness or cross-model comparison.

## Evidence and claim rule

Predeclare the base, task/prompt/specification, model identity, settings, tool
versions, verifier and controller hashes, accounting scope and repetition count.
Hold them fixed across all pairs. Preserve failures, retries and rejected work;
do not select only successful trials or change conditions after observing results.
Forecast/projection annotations never enter the comparison score.

Count measured provider input plus output tokens once. Cached input is a subset of
input and reasoning tokens are a subset of output; do not add either again. Retain
unknown metrics as `null`, including unavailable latency, cost or usage values.
Savings require complete predeclared pairs, every run passing the full quality
gate, cold-cache evidence and complete accounting for every actor. Only then can
`100 * (baseline_total - candidate_total) / baseline_total > 0` support a claim.
Any observed reduction without eligibility remains unaccepted evidence.

Validation commands and actual test results will be recorded in `VALIDATION.json`.
This guide does not assert an unrecorded test count or a live savings outcome.
