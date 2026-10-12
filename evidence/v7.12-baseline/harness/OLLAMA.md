# Measure a local model with Ollama

The harness now supports Ollama in both `workflow.py` and the teaching runner, `harness.py`. It uses Python's standard library and the local server at `http://127.0.0.1:11434`. It does not install Ollama, download models, read API keys, or call a cloud model.

See [OLLAMA_RESULTS.md](OLLAMA_RESULTS.md) for the completed local smoke checks: real usage was measured, but the workflow task failed strict JSON formatting and the teaching result still needs human review.

## Setup

1. Install and open [Ollama](https://docs.ollama.com/quickstart). This adapter requires server version **0.34.4 or newer, stable**, for the non-truncating protocol checked against that version's source. This is a compatibility floor, not a claim of live testing on every later version.
2. Select a local model that fits your computer. The workflow benchmark needs a model with tool calling and enough context; the teaching runner does not need tools. Download it using `ollama pull MODEL_NAME` if necessary. Model downloads can be large.
3. Run `ollama list` and use the exact local model name. If the server is not running, open the Ollama app or run `ollama serve` in another terminal.
4. Enter the harness directory. The model name in `ollama-config.json` is a placeholder; provide `--model` on live commands.

```sh
cd /Users/dfortun/Documents/Codex/2026-09-28/bui/outputs/token-harness
ollama --version
ollama list
export OLLAMA_MODEL="REPLACE_WITH_YOUR_LOCAL_MODEL_NAME"
```

For the portable ZIP, use the extracted `token-harness` directory instead of the absolute path above. Do not select a cloud model; the adapter rejects registry entries with remote model/host metadata.

## Compare the complete workflow

```sh
RUN_DIR="runs/ollama-$(date +%Y%m%d-%H%M%S)"

python3 -B workflow.py baseline --adapter ollama --model "$OLLAMA_MODEL" \
  --config ollama-config.json --out "$RUN_DIR/baseline"

python3 -B workflow.py evaluate --adapter ollama --model "$OLLAMA_MODEL" \
  --config ollama-config.json --out "$RUN_DIR/optimized"

python3 -B workflow.py compare "$RUN_DIR/baseline/results.json" \
  "$RUN_DIR/optimized/results.json" --out "$RUN_DIR/comparison"
```

Read the generated comparison's `report.md` and `comparison.json`. An accepted live comparison needs complete provider usage, matching observed cache conditions, at least 5% total-token savings, full task success, no initial-quality regression, and no fallback under the supplied settings. A rejected comparison is useful evidence; do not relax its thresholds simply to obtain a pass.

To isolate a strategy, add `--strategies retrieve` (or another strategy name) to `evaluate`, using a new output directory. Keep the baseline and candidate on the same code, tasks, model, settings, and common limits. Old mock reports cannot be paired with new Ollama runs.

## Evaluate actual explanations

The default teaching-quality suite compares `reference_teacher` and `scaffolded_teacher` without a brevity target. Use `teaching-quality-tune.json` for development and `teaching-quality-eval.json` for evaluation. Every output path must be new. See [QUALITY.md](QUALITY.md) for human and learner requirements.

```sh
# Render prompts and check conservative budgets; no generation.
python3 -B harness.py teaching-quality-eval.json --adapter ollama --model "$OLLAMA_MODEL" \
  --repeat 1 --token-budget 100000 --context-tokens 32768 --hard-timeout 120 \
  --plan --out runs/ollama-teaching-plan.json

# Generate real explanations and record Ollama's usage counters.
python3 -B harness.py teaching-quality-eval.json --adapter ollama --model "$OLLAMA_MODEL" \
  --repeat 1 --token-budget 100000 --context-tokens 32768 --hard-timeout 120 \
  --out runs/ollama-teaching.json

python3 -B teaching_review.py pack runs/ollama-teaching.json --out runs/ollama-review.json

# Complete human reviews and record real learner responses before final assessment.
python3 -B teaching_review.py assess runs/ollama-teaching.json runs/ollama-review.json \
  --pricing ollama-config.json --out runs/ollama-teaching-assessment.json
```

Keep the reviewer guide and expected transfer answers out of generation requests. Human review checks correctness, clarity, learner fit, constraints, and withholding the transfer answer. Actual learner responses are needed to assess transfer; regex checks alone do not establish teaching quality. Use separate development lessons for tuning.

## Accounting and preservation

- Generation usage is taken from `prompt_eval_count` and `eval_count`. Cached input is recorded from `prompt_eval_cached_count` when present; it is never added to input a second time. Missing usage stops the call instead of inventing estimates. Missing cache usage stays unknown and blocks an accepted cache comparison. See [Ollama usage documentation](https://docs.ollama.com/api/usage).
- Preflight is different: the adapter calls `/api/chat` with `_debug_render_only: true`. It reserves rendered UTF-8 bytes plus 64 as an intentionally conservative **estimate**, labelled `estimated_rendered_bytes`. It does not claim an exact tokenizer count. This can refuse a prompt that a model could actually fit. If actual generation usage exceeds a reservation, the runner retains the usage and stops subsequent work.
- Both `truncate` and `shift` are false. The adapter also checks that rendering preserves submitted text and tool names. Templates that omit or transform required text are rejected before generation. Do not disable these checks to force a benchmark through. The adapter relies on the local server honoring its protocol; the rendered-byte estimate is not a universal tokenizer proof.
- The adapter translates the harness's function calls and tool results to Ollama messages, preserving call associations and returned thinking text. Ollama does not provide a portable developer role: original system/developer messages become labelled system messages with explicit priority instructions. This is a text-level encoding of the hierarchy, not an identical provider role mechanism. Model compliance still needs quality checks. Unsupported OpenAI-specific settings are rejected.
- Requests use a fixed context ceiling, `num_predict` for the response cap, and `think: false` in both variants. The local model must support these controls. The workflow preset requests 32,768 context tokens; lower it for memory constraints, keeping both runs matched. Essential text is never deleted to satisfy a smaller budget.
- The local model's digest and server version are included in the recorded model identity. Changes during a run stop it; comparisons reject different identities. Do not replace model weights during a benchmark.
- `wire_request` in workflow responses records the actual native request. Preflight events label estimates separately from generation counters. Retries, fallback, and additional tool rounds remain in the existing shared ledger. The adapter never retries internally. Teaching runs retain their original no-retry behavior.
- Local token pricing is zero. The preset explicitly excludes hardware, electricity, and hosting costs. Reduced local tokens do not establish OpenAI dollar savings or change ChatGPT subscription billing.
- Ollama caching is shared server state; first/repeat scheduling does not guarantee cold/warm cache. The runner records actual available cache counters and flags mismatches. Render-only preflight may load the model, so generation timing is not a pure cold-start measurement. Workflow latency includes preflight; teaching row latency covers generation only.
- Isolation stops stuck local adapter work. It cannot guarantee that a server stops computing immediately after a client timeout. Unreturned generation usage remains unknown.

The render-only and no-truncation fields were checked against [Ollama 0.34.4 request types](https://github.com/ollama/ollama/blob/v0.34.4/api/types.go) and [prompt rendering](https://github.com/ollama/ollama/blob/v0.34.4/server/prompt.go). The debug rendering interface is version-sensitive; an incompatible server fails closed.

## Verification and troubleshooting

```sh
python3 -B -m unittest -v
```

Offline HTTP fixtures exercise usage counters, role and source preservation, tool round trips, output/context limits, model changes, unknown cache usage, retries, and the teaching bridge. These are contract tests, not live savings or quality evidence.

- **Cannot connect:** open Ollama and check `ollama list`. A sandbox's localhost restriction may need network permission.
- **Local model not found:** use the exact installed name from `ollama list`.
- **Unsupported version:** update the server, not just the CLI binary.
- **Context budget exceeded:** use a suitable model and increase the matching context/workflow limits if your hardware permits, or test a smaller representative case. The preflight estimate deliberately over-reserves.
- **Template omitted text/tools:** select a compatible model/template. Do not delete required inputs to work around it.
- **Incomplete output:** increase both variants' response caps consistently. Truncated explanations do not count as successful optimizations.
- **Unknown cache usage or mismatched cache conditions:** inspect the counters; do not relabel them as zero or claim controlled cost savings.
- **Exit 1:** a task or acceptance threshold failed. Teaching generation can complete with exit 1 when no candidate meets the default 10% savings gate. **Exit 2:** invalid input, setup failure, or teaching execution error.
