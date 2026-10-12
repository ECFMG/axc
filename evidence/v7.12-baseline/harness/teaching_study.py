#!/usr/bin/env python3
"""Summarize recorded learner evidence; never infer answers or score with a model."""
import argparse
import json
from datetime import datetime
from pathlib import Path
from common import digest, require, save

PHASES = ('pretest', 'immediate', 'delayed')


def timestamp(value):
    require(isinstance(value, str), 'Observed records need an ISO timestamp with timezone')
    try:
        parsed = datetime.fromisoformat(value.replace('Z', '+00:00'))
    except ValueError:
        raise ValueError('Invalid observation timestamp') from None
    require(parsed.utcoffset() is not None, 'Timestamp must include timezone')
    return parsed


def content_release(protocol, signoff):
    """Verify declared approvals against the exact lesson hashes, not reviewer identity."""
    if signoff is None:
        return dict(ready=False, reason='Independent content signoff missing')
    require(signoff.get('forms_hash') == protocol.get('forms_hash') and protocol.get('forms_hash'),
            'Assessment forms changed since content review')
    expected = sorted(protocol.get('lesson_hashes', {}).values())
    items = signoff.get('items', [])
    require(bool(expected) and sorted(i['answer_hash'] for i in items) == expected,
            'Content reviews must cover every exact lesson version')
    ready = all(i.get('reviewer_type') == 'human' and isinstance(i.get('reviewer'), str)
                and i['reviewer'].strip() and all(i.get(k) is True for k in
                ('all_claims_checked', 'independent_review', 'variant_and_usage_hidden', 'approved')) for i in items)
    ready = ready and isinstance(signoff.get('forms_approved_by'), str) and bool(signoff['forms_approved_by'].strip())
    return dict(ready=bool(ready), reason='Declared independent approvals complete' if ready else 'Independent content approvals pending')


def summarize(protocol, observations, signoff=None):
    require(observations.get('protocol_hash') == digest(protocol), 'Observation protocol changed')
    assignments = {a['learner_id']: a for a in protocol['assignments']}
    expected = {(a['learner_id'], c, p) for a in assignments.values() for c in a['case_order'] for p in PHASES}
    rows = observations.get('rows', [])
    keys = [(r['learner_id'], r['case'], r['phase']) for r in rows]
    require(len(keys) == len(set(keys)) and set(keys) == expected, 'Keep one record per assigned learner/case/phase, including missing observations')
    exposure = observations.get('sessions', [])
    session_keys = [(s['learner_id'], s['case']) for s in exposure]
    expected_sessions = {(i, c) for i, c, _ in expected}
    require(len(session_keys) == len(set(session_keys)) and set(session_keys) == expected_sessions, 'Invalid session records')
    sessions = dict(zip(session_keys, exposure))
    eligible, observed, exclusions = [], [], []
    for r, key in zip(rows, keys):
        require(r.get('reviewer_type') in (None, 'human', 'ai'), 'Reviewer type must be human, ai or null')
        score = r.get('score')
        require(score is None or type(score) is int and 0 <= score <= 2, 'Score must be 0, 1, 2 or null')
        response = r.get('response')
        if response is None:
            require(all(r.get(k) is None for k in ('observed_at', 'score', 'support', 'scorer', 'reviewer_type')),
                    'Do not fill scores, assistance or timestamps without an actual response')
            continue
        require(isinstance(response, str) and bool(response.strip()), 'Response must be actual nonempty learner text, or null for missing')
        when = timestamp(r.get('observed_at'))
        require(r.get('support') in ('none', 'hint', 'solution', 'unknown'), 'Record assistance explicitly')
        if score is not None:
            require(isinstance(r.get('scorer'), str) and bool(r['scorer'].strip()), 'Scored responses need a scorer')
            require(r.get('reviewer_type') in ('human', 'ai'), 'Scored responses need reviewer provenance')
        session = sessions[(key[0], key[1])]
        for field in ('prior_same_lesson', 'additional_study'):
            require(session.get(field) is None or type(session[field]) is bool, 'Exposure flags must be boolean or null')
        start = timestamp(session['lesson_started_at']) if session.get('lesson_started_at') else None
        end = timestamp(session['lesson_ended_at']) if session.get('lesson_ended_at') else None
        if end is not None:
            require(start is not None and start <= end, 'Lesson end requires a preceding lesson start')
        if key[2] != 'pretest':
            require(end is not None and when >= end, 'Transfer requires a preceding recorded lesson')
        elif start is not None:
            require(when <= start, 'Pretest must precede the lesson start')
        item = dict(r, arm=assignments[key[0]]['arm'])
        observed.append(item)
        reasons = []
        if score is None or r.get('reviewer_type') != 'human': reasons.append('human_scoring_pending')
        if r['support'] != 'none': reasons.append('assisted_or_unknown')
        if session.get('prior_same_lesson') is not False: reasons.append('prior_exposure_or_unknown')
        if key[2] == 'immediate' and (when-end).total_seconds() > protocol['immediate_window_minutes']*60:
            reasons.append('outside_immediate_window')
        if key[2] == 'delayed':
            days = (when-end).total_seconds()/86400
            low, high = protocol['delayed_window_days']
            if not low <= days <= high: reasons.append('outside_delayed_window')
            if session.get('additional_study') is not False: reasons.append('additional_study_or_unknown')
        if reasons: exclusions.append(dict(learner_id=key[0], case=key[1], phase=key[2], reasons=reasons))
        else: eligible.append(item)
    summaries = []
    for arm in sorted({a['arm'] for a in assignments.values()}):
        assigned = [a for a in assignments.values() if a['arm'] == arm]
        for phase in PHASES:
            selected = [r for r in eligible if r['arm'] == arm and r['phase'] == phase]
            measured = [r for r in observed if r['arm'] == arm and r['phase'] == phase]
            expected_count = sum(len(a['case_order']) for a in assigned)
            complete_learners = []
            for a in assigned:
                person = [r for r in selected if r['learner_id'] == a['learner_id']]
                if len(person) == len(a['case_order']):
                    complete_learners.append(sum(r['score'] == 2 for r in person)/len(person))
            summaries.append(dict(arm=arm, phase=phase, assigned_responses=expected_count,
                                  observed_responses=len(measured), missing_responses=expected_count-len(measured),
                                  human_scored_independent_in_window=len(selected),
                                  correct_with_reasoning=sum(r['score'] == 2 for r in selected),
                                  accuracy=sum(r['score'] == 2 for r in selected)/len(selected) if selected else None,
                                  mean_score=sum(r['score'] for r in selected)/len(selected) if selected else None,
                                  complete_learners=len(complete_learners),
                                  mean_learner_accuracy=sum(complete_learners)/len(complete_learners) if complete_learners else None))
    delayed = [r for r in eligible if r['phase'] == 'delayed']
    immediate = {(r['learner_id'], r['case']): r for r in eligible if r['phase'] == 'immediate'}
    matched = [r for r in delayed if (r['learner_id'], r['case']) in immediate]
    return dict(status='not_measured' if not observed else 'observations_recorded', protocol_hash=digest(protocol),
                content_release=content_release(protocol, signoff),
                observed_responses=len(observed), summaries=summaries, exclusions=exclusions,
                delayed_transfer_status='not_measured' if not delayed else 'observed_on_sample',
                matched_immediate_delayed_pairs=len(matched),
                retained_correct_pairs=sum(r['score'] == 2 and immediate[(r['learner_id'],r['case'])]['score'] == 2 for r in matched),
                retention_claim_supported=False, selected_variant=None,
                note='Descriptive pilot only. Human provenance is self-declared, not authenticated. Repeated tasks are clustered within learners; '
                     'do not treat them as independent participants. Assistance, extra study, missing follow-ups and timing are reported. '
                     'Delayed success does not by itself establish causal retention or population effectiveness.')


def main(argv=None):
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('protocol',type=Path)
    parser.add_argument('observations',type=Path)
    parser.add_argument('--content-signoff',type=Path,help='Independent human approval of the exact lessons and forms')
    parser.add_argument('--out',type=Path,required=True)
    args=parser.parse_args(argv)
    try:
        result=summarize(json.loads(args.protocol.read_text()),json.loads(args.observations.read_text()),
                         json.loads(args.content_signoff.read_text()) if args.content_signoff else None)
        require(not args.out.exists(),'Choose a new output path; previous evidence is preserved')
        save(args.out,result);print(result['status'])
        return 0
    except (ValueError,KeyError,TypeError,OSError) as exc:parser.error(str(exc))

if __name__=='__main__':raise SystemExit(main())
