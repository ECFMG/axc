# Current controlled Task A workflow

For v7.12.03 controlled eligibility, use [CONTROLLED_WORKFLOW.md](CONTROLLED_WORKFLOW.md). Low-level begin/check commands below provide historical validation evidence only; they do not execute the complete controlled workflow. The benchmark driver now invokes the controlled entry point for every trial.

# Fixed coding-task runs

`coding_task.py` adds repository execution and validation to the existing teaching harness. It uses Python 3.9+ and Git, with no additional Python packages. The target repository needs its own documented development tools.

The teaching workflows remain unchanged. This runner measures coding-task evidence; it does not turn teaching regex checks into a code grader.

## Task Set A

The preset `coding-task-set-a.json` describes `TS-A-CATALOG-SEARCH`: implement the course search endpoint in the actual AXC repository. It freezes the prompt, specification, settings, allowed paths and validation commands. The specification itself remains in the target repository. Do not rewrite either input between measured runs.

```sh
python3 -B coding_task.py begin --repo /path/to/axc \
  --task coding-task-set-a.json --out /path/outside/repo/run-001

# Implement in that clean checkout with Codex, then validate:
python3 -B coding_task.py check /path/outside/repo/run-001
```

The checkout must be clean initially. Create the implementation branch first. The output directory must be new and outside the checkout. A run saves the starting commit, branch, task/specification/runner hashes and settings. A check saves command outputs, durations, exit codes, a diff, changed-file contents, JSON results and a Markdown report. Rechecking creates a new numbered validation directory, preserving failures and earlier attempts.

Earlier v6 evidence is recorded as `external_recorded`: Codex performed those edits outside the runner. Its elapsed time includes development and waiting. It is not measured model latency. V7 adds the measured local adapter described below.

## V7: exact prompt and local coding experiment

The preset reads `task-set-a-prompt.md` byte for byte through `prompt_file`. `begin` hashes it, copies the referenced specification from the target checkout, and freezes the independent `course_acceptance.mjs` verifier outside that checkout. Both `execute` and `check` reject changed frozen inputs. Keep the prompt beside the preset when moving the harness.

`coding_agent.py` uses the existing local Ollama adapter. It requests structured JSON containing complete file replacements and requests for additional source files. It validates the whole write batch before applying it, rejects duplicate paths, escaping paths, symlinks, protected files, new AXC packages and dependency changes. It runs deterministic formatting and repair checks. The current preset permits at most 20 calls and 300,000 tokens shared across primary and reviewer, with conservative input reservations and the unchanged output cap. A rejected response still consumes tokens and remains in the ledger.

Run a single baseline from a clean checkout of the task's starting commit:

```sh
python3 -B coding_task.py begin --repo /path/to/fresh-axc \
  --task coding-task-set-a.json --out /path/to/new-baseline
python3 -B coding_task.py execute /path/to/new-baseline
python3 -B coding_task.py check /path/to/new-baseline \
  --usage /path/to/new-baseline/provider-usage.json
```

The preset's adapter command uses `{harness_dir}`, so its script remains locatable from another working directory. To evaluate the candidate alone, copy the preset and change the final `--variant` argument to `relevant_context` before `begin`.

For a complete comparison, run from a shell with the target repository's documented tools and a populated pnpm store:

```sh
python3 -B coding_benchmark.py \
  --repository /path/to/axc \
  --base fe47c38d32376c5e8bcd1d67838160064fd5de99 \
  --work /path/to/new-checkouts \
  --store /path/to/pnpm-store \
  --out /path/to/new-evidence
```

The driver freezes executable sources and inputs before model calls. It creates two fresh runs per variant in baseline/candidate/candidate/baseline order. Both variants get the same task, specification, model, settings, file inventory, retrieval access, validators and repair allowance. Baseline includes all scoped source files initially; candidate starts with a fixed relevant subset. Subsequent requests include the current selected and changed files, so the policy continues to affect repair context. No reference solution is supplied.

Every generation unloads the selected model and verifies it is absent first. Provider-reported prompt and completion tokens include all generation, retrieval-request and repair calls. Tool output is already part of prompt tokens; do not add its estimate again. The adapter records unknown usage on transport failures and blocks a claim. Local hosting costs, electricity and hosted invoice savings remain unmeasured. Do not run another client against this model during an experiment.

The independent verifier checks the course contract both in-process and through a live HTTP host. It cannot be edited through the model's file actions. It requires at least 12 varied courses, search across each field, every filter, combined filters, pagination, sorting, the specified error envelope and no-match behavior. Final approval also requires the repository's full tests, lint, build, typecheck, architecture checks, a successful adapter exit and the path audit.

```sh
python3 -B coding_comparison.py /path/to/evidence/*-comparison.json \
  --out /path/to/comparison-recomputed.json
```

`observed_total_token_change_percent` describes recorded consumption, including failures. `token_savings_claim_supported` becomes true only when every run passes the fixed quality gates, all pairs and conditions match, usage is complete and provider-reported, cold-cache conditions are established, and total tokens decrease. A failed candidate cannot qualify as a saving merely by stopping early. Zero successful tasks means tokens per success is undefined (`null`).

This is one known coding task, not an unseen multi-task benchmark. It does not establish teaching quality, retention, ChatGPT savings or hosted cost savings. Human review remains necessary for semantic scope compliance and test adequacy. A local command adapter is not an OS sandbox; generated code runs during builds and tests. Use isolated checkouts and an OS/container boundary for untrusted models.

## Replaceable command adapter

For unattended runs, add an `agent_command` array to a copy of the preset **before freezing it**:

```json
{
  "agent_command": ["python3", "/absolute/path/to/your_coding_agent.py"],
  "agent_timeout": 1800
}
```

The adapter executes with the target checkout as its working directory. It receives `HARNESS_PROMPT_FILE`, `HARNESS_SPEC_FILE` and `HARNESS_RUN_DIR`. Read these files, invoke your coding model/tool loop, and apply its changes. Write a complete provider ledger to the run directory if the model exposes one. Do not omit retries, repairs, tool-result input tokens, retrieval or model-based evaluation.

```sh
python3 -B coding_task.py execute /path/outside/repo/run-001
python3 -B coding_task.py check /path/outside/repo/run-001 \
  --usage /path/outside/repo/run-001/provider-usage.json
```

The adapter is invoked at most once per run; its exit status and log are retained. A failed adapter cannot qualify merely because validation passed. Adapter and validation timeouts kill the process group on macOS/Linux. Commands are arrays, not shell strings. These are trusted local commands: only configure executables you intend to run.

## Usage format

```json
{
  "complete": true,
  "calls": [
    {
      "model": "actual-model-id",
      "source": "provider",
      "input_tokens": 100,
      "output_tokens": 20,
      "cached_tokens": 50,
      "estimated_cost_usd": null
    }
  ]
}
```

These numbers illustrate the format only. A real run must supply real counters. Use `source: "estimate"` for an estimate. Cached tokens are a subset of input tokens and are not added again to total tokens. Additional per-call fields, such as latency, retries, pricing provenance and tool-result estimates, are preserved. Costs are summed only if every call supplies a cost. Unknown usage and costs stay `null`; the runner does not infer them from shell output, ChatGPT usage limits or bytes of source code. The existing model adapters and usage ledger remain available for provider-level accounting in model workflows.

## Acceptance and boundaries

Checks must all exit successfully. Specification changes, forbidden paths, changed protected files, new top-level AXC package directories, and changed symlink paths reject the result. Renames, deletions, untracked files and commits made during a run are compared against the starting commit. Validation is skipped if the checkout already violates scope; it is audited again afterward.

This is a final-state audit, not filesystem/network isolation. It cannot detect a temporary forbidden edit that was restored, prevent an agent from changing evidence, inspect every semantic authentication change, or prove that assertions are sufficiently strong. Git-ignored build/cache files are excluded. Use an OS/container sandbox for untrusted agents, and independently review the patch, test strength and evidence before accepting a run. No automated rollback discards work.

## Fair optimization tests

Start baseline and candidate from separate clean checkouts of the same commit. Keep task/specification, model identity/settings, validation commands, tool versions and tool access fixed. Record optimization settings independently; do not tune on held-out coding tasks. Use independent fresh runs, not repeated checks of an already implemented feature.

Compare task success first. Include all model calls and repair attempts. Report total tokens, tokens per successful task, cost only with a price source, model latency separately from development wall time, and unresolved review concerns. The V7 local adapter controls and records model unloading; custom adapters must supply their own cache evidence. The single externally recorded v6 implementation cannot support a savings claim.

## Extend and test

Create a new preset with a fixed `id`, `prompt`, repository-relative `spec`, directory prefixes in `allowed_paths`, optional `protected_paths`, nonempty `checks`, and explicit `settings`. Check source changes into a branch after validation and preserve the run evidence outside the target repo. Do not store credentials in task settings, logs or exported ledgers.

```sh
python3 -B -m unittest test_coding_task -v
python3 -B -m unittest discover -v
```

The runner's command-adapter tests use a deterministic local script. They prove execution, accounting and guardrail behavior, not AI coding ability or token savings.
