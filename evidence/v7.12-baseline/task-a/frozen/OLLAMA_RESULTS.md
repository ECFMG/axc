# Ollama adapter verification

Historical token/workflow documentation. The current teaching-quality workflow starts in [README.md](README.md).

Date: 2026-09-28. Local server: Ollama 0.34.4. Model: `gemma4:26b`, digest prefix `08ae7ec1744b`. No model download or cloud call was made.

## Offline checks

The complete suite passes 64 tests, including 13 Ollama-specific checks. They cover the native request format, instruction/text preservation, tool exchanges, thinking continuity, usage normalization, unknown cache counts, budget refusal, retries, model changes, zero local pricing, and the teaching bridge. The frozen pre-refactor mock behavior still passes.

## Real workflow smoke check

One unchanged evaluation task (`eval-short`) ran once with an 8,192-token context, a 128-token response cap, and no retries.

- Provider-reported input: 560 tokens.
- Provider-reported output: 33 tokens.
- Total: 593 tokens; cached input: 0.
- The response contained the correct requested values inside a Markdown code fence. The existing strict JSON checker rejected it as `invalid JSON answer`.
- No fallback ran. This is a failed task, not an accepted optimization or savings result. The checker was not loosened to make it pass.

See [the complete saved workflow](runs/ollama-smoke-2c9abc20/baseline/results.json).

## Real teaching smoke check

One held-out lesson (`speed-units`) ran once with each of the two unchanged teaching prompts. The model, facts, response cap (1,024), and context ceiling (8,192) matched. These were genuine local model responses, not demo fixtures.

| Metric | Baseline | Compact teaching |
|---|---:|---:|
| Reported input tokens | 322 | 299 |
| Reported output tokens | 336 | 188 |
| Reported total tokens | 658 | 487 |
| Reported cached input | 0 | 0 |
| Visible words | 197 | 108 |
| Deterministic coverage checks | Failed two checks | Passed |

The compact variant used 171 fewer reported tokens, a **25.99% total-token reduction on this one paired lesson**. Output decreased 44.05%. This is a measured result for these two responses only, not a validated overall savings rate.

The baseline failed `required:seconds` and `required:result`. Its answer used comma-formatted numbers and LaTeX, illustrating the limits of literal coverage patterns. These failures do not establish that the baseline's arithmetic was wrong. The grading rules and held-out prompts were left unchanged.

The automatic selection is provisional. The review pack has two pending human reviews, and the assessment is `pending` with no accepted variant. No learner outcomes were measured. Repeat on the full held-out suite and complete human review before adopting a savings claim about teaching quality.

- [Raw teaching report](runs/ollama-teaching-smoke-20260928.json)
- [Blank human review form](runs/ollama-teaching-smoke-review-20260928.json)
- [Pending assessment](runs/ollama-teaching-smoke-assessment-20260928.json)

Local per-token API pricing is zero; these tests do not measure hardware/electricity cost or establish OpenAI/ChatGPT savings. Follow [OLLAMA.md](OLLAMA.md) to run the complete workflow and teaching benchmarks.
