#!/usr/bin/env python3
"""Create a blind human-review pack and combine reviews with measured teaching runs."""

import argparse
import copy
import json
import math
import random
import statistics
from pathlib import Path

from common import digest, require, save
from reporting import cost

ROOT = Path(__file__).resolve().parent
RATINGS = ("factual_correctness", "clarity", "learner_fit")
CHECKS = ("constraints_preserved", "transfer_answer_withheld")
TEACHING_RATINGS = RATINGS + ('reasoning_support', 'misconception_correction')
TEACHING_CHECKS = CHECKS + ('reference_grounded', 'worked_steps_explained',
                          'all_claims_checked', 'independent_review', 'variant_and_usage_hidden')


def review_policy_hash():
    return digest(Path(__file__).read_text())


def review_pack(report, guide=None, seed=37):
    quality = report.get('objective') == 'quality'
    dimensions = TEACHING_RATINGS if quality else RATINGS
    checks = TEACHING_CHECKS if quality else CHECKS
    cases = {case["id"]: case for case in report["suite"]["cases"]}
    items = []
    for index, row in enumerate(report["rows"]):
        case = cases[row["case"]]
        items.append(dict(id=digest([digest(report), index])[:20], case=row["case"],
                          request=case["input"], reference=case["contexts"]["full"], answer=row["output"],
                          review_points=(guide or {}).get(row['case'], dict(
                              required_facts=list(case.get('rubric', {}).get('required', {})),
                              transfer_question=case.get('rubric', {}).get('transfer_question'))),
                          ratings={name: None for name in dimensions},
                          checks={name: None for name in checks}, reviewer=None, notes="",
                          learner_response=None, learner_transfer_correct=None))
        if quality:
            items[-1].update(reviewer_type=None, learner_id=None, learner_support=None)
        if 'review_context' in row:
            items[-1]['conversation_context'] = copy.deepcopy(row['review_context'])
    random.Random(seed).shuffle(items)
    result = dict(report_hash=digest(report), measurement_mode=report["mode"], seed=seed,
                  status="human_review_pending", items=items)
    if quality:
        result.update(review_policy_hash=review_policy_hash(), objective='quality',
                      instructions='Rate each dimension: 1 unusable, 2 major issues, 3 needs revision, '
                      '4 usable with minor presentation issues, 5 fully meets the goal. Factual correctness must be 5; '
                      'every other dimension must be at least 4. Examine every claim, analogy, exception and intermediate step, not just rubric keywords. '
                      'Set reviewer_type to human or ai honestly. AI ratings are supplementary and cannot satisfy the human gate. '
                      'An independent human must inspect every claim with variant names, token counts and prior AI judgments hidden. '
                      'Record any unblinding honestly; independence fields are declarations, not authentication. '
                      'Record real learner responses only; use a pseudonymous learner_id. learner_support must be '
                      'none, hint or solution. Score learner_transfer_correct only when the learner can explain the reasoning '
                      'required by the question. Leave unobserved fields null. No scores may be inferred from the lesson.')
    return result


def assess(report, reviews, pricing=None):
    from harness import evaluation_hash, grade, summarize, validate, validate_teaching_comparison
    quality = report.get('objective') == 'quality'
    dimensions = TEACHING_RATINGS if quality else RATINGS
    review_checks = TEACHING_CHECKS if quality else CHECKS
    require(reviews.get("report_hash") == digest(report), "Review belongs to a different run")
    validate(report['suite'])
    if quality:
        validate_teaching_comparison(report['suite'])
        require(reviews.get('review_policy_hash') == review_policy_hash(), 'Review policy changed; create a new review pack')
    cases = {case['id']: case for case in report['suite']['cases']}
    graded_rows = []
    for row in report['rows']:
        require(row['case'] in cases, 'Unknown teaching case')
        checked = grade(cases[row['case']], row['output'], row['status'])
        require(all(row.get(key) == checked[key] for key in ('passed', 'checks', 'word_count')),
                'Stored teaching grade does not match the current deterministic checks')
        graded_rows.append(dict(row, **checked))
    summaries_checked, _ = summarize(report['suite'], graded_rows, report['repeat'],
                                     report['min_pass_rate'], report['min_savings'], report.get('optimize', 'total'),
                                     'quality' if quality else 'tokens')
    require(quality or pricing is not None, 'Legacy token comparisons require pricing')
    if pricing is not None:
        require(isinstance(pricing.get("label"), str), "Pricing provenance label required")
        for key in ("input_per_million", "cached_input_per_million", "output_per_million"):
            require(type(pricing.get(key)) in (int, float) and math.isfinite(pricing[key]) and pricing[key] >= 0,
                    "Invalid price: " + key)
    entries = reviews.get("items", [])
    require(isinstance(entries, list) and all(isinstance(item, dict) for item in entries), "Invalid review entries")
    by_id = {item["id"]: item for item in entries}
    require(len(by_id) == len(entries), "Duplicate review id")
    expected_ids = {digest([digest(report), index])[:20] for index in range(len(report["rows"]))}
    require(set(by_id) <= expected_ids, "Unknown review id")
    pending, rows = [], []
    for index, row in enumerate(report["rows"]):
        identity = digest([digest(report), index])[:20]
        review = by_id.get(identity)
        passed = False
        complete = review is not None
        if review is not None:
            require(review.get("answer") == row["output"] and review.get("case") == row["case"], "Reviewed answer was modified")
            ratings, checks = review.get("ratings", {}), review.get("checks", {})
            if quality:
                case = cases[row['case']]
                require(review.get('reviewer_type') in (None, 'human', 'ai'), 'Reviewer type must be human, ai or null')
                require(review.get('request') == case['input'] and review.get('reference') == case['contexts']['full'],
                        'Reviewed question or reference was modified')
                require(review.get('conversation_context') == row.get('review_context'),
                        'Reviewed conversation was modified')
            for name in dimensions:
                value = ratings.get(name)
                require(value is None or type(value) is int and 1 <= value <= 5, "Ratings must be integers from 1 to 5")
            for name in review_checks:
                require(checks.get(name) is None or type(checks[name]) is bool, "Review checks must be booleans")
            complete = (all(ratings.get(name) is not None for name in dimensions)
                        and all(checks.get(name) is not None for name in review_checks)
                        and isinstance(review.get("reviewer"), str) and bool(review["reviewer"].strip()))
            if quality:
                complete = complete and review.get('reviewer_type') == 'human'
            passed = complete and all(ratings[name] >= 4 for name in dimensions) and all(checks[name] for name in review_checks)
            if quality and complete:
                passed = passed and ratings['factual_correctness'] == 5
            learner_result = review.get("learner_transfer_correct")
            require(learner_result is None or type(learner_result) is bool, "Invalid learner transfer score")
            require(learner_result is None or isinstance(review.get("learner_response"), str) and review["learner_response"].strip(),
                    "A transfer score requires an actual learner response")
            if quality and learner_result is not None:
                require(isinstance(review.get('learner_id'), str) and bool(review['learner_id'].strip()),
                        'Learner evidence requires a pseudonymous learner_id')
                require(review.get('learner_support') in ('none', 'hint', 'solution'), 'Record learner support honestly')
        if not complete:
            pending.append(identity)
        rows.append(dict(id=identity, variant=row["variant"], case=row["case"],
                         deterministic_pass=row["passed"], human_pass=passed if complete else None,
                         success=row["passed"] and passed if complete else None,
                         learner_transfer_correct=review.get("learner_transfer_correct") if review else None,
                         total_tokens=row["total_tokens"], estimated_cost_usd=cost(row, pricing) if pricing else None))
        if quality:
            rows[-1].update(repeat=row['repeat'], ratings=review.get('ratings', {}) if review else {},
                            reviewer_type=review.get('reviewer_type') if review else None,
                            review_failures=([d for d in dimensions if ratings.get(d) is not None
                                              and ratings[d] < (5 if d == 'factual_correctness' else 4)]
                                             + [c for c in review_checks if checks.get(c) is False]) if review else [],
                            learner_support=review.get('learner_support') if review else None,
                            learner_id=review.get('learner_id') if review else None)
    summaries = []
    for original in summaries_checked:
        selected = [row for row in rows if row["variant"] == original["variant"]]
        reviewed = [row for row in selected if row["human_pass"] is not None]
        learners = [row["learner_transfer_correct"] for row in selected if row["learner_transfer_correct"] is not None]
        success = sum(row["success"] is True for row in selected)
        summaries.append(dict(variant=original["variant"], trials=len(selected), human_reviewed=len(reviewed),
                              success_rate=success / len(selected) if len(reviewed) == len(selected) and selected else None,
                              total_tokens=sum(row["total_tokens"] for row in selected),
                              estimated_cost_usd=sum(row["estimated_cost_usd"] for row in selected) if pricing else None,
                              tokens_per_success=sum(row["total_tokens"] for row in selected) / success if success and len(reviewed) == len(selected) else None,
                              learner_responses=len(learners), learner_transfer_accuracy=sum(learners) / len(learners) if learners else None,
                              eligible=original["eligible"] and bool(selected) and success == len(selected)))
    flags = []
    if report.get('evaluation_hash') != evaluation_hash(report['suite']):
        flags.append('grading provenance missing or changed; rerun with the current checker')
    if not any(s['eligible'] for s in summaries_checked):
        flags.append('automatic teaching quality gate failed' if quality else 'automatic quality/token gate failed')
    if report["mode"] != "live":
        flags.append("synthetic demo; no real quality or savings claim")
    if report["status"] != "completed":
        flags.append("incomplete generation accounting; known cost is only a lower bound")
    if pending:
        flags.append("human reviews pending")
    models = {row.get("model") for row in report["rows"]}
    if len(models) != 1 or None in models:
        flags.append("served model versions differ or are unknown")
    diagnostics = [] if quality else flags
    if any(row["cached_tokens"] is None for row in report["rows"]):
        diagnostics.append("cache usage unavailable; cost comparison is provisional")
    baseline_cost = summaries[0]["estimated_cost_usd"]
    for summary in summaries[1:]:
        if not quality and summary["estimated_cost_usd"] > baseline_cost:
            summary["eligible"] = False
    baseline_name = report["suite"]["variants"][0]["name"]
    baseline_cache = {(row["case"], row["repeat"]): row["cached_tokens"] is not None and row["cached_tokens"] > 0
                      for row in report["rows"] if row["variant"] == baseline_name}
    if any(row["variant"] != baseline_name and baseline_cache.get((row["case"], row["repeat"])) !=
           (row["cached_tokens"] is not None and row["cached_tokens"] > 0) for row in report["rows"]):
        diagnostics.append("observed cache conditions differ")
    if quality:
        return quality_verdict(report, summaries, rows, flags, diagnostics, pending, pricing)
    for summary in summaries:
        summary["eligible"] = summary["eligible"] and not flags
    eligible = [row for row in summaries if row["eligible"]]
    selected = min(eligible, key=lambda row: row["total_tokens"])["variant"] if eligible and not flags else None
    return dict(status="accepted" if selected else "pending" if pending else "not_accepted",
                selected_variant=selected, flags=flags, pricing=pricing, report_hash=digest(report),
                pending_reviews=len(pending), summaries=summaries, rows=rows,
                review_code_hash=digest(Path(__file__).read_text()),
                note="Human ratings assess explanation quality. Transfer results require real learner responses and are descriptive, not a causal learning study.")


def quality_verdict(report, summaries, rows, flags, diagnostics, pending, pricing):
    """Require real evidence; rank reviewed quality only. Equal quality stays tied."""
    baseline = {(r['case'], r['repeat']): r for r in rows if r['variant'] == summaries[0]['variant']}
    for summary in summaries:
        selected = [r for r in rows if r['variant'] == summary['variant']]
        complete = bool(selected) and all(r['human_pass'] is not None for r in selected)
        scores = {d: statistics.mean(r['ratings'][d] for r in selected) for d in TEACHING_RATINGS} if complete else None
        regressions = []
        for r in selected:
            first = baseline.get((r['case'], r['repeat']))
            if first is not None and r['human_pass'] is not None and first['human_pass'] is not None:
                regressions.extend(r['case'] + '/' + d for d in TEACHING_RATINGS if r['ratings'][d] < first['ratings'][d])
        lesson_ready = summary['eligible'] and not regressions and not flags
        unassisted = [r for r in selected if r['learner_transfer_correct'] is not None and r['learner_support'] == 'none']
        learning_ready = lesson_ready and len(unassisted) == len(selected) and all(r['learner_transfer_correct'] for r in unassisted)
        summary.update(human_ratings=scores, human_regressions=sorted(set(regressions)),
                       review_failures=[r['case'] + '/' + failure for r in selected for failure in r['review_failures']],
                       lesson_quality_passed=lesson_ready, eligible=learning_ready,
                       unassisted_responses=len(unassisted),
                       unassisted_transfer_accuracy=(sum(r['learner_transfer_correct'] for r in unassisted) / len(unassisted)
                                                     if unassisted else None),
                       learning_status='observed_on_sample' if learning_ready else 'not_measured' if not unassisted else 'incomplete_or_failed')
    candidates = [s for s in summaries if s['eligible']]
    # ponytail: conservative Pareto comparison; no invented weights or token tie-breaker.
    best = [s['variant'] for s in candidates if not any(
        all(o['human_ratings'][d] >= s['human_ratings'][d] for d in TEACHING_RATINGS)
        and any(o['human_ratings'][d] > s['human_ratings'][d] for d in TEACHING_RATINGS) for o in candidates)]
    learner_failure = any(s['lesson_quality_passed'] and s['unassisted_transfer_accuracy'] is not None
                          and s['unassisted_transfer_accuracy'] < 1 for s in summaries)
    status = ('accepted_on_sample' if best else 'human_review_pending' if pending else
              'learner_quality_failed' if learner_failure else
              'learner_evidence_pending' if any(s['lesson_quality_passed'] for s in summaries) else 'not_accepted')
    return dict(objective='quality', status=status, selected_variant=best[0] if len(best) == 1 else None,
                recommended_variants=best, flags=flags, diagnostics=diagnostics, pending_reviews=len(pending),
                summaries=summaries, rows=rows, pricing=pricing, report_hash=digest(report), review_code_hash=review_policy_hash(),
                note='Acceptance is limited to this sample. Human ratings and recorded unassisted learner responses determine quality. '
                     'No causal learning claim. Tokens, cost and latency never determine selection; tied quality remains tied.')


def render_assessment(result):
    lines = ['# Teaching quality review', '', 'Status: ' + result['status'], '', result['note'], '',
             '| Variant | Lesson quality | Unassisted responses | Transfer accuracy |', '|---|---|---:|---:|']
    for s in result['summaries']:
        value = s['unassisted_transfer_accuracy']
        lines.append('| %s | %s | %s/%s | %s |' % (s['variant'], s['lesson_quality_passed'],
                     s['unassisted_responses'], s['trials'], 'Not measured' if value is None else '%.1f%%' % (100*value)))
        if s['human_regressions']:
            lines.append('\nHuman regressions for %s: %s\n' % (s['variant'], ', '.join(s['human_regressions'])))
        if s['review_failures']:
            lines.append('\nFailed human criteria for %s: %s\n' % (s['variant'], ', '.join(s['review_failures'])))
    lines += ['', 'Recommended variants: ' + (', '.join(result['recommended_variants']) or 'none'),
              'Blocking findings: ' + ('; '.join(result['flags']) or 'See incomplete or failed learner/lesson checks above.'),
              'Usage diagnostics: ' + ('; '.join(result['diagnostics']) or 'none')]
    return '\n'.join(lines) + '\n'


def render_worksheet(pack):
    """Readable, blinded review pages; JSON remains the assessment record."""
    lines = ['# Teaching review worksheet', '',
             'Review each lesson before discussing variants. Names and token counts are hidden.',
             'This worksheet is for notes. Enter the same observations in the matching JSON review item by ID before assessment.',
             'Leave every unobserved field blank/null. Do not invent learner answers or scores.', '',
             pack.get('instructions', 'Rate correctness, clarity and learner fit from 1 to 5.'), '',
             'Use independent learners or counterbalance exposure. Repeated exposure can change transfer performance.', '']
    for i, item in enumerate(pack['items'], 1):
        lines += ['---', '', '## Lesson %s | %s' % (i, item['id']), '',
                  'Case: ' + item['case'], '', '**Learner request**', '', item['request'], '',
                  '**Reference**', '', item['reference'], '', '**Lesson to review**', '', item['answer'], '',
                  '**Reviewer:** ____________________', '', '**Reviewer type:** human / ai (AI cannot satisfy the human gate)', '']
        if item.get('conversation_context'):
            lines += ['', '**Conversation context (instructions and usage hidden)**', '']
            lines += ['**%s:** %s\n' % (m['role'], m['content']) for m in item['conversation_context']]
        lines += ['', '| Dimension | Score 1-5 | Evidence / correction |', '|---|---|---|']
        lines += ['| %s | | |' % d for d in item['ratings']]
        lines += ['', '| Required check | True / False | Evidence |', '|---|---|---|']
        lines += ['| %s | | |' % c for c in item['checks']]
        lines += ['', '**Learner ID:** ____________________', '',
                  '**Support:** none / hint / solution / not observed', '',
                  '**Actual learner answer and reasoning:**', '', '____________________________________________________________', '',
                  '**Transfer correct:** true / false / not observed', '',
                  '**Other notes and uncertainty:**', '', '____________________________________________________________', '']
    return '\n'.join(lines) + '\n'


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    pack = commands.add_parser("pack")
    pack.add_argument("report", type=Path)
    pack.add_argument("--guide", type=Path, help='Optional extra review guidance; defaults to the suite facts')
    pack.add_argument("--out", type=Path, required=True)
    pack.add_argument('--worksheet', type=Path, help='Also write a blinded Markdown review worksheet')
    score = commands.add_parser("assess")
    score.add_argument("report", type=Path)
    score.add_argument("reviews", type=Path)
    score.add_argument("--pricing", type=Path, help='Optional diagnostic pricing; required for legacy token selection')
    score.add_argument("--out", type=Path, required=True)
    args = parser.parse_args(argv)
    try:
        require(not args.out.exists(), "Output must be a new file")
        if getattr(args, 'worksheet', None):
            require(args.worksheet.suffix == '.md' and not args.worksheet.exists() and args.worksheet != args.out,
                    'Worksheet must be a new .md file')
        report = json.loads(args.report.read_text())
        if args.command == "pack":
            result = review_pack(report, json.loads(args.guide.read_text()) if args.guide else None)
        else:
            pricing = json.loads(args.pricing.read_text()) if args.pricing else None
            result = assess(report, json.loads(args.reviews.read_text()), pricing.get("pricing", pricing) if pricing else None)
        if args.command == 'assess' and result.get('objective') == 'quality':
            require(args.out.suffix == '.json' and not args.out.with_suffix('.md').exists(), 'Use unused .json and .md output paths')
        args.out.parent.mkdir(parents=True, exist_ok=True)
        save(args.out, result)
        if getattr(args, 'worksheet', None):
            args.worksheet.parent.mkdir(parents=True, exist_ok=True)
            args.worksheet.write_text(render_worksheet(result), encoding='utf-8')
        if args.command == 'assess' and result.get('objective') == 'quality':
            args.out.with_suffix('.md').write_text(render_assessment(result), encoding='utf-8')
        print(result["status"])
        return 0 if args.command == "pack" or result.get('recommended_variants') or result["selected_variant"] is not None else 1
    except (ValueError, KeyError, TypeError, OSError) as exc:
        parser.error(str(exc))


if __name__ == "__main__":
    raise SystemExit(main())
