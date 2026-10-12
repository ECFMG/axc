# Teaching quality criteria

The default CLI and Python runner evaluate teaching quality. No savings threshold, response length, token count, cache hit rate or price determines the teaching verdict. Legacy token experiments require `--objective tokens` explicitly.

## Three separate kinds of evidence

| Evidence | What it establishes | What it cannot establish |
|---|---|---|
| Deterministic checks | The response meets named, testable requirements | Complete semantic correctness or learner understanding |
| Human review | A person finds the lesson accurate, clear and suitable | Independent learner performance |
| Learner response | Observed transfer on the reviewed task | Causal learning gains, retention or generalization to unseen populations |

Do not replace missing evidence with model-generated ratings or synthetic learner answers. Mock results remain synthetic even when every check passes.

## Automatic checks

Every quality suite uses version 2 rubrics. All trials and all deterministic checks must pass before a variant is ready for review. A failed baseline does not prevent a better lesson from qualifying. Paired check regressions remain visible. Missing or duplicate trials cannot qualify.

Version 2 checks cover:

- Section structure when `require_sections` is true. The new teaching suites set it to false, so a missing heading alone does not reject an otherwise complete lesson.
- Required facts in the explanation, excluding the transfer question.
- The exact final transfer question, with no text after it.
- Case-specific answer-leakage and false-claim patterns.
- Required qualifications, such as positive factors, default steps and random assignment.
- Optional numeric assertions within the worked example. Conflicting matched values fail.
- Explicit word limits only. There is no implicit version 2 word limit.

Bold, common math formatting, Unicode symbols and thousands separators are normalized for checking. Original answers are preserved. Patterns still have limits: unfamiliar correct wording can fail, and a paraphrased error can pass. Inspect failures and improve the check using development examples and counterexamples.

Both styles must use the same reference context and output cap. Output caps and workflow budgets remain resource safeguards. They must not silently truncate required context; incomplete answers fail.

## Human review

`teaching_review.py pack` creates a shuffled pack without variant names, model names, token counts or latency. Use the reference and learner goal to review each lesson independently.

| Dimension | A score of 5 means |
|---|---|
| factual_correctness | Every claim, calculation and qualification is correct and supported |
| clarity | The learner can follow the explanation without avoidable ambiguity |
| learner_fit | Prerequisites, vocabulary and depth fit the stated learner |
| reasoning_support | Worked steps explain why transitions are valid |
| misconception_correction | The lesson identifies and correctly explains a relevant misconception |

The scale is 1 unusable, 2 major issues, 3 needs revision, 4 usable with minor presentation issues, 5 fully meets the goal. Factual correctness must be 5. Other dimensions must be at least 4. These checks must all be true:

- `constraints_preserved`
- `transfer_answer_withheld`
- `reference_grounded`
- `worked_steps_explained`

A loss on a paired human-rating dimension blocks that candidate, even if its average rises. The baseline may remain usable if it meets all requirements. The assessor regrades saved answers, recomputes eligibility and verifies report, checker and review-policy fingerprints. Modified questions, references, duplicate reviews and mismatched evidence are rejected.

## Learner evidence

Record these fields only after an actual learner attempts the question:

```json
{
  "learner_id": "pseudonymous-student-id",
  "learner_response": "The learner's actual answer and reasoning",
  "learner_support": "none",
  "learner_transfer_correct": true
}
```

`learner_support` is `none`, `hint` or `solution`. Use `null` for anything not observed. A scored answer requires an actual response, a learner ID and recorded support. A correct answer with hints or a revealed solution does not count as unassisted transfer.

A lesson can pass human review while learner evidence is still pending. Final acceptance on the tested sample requires correct, unassisted responses for every trial of that variant. Incorrect answers remain visible; no retries or selective deletion turn them into successes.

The harness trusts the human-entered learner record. It cannot verify who authored it or prevent practice effects. Learners who see both variants may improve through repetition. Do not infer causal gains from these descriptive results.

## Selection and status

Among accepted variants, a variant is preferred only when its average human rating is no worse on every dimension and better on at least one. No arbitrary score weights or token tie-breakers are used. Equal or incomparable quality remains a set of recommendations; `selected_variant` is null when there is no unique choice.

| Status | Meaning |
|---|---|
| human_review_pending | Required human ratings or checks are missing |
| learner_evidence_pending | A lesson passes review, but complete unassisted learner evidence is missing |
| learner_quality_failed | Observed unassisted responses include failures |
| accepted_on_sample | At least one variant passes all gates on the available sample |
| not_accepted | Other quality, provenance or execution requirements fail |

Unknown or differing model identities and incomplete generation block approval. Cache differences and configured cost increases are diagnostic notices only in quality mode. They do not invalidate a reviewed lesson. Missing prices remain unknown; no cost is invented.

## Commands

```sh
python3 -B harness.py --demo --out runs/demo.json
python3 -B harness.py --adapter ollama --model gemma4:26b \
  --context-tokens 8192 --hard-timeout 120 --out runs/lessons.json
python3 -B teaching_review.py pack runs/lessons.json --out runs/reviews.json \
  --worksheet runs/review-worksheet.md
# A person fills in reviews and observed learner evidence.
python3 -B teaching_review.py assess runs/lessons.json runs/reviews.json \
  --out runs/assessment.json
```

JSON remains the machine-readable record. Quality evaluations and assessments also produce readable Markdown. Use new paths to preserve previous runs. Pricing and extra review guides are optional.

## Rubric fields

A version 2 rubric has `version: 2`, optional boolean `require_sections` (legacy default true), named `required` and `forbidden` regexes, the exact `transfer_question`, and a nonempty `transfer_answer` list of leakage patterns. Optional `numeric` rules map a name to `{"pattern": "...(?P<value>...)...", "value": 25}`. Numeric assertions are scoped to the Example section; use that label when such rules are configured. Optional `max_words` represents an explicit user constraint.

Keep expected answers and rubric patterns out of model requests. Write the essential facts in the supplied reference. Freeze prompts, references and checks before evaluation. After inspecting evaluation outputs, treat those cases as regression data and use new ones for the next independent evaluation.

The original workflow JSON parser, retry ledger, fallback controls, source retrieval and token benchmarks remain available for compatibility. They are separate from the default teaching-quality verdict.

The readable worksheet keeps review IDs, requests, references and answers together. It has blank ratings, evidence notes and learner-response fields. It is a note-taking aid; enter observations in the corresponding JSON items for assessment. No human scores are prefilled.
