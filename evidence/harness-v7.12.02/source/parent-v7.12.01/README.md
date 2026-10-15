# OpenAI harness v7.12.01

A cumulative update of the supplied **v7.12** package. It implements the six requested efficiency improvements without changing the fixed Task A documents, independent course oracle, model settings, allowed write paths, or mandatory final validation commands. No new dependencies. No live model savings or rubric score is claimed.

## What changed

1. **Explicit identity:** preparation requires `--repo`, `--base`, and `--branch`. They must match the checkout. The branch is the intended destination; no automatic reset, checkout, commit, or push occurs. Branch drift blocks execution and final success.
2. **Focused context:** guarded target, relevant contracts, applicable tracked `AGENTS.md`, and explicitly requested files. Unknown repairs no longer load the entire inventory. Evidence archives and skill catalogs are excluded from source discovery; source excerpts are bounded with exact paged retrieval. The harness sends no desktop plugin catalog to its model. Host-agent system context is outside its control.
3. **Short tool summaries:** complete logs stay on disk. Model requests contain command status, provenance, and bounded failure diagnostics. CLI preparation/check drivers also save full output rather than printing it repeatedly.
4. **Batched inspection:** independent environment probes and selected file reads run concurrently. The action schema already supports up to five read paths in one request; the model instructions now recommend using that batch.
5. **Environment readiness and affected checks:** read-only preflight verifies runtimes, direct installed dependency links, TypeScript, and localhost permission. It performs no install, external API call, or permissions change. Local repair build/oracle/test stages wait for planned files to be written. Successful local checks can be reused while their code/config/verification fingerprints remain unchanged; failures rerun. Every final `check` executes every original gate, independent of this cache.
6. **Automated evidence/accounting:** generate the supplied Evaluation Run Record template, measured usage, separate projected estimates, optional rate-based cost estimate, checksums, and an evidence ZIP. Codex JSONL import subtracts original-turn cumulative counters, includes its final response when available, and excludes follow-up turns. Missing counters remain unknown.

## Prepare the environment

Use an isolated checkout with the desired branch already created at the declared base. Install the repository's locked dependencies and required Node, pnpm, Azure Functions Core Tools, Java, and TypeScript beforehand. When the pnpm cache is populated, `pnpm install --offline --frozen-lockfile --ignore-scripts` can restore locked dependencies; projects requiring install scripts must follow their own setup instructions. Preflight reports missing prerequisites without attempting downloads or changing security settings.

```sh
python3 -B run_task_a.py preflight \
  --repo /path/to/fresh-axc --base BASE_COMMIT --branch DESTINATION_BRANCH \
  --evidence /path/to/new-readiness-report
```

The report is readiness evidence, not a substitute for a build or tests. Use a localhost-capable isolated execution environment for HTTP validation. Keep the harness outside the application checkout. The identical Task A requirements must already be present in that checkout.

## Run Task A

```sh
python3 -B run_task_a.py prepare \
  --repo /path/to/fresh-axc --base BASE_COMMIT --branch DESTINATION_BRANCH \
  --evidence /path/to/new-run --operator "Your name" \
  --projected-tokens 250000 --projection-assumptions "Single agent; declared model and fixed validation suite"
python3 -B run_task_a.py execute --evidence /path/to/new-run
python3 -B run_task_a.py check --evidence /path/to/new-run
python3 -B run_task_a.py package --evidence /path/to/new-run --out /path/to/new-run-evidence.zip
```

`250000` is an illustrative projection, not a measurement or newly demonstrated target. Preserve all failed generations and retries. Always run final `check` even when execution fails. It automatically fills the evaluation record and writes `usage.json` and `cost-estimate.json`. Missing provider counters do not suppress validation and cannot qualify a savings claim.

For a no-harness control, add `--no-harness` to preparation, then use the exact fixed prompt/specification externally. Do not use this package's context instructions or model adapter for that control. `--allow-unready-environment` permits evidence preparation only: adapter execution and matched quality claims stay blocked. Fix the environment and prepare a fresh ready run for actual evaluation.

## Codex actual usage and final-response recovery

```sh
python3 -B run_task_a.py record-codex-usage \
  --log /path/to/original-session.jsonl --turn-id ORIGINAL_TURN_ID \
  --out /path/to/codex-usage.json
python3 -B run_task_a.py check --evidence /path/to/new-run \
  --codex-log /path/to/original-session.jsonl --turn-id ORIGINAL_TURN_ID
```

A live original response stays incomplete until its final message is followed by a cumulative token event and task completion. On the next user message, rerun `record-codex-usage` with the **original** log and turn ID before answering. Rebuild the report without rerunning tests:

```sh
python3 -B run_task_a.py report --evidence /path/to/new-run --usage /path/to/codex-usage.json
```

Pre-task baseline comes from the last earlier cumulative snapshot. A zero session-origin baseline is established only when the first scoped cumulative event equals its first-call usage. Otherwise the baseline and affected counters are unknown. Supply each subagent's own log and turn separately if used; the report scope must identify those additional records. The supplied adapter does not spawn subagents. Codex imports are separate from the cold-cache Ollama comparison ledger; they do not establish identical cache/model conditions.

## Optional calculated cost

Pass `--rates /path/to/rates.json` to `check` or `report`. Supply prices per million for `input`, `cached_input`, and `output`. Also declare `cache_writes_in_input_rate: true` and `long_context_adjustment_required: false` only if those treatments are correct for the measured run. Without complete required counters and explicit pricing treatment, the cost remains null. Special cache-write or long-context tiers need a provider-specific calculator; they are never silently assumed to be free. Example schema is in `rates.example.json`; its null prices deliberately cannot produce a dollar estimate.

Input includes cached input; output includes reasoning output. The calculator subtracts cached input before applying the uncached rate. Dollar estimates are never labeled measured invoices. `usage.json` describes original-task scope, timestamps, completeness, and missing fields. Projections remain in `trial.json`, separate from measured usage.

## Verification

```sh
# Set to the resolved module FILE, e.g. node -p "require.resolve('typescript')"
HARNESS_TEST_TYPESCRIPT=/path/to/typescript/lib/typescript.js python3 -B -m unittest discover -v
```

See `VALIDATION.json`, `TEST_RESULTS.log`, and `CHANGES.md`. New tests cover identity drift, preflight failures, bounded retrieval, summaries, deferred/invalidation-aware repair checks, mandatory final reruns, Codex final/follow-up boundaries, unknown counters, cost arithmetic, and report/archive integrity. Tests use real local Git and Node plus controlled provider fixtures. Full live Task A model comparisons have **not** been run for v7.12.01. Repeat matched baseline/candidate trials with the same task, model, environment, cache policy, and final gates before claiming savings or assigning an efficiency score.

Historical v7.12 validation and live-adapter evidence remains labeled in `parent-v7.12/`. Teaching modules and their historical documentation are unchanged. `COMPARE.md` describes the inherited comparison protocol with the updated preparation flags. Archive contents can include source and model logs: review them before sharing; this command does not publish anything.
