"""Compare independently evaluated versions against genuine no-harness records."""
import argparse
import json
import re
from pathlib import Path


REQUIRED = {'prompt_sha256', 'spec_sha256', 'base_commit', 'model_identity',
            'acceptance_sha256', 'tool_versions', 'settings', 'cache_policy'}


def compare(records, repetitions):
    if type(repetitions) is not int or repetitions < 1:
        raise ValueError('Predeclare a positive repetition count')
    labels = sorted({r['label'] for r in records})
    if any(label != 'no_harness' and not re.fullmatch(r'v7\.(?:[1-9][0-9])(?:\.\d+)?', label) for label in labels):
        raise ValueError('Candidates must be v7.10 through v7.99, optionally with a patch version; reference must be no_harness')
    reports = {}
    for label in labels:
        if label == 'no_harness':
            continue
        rows = [r for r in records if r['label'] in ('no_harness', label)]
        reasons = []
        groups = {name: [r for r in rows if r['label'] == name] for name in ('no_harness', label)}
        for name, trials in groups.items():
            ids = [r['repetition'] for r in trials]
            if len(ids) != len(set(ids)) or set(ids) != set(range(1, repetitions + 1)):
                reasons.append('Missing or duplicate predeclared repetitions: ' + name)
        conditions = [r.get('conditions', {}) for r in rows]
        if any(not REQUIRED <= set(c) or any(not c.get(k) for k in REQUIRED) or not isinstance(c.get('tool_versions'), dict) or not all(c.get('tool_versions', {}).values()) for c in conditions):
            reasons.append('Missing shared comparison conditions')
        if any(c.get('cache_policy') != 'cold' for c in conditions):
            reasons.append('This protocol requires verified cold-cache trials')
        if len({json.dumps(c, sort_keys=True) for c in conditions}) != 1:
            reasons.append('Shared model/task/tool/budget/cache/acceptance conditions differ')
        if any(r.get('quality_passed') is not True for r in rows):
            reasons.append('At least one trial failed external acceptance')
        if any(r['label'] == 'no_harness' and r.get('execution') != 'external_no_harness' for r in rows):
            reasons.append('Reference was not declared as external no-harness execution')
        if any(r['label'] != 'no_harness' and r.get('execution') != 'version_adapter' for r in rows):
            reasons.append('Candidate execution provenance is missing')
        totals = {}
        for name, trials in groups.items():
            calls = [c for r in trials for c in r.get('ledger', {}).get('calls', [])]
            valid = bool(calls) and all(r.get('ledger', {}).get('complete') is True and r.get('ledger', {}).get('calls') for r in trials)
            valid &= all(c.get('source') == 'provider' and type(c.get('input_tokens')) is int
                         and type(c.get('output_tokens')) is int and c['input_tokens'] >= 0
                         and c['output_tokens'] >= 0 for c in calls)
            valid &= all(c.get('cached_tokens') is None or (type(c.get('cached_tokens')) is int and 0 <= c['cached_tokens'] <= c.get('input_tokens', -1)) for c in calls)
            valid &= all(c.get('cached_tokens') is None or (type(c.get('cached_tokens')) is int and 0 <= c['cached_tokens'] <= c.get('input_tokens', -1)) for c in calls)
            identity = next((r.get('conditions', {}).get('model_identity') for r in trials), None)
            valid &= all(c.get('model') == identity for c in calls)
            if not valid:
                reasons.append('Incomplete, invalid or unmeasured usage: ' + name)
            if any(r.get('conditions', {}).get('cache_policy') == 'cold' for r in trials):
                if any(c.get('cached_tokens') != 0 or c.get('cache_reset', {}).get('verified_unloaded') is not True for c in calls):
                    reasons.append('Verified cold-cache conditions are missing: ' + name)
            tokens = sum(c['input_tokens'] + c['output_tokens'] for c in calls) if valid else None
            successes = sum(r.get('quality_passed') is True for r in trials)
            totals[name] = {'runs': len(trials), 'successes': successes, 'model_calls': len(calls),
                            'total_tokens': tokens, 'tokens_per_success': tokens / successes if tokens is not None and successes else None}
        reference, candidate = totals['no_harness']['total_tokens'], totals[label]['total_tokens']
        change = 100 * (candidate - reference) / reference if reference and candidate is not None else None
        accepted = not reasons and change is not None and change < 0
        if not reasons and not accepted:
            reasons.append('Candidate did not reduce total tokens')
        reports[label] = {'totals': totals, 'observed_total_token_change_percent': change,
                          'token_savings_claim_supported': accepted,
                          'accepted_savings_percent': -change if accepted else None, 'blocking_reasons': sorted(set(reasons))}
    if not reports:
        raise ValueError('Supply genuine no_harness records and at least one candidate label')
    return {'reference': 'no_harness', 'predeclared_repetitions': repetitions, 'comparisons': reports,
            'limitations': 'Imported provenance and counters are declarations, not authenticated provider records. No hosted cost or generalization claim.'}


if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('records', nargs='+')
    p.add_argument('--repetitions', type=int, required=True)
    p.add_argument('--out', required=True)
    a = p.parse_args()
    report = compare([json.loads(Path(n).read_text()) for n in a.records], a.repetitions)
    Path(a.out).write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps(report, indent=2))
