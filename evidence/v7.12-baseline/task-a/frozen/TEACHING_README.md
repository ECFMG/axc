# Teaching quality harness

Evaluate whether a lesson is correct, understandable and useful to its learner. Teaching quality is the default objective. A longer or more expensive explanation can qualify. Token usage, cost and latency remain diagnostics; they never rank quality or break a tie.

Python 3.9+, standard library only. Existing OpenAI and local Ollama adapters remain available. No dashboard, extra service or paid model judge was added. Ponytail guided the implementation: reuse the runner, checks, review pack and adapters already present.

For repository coding tasks, see [CODING_TASKS.md](CODING_TASKS.md). The separate `coding_task.py` runner freezes a coding task and starting commit, executes a replaceable command adapter or records external Codex edits, audits changed paths, and captures validation and available usage. Teaching evaluation remains the default workflow.

## Start without a model or API key

```sh
python3 -B harness.py --demo --out runs/quality-demo.json
python3 -B -m unittest discover -v
```

The demo uses handwritten lessons and synthetic token counts. One reference lesson deliberately omits a condition. The more detailed candidate preserves it. The demo tests the harness; it does not establish real teaching quality or learning.

Every quality run writes JSON evidence and a readable Markdown report. Use a new output path each time.

## Evaluate a local model

With Ollama running and an installed model:

```sh
# Develop prompts and checks on these lessons.
python3 -B harness.py teaching-quality-tune.json \
  --adapter ollama --model gemma4:26b --context-tokens 8192 \
  --repeat 1 --hard-timeout 120 --out runs/development.json

# Freeze prompts and checks before evaluation. This is the default live suite.
python3 -B harness.py --adapter ollama --model gemma4:26b \
  --context-tokens 8192 --repeat 1 --hard-timeout 120 \
  --out runs/evaluation.json
```

The two styles are `reference_teacher` and `complete_teacher`. The revised style starts with the complete short reference, then explains the worked steps. This preserves previously omitted assumptions and exceptions. Both must preserve facts, assumptions, reasoning and uncertainty. Neither has a brevity target. They receive the same references and output budget. The six evaluation lessons cover fractions, experimental controls, Python boundaries, multiplication, language and evidence interpretation.

The current evaluation cases have now been inspected. Keep them as regression cases; write new cases before claiming an independent evaluation of further changes.

Use `--plan` to check the budget without generation. `--token-budget` is a safety ceiling, not a teaching score. OpenAI remains available through `--adapter openai --model MODEL` and `OPENAI_API_KEY`. Local Ollama needs no OpenAI key. See [OLLAMA.md](OLLAMA.md) for local setup.

## Test comparable cache conditions

```sh
python3 -B harness.py --adapter ollama --model gemma4:26b \
  --temperature 0 --context-tokens 8192 --cache-trials --repeat 2 \
  --token-budget 200000 --hard-timeout 120 --out runs/cache-evaluation.json
```

Each pair unloads only the selected model, verifies it is absent from Ollama's running-model list, runs a cold request, then immediately repeats the identical request. Both calls count toward tokens, latency and quality. `--repeat 2` means two cold/warm pairs per case and variant: 48 generation calls for this six-case, two-variant suite. No separate uncounted warm-up is used.

The report requires known zero cached tokens on cold calls, observed cache hits on warm attempts, stable model identity, matching repeated prompts and warm cached fractions within one percentage point across variants. A repeat without a cache hit stays a warm *attempt*. Missing or mismatched conditions block the cache comparison. Cold load time and reset overhead are visible; do not attribute all latency differences to prompt caching.

Use a quiet local model server. The harness cannot exclude another client's concurrent requests or control operating-system disk caches. Cache matching is separate from teaching approval. See [Ollama usage documentation](https://docs.ollama.com/api/usage) for provider counter meanings.

## Review teaching and learner evidence

```sh
python3 -B teaching_review.py pack runs/evaluation.json \
  --out runs/review.json --worksheet runs/review-worksheet.md
```

The pack and readable worksheet hide variant names and usage. Use the worksheet for notes, then enter scores in the JSON item with the same ID. A person rates factual correctness, clarity, learner fit, reasoning support and misconception correction. Scores must be grounded in the actual lesson. Factual correctness must receive 5/5; every other dimension must receive at least 4/5. All required checks must pass.

Record a real learner's transfer answer, a pseudonymous learner ID, whether hints or a solution were seen, and the reviewed result. Leave unobserved fields `null`. Correct answers given with hints do not count as unassisted transfer.

```sh
python3 -B teaching_review.py assess runs/evaluation.json runs/review.json \
  --out runs/assessment.json
```

Pricing is optional for quality review. Add `--pricing ollama-config.json` to report the configured local API tariff. Missing pricing means unknown cost, not zero cost.

Automatic checks produce **ready for human review**, never a teaching winner. Human review can establish **lesson quality passed**. Final sample acceptance additionally requires correct, unassisted learner responses for every trial. This is evidence on the sample, not proof of long-term learning or causal improvement.

If multiple accepted variants have equal or incomparable human ratings, the report keeps multiple recommendations. Tokens cannot break the tie. See [QUALITY.md](QUALITY.md) for exact gates, review criteria, report statuses and limitations.

## Use the policy in ChatGPT

Copy [TEACHING_PROMPT.md](TEACHING_PROMPT.md) into your teaching instructions. It prioritizes understanding, worked reasoning and useful feedback. A prompt file does not activate the Python harness or collect provider token counts inside ChatGPT.

## Extend the lessons

Copy `teaching-quality-tune.json`. State the learner, learning goal, reference facts, constraints and transfer question. Use a version 2 rubric. Check facts and known failures deterministically; use human review for meaning and teaching quality. Add a valid example and an invalid counterexample whenever a check changes.

There is no default word limit for version 2. Set `rubric.max_words` only when the learner's request genuinely requires one. Output limits still protect resources; truncated explanations fail.

Keep development and evaluation cases separate. Never retune on evaluation outputs and then describe the same cases as unseen. The main runner evaluates single explanations; `teaching_sessions.py` adds scripted multi-turn conversations. Neither supplies real learner evidence.

## Historical compatibility

Previous experiments and PDFs remain unchanged. The old token-selection path is explicitly opt-in:

```sh
python3 -B harness.py teaching.json --objective tokens --demo \
  --optimize output --out runs/legacy-demo.json
```

`workflow.py` remains available for historical workflow and accounting checks. Its token-saving gates do not determine teaching approval. Existing compatibility tests preserve the earlier behavior when this legacy objective is chosen.

Exit codes for quality evaluation: `0` means the plan succeeded or at least one variant is ready for review; `1` means none passed the automatic checks; `2` means invalid input or execution failure. A successful evaluation command is not adoption approval. Assessment returns `0` only when at least one variant is accepted on the sample.

### Broader teaching evaluation and learner evidence

`teaching-broad-eval.json` contains twelve new concepts across English, Spanish and French, three learner levels and multi-step reasoning. It preserves the two existing teaching prompts. Freeze the suite, prompts and graders before collecting outputs; use a new output path for every run. Regex coverage remains a limited screen: extra claims and learner suitability require human review.

```sh
python3 harness.py teaching-broad-eval.json --adapter ollama --model gemma4:26b \
  --temperature 0 --repeat 1 --context-tokens 8192 --token-budget 200000 \
  --cache-trials --hard-timeout 120 --out broad-run.json
python3 teaching_review.py pack broad-run.json --out broad-review.json --worksheet broad-review.md
```

Quality review records now require `reviewer_type="human"` to satisfy the human gate. Use `"ai"` for AI audits; missing or AI provenance leaves human review pending. This is a provenance declaration, not authentication. Examine all claims, qualifications and examples, not only rubric matches. Old frozen reports and review policies remain reproducible from their snapshots; create a new review pack to use the current policy.

`teaching_study.py protocol.json observations.json --out study-summary.json` analyzes a prespecified learner pilot. It distinguishes assisted answers, AI-scored records, independent reasoning, delayed-transfer windows, additional study and missing observations. It never invents responses or automatically asserts retention or causal effects. See the supplied learner-study kit for blank records, administration steps, separate answer keys and counterbalanced topic orders.

### Grader calibration, conversation testing and total effort

Run `teaching_validation.py calibrate teaching-grader-development.json --out calibration.json` to check bounded rules against 27 AI-authored positive/negative development examples. This reports false positives and false negatives, not independent teaching accuracy. Numeric rubric entries can now use `scope: "lesson"` and explicit `units` aliases with a named `unit` capture. Existing numeric checks retain their default Example scope.

`teaching_sessions.py` evaluates real multi-turn model conversations against scripted learner requests. Each call receives that style's actual prior answers and unchanged earlier constraints. No rubric or fixture answer enters a request. The offline demo is:

```sh
python3 teaching_sessions.py teaching-sessions-demo.json --settings teaching-sessions-demo-settings.json --out session-demo.json
```

Live runs require `teaching_validation.py freeze ... --settings ... --out NEW_DIRECTORY` and execution from that directory's `source/` with `--freeze NEW_DIRECTORY/freeze.json`. A freeze checks source/suite/settings identity; it does not make a reused dataset fresh. Natural conversation cache conditions are recorded, not declared equivalent.

Human reviews now explicitly require `all_claims_checked`, `independent_review` and `variant_and_usage_hidden`, in addition to human provenance and the existing ratings. Conversation review packets include the actual preceding conversation, with system prompts and usage hidden. These fields are declarations, not reviewer authentication.

`teaching_validation.py effort REPORT --out LOG` creates an incomplete effort template. Record actual external calls and human review/correction time, then use `--log LOG --out SUMMARY`. Unknown usage, minutes and prices stay unknown; do not duplicate calls already present in the report. No hosted prices are supplied. Scripted learner turns never qualify as learner observations.

The learner analyzer accepts `--content-signoff FILE` and reports `content_release.ready` only for complete declared independent approvals tied to exact lesson and form hashes. Do not expose learners while this gate is false.
