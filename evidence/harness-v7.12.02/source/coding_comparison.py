"""Conservative token claims from paired coding-task evidence, never from mocks."""
import argparse
import json
from pathlib import Path


def compare(runs, expected_repetitions=2):
    if type(expected_repetitions) is not int or expected_repetitions < 1:
        raise ValueError('Expected repetitions must be a positive integer')
    reasons = []
    by_variant = {v: [r for r in runs if r['variant'] == v] for v in ('baseline', 'relevant_context')}
    if not all(by_variant.values()) or len(by_variant['baseline']) != len(by_variant['relevant_context']):
        reasons.append('Missing or unbalanced variants')
    signatures = [json.dumps(r['conditions'], sort_keys=True) for r in runs]
    required = {'prompt_sha256', 'spec_sha256', 'base_commit', 'model_identity', 'verification_sha256', 'agent_sha256', 'runner_sha256', 'settings', 'tool_versions'}
    if any(not required.issubset(r['conditions']) or any(not r['conditions'][k] for k in required) for r in runs):
        reasons.append('Required reproducibility evidence is missing')
    if len(set(signatures)) != 1:
        reasons.append('Task, base, model, verifier, code or tool conditions differ')
    for variant, rows in by_variant.items():
        if len({r['repetition'] for r in rows}) != len(rows):
            reasons.append('Duplicate repetitions: ' + variant)
    if {r['repetition'] for r in by_variant['baseline']} != {r['repetition'] for r in by_variant['relevant_context']}:
        reasons.append('Repetition pairs differ')
    expected = set(range(1, expected_repetitions + 1))
    if any({r['repetition'] for r in rows} != expected for rows in by_variant.values()):
        reasons.append('The predeclared repetitions are incomplete')
    all_calls = [c for r in runs for c in r['ledger'].get('calls', [])]
    if not all(r['ledger'].get('complete') is True and r['ledger'].get('calls') for r in runs):
        reasons.append('Incomplete provider usage')
    if any(c.get('source') != 'provider' or type(c.get('input_tokens')) is not int or type(c.get('output_tokens')) is not int for c in all_calls):
        reasons.append('Unknown or estimated usage in comparison')
    if any(type(c.get(k)) is int and c[k] < 0 for c in all_calls for k in ('input_tokens', 'output_tokens')):
        reasons.append('Invalid negative token counter')
    if len({c.get('model') for c in all_calls}) != 1 or any(not c.get('model') for c in all_calls):
        reasons.append('Measured model identities differ or are missing')
    if any(c.get('cached_tokens') != 0 or not c.get('cache_reset', {}).get('verified_unloaded') for c in all_calls):
        reasons.append('Comparable cold-cache conditions not established')
    if any(not r.get('quality_passed') for r in runs):
        reasons.append('At least one run failed required quality gates')
    totals = {}
    for variant, rows in by_variant.items():
        calls = [c for r in rows for c in r['ledger'].get('calls', [])]
        measured = bool(calls) and all(type(c.get('input_tokens')) is int and type(c.get('output_tokens')) is int for c in calls)
        successes = sum(bool(r.get('quality_passed')) for r in rows)
        tokens = sum(c['input_tokens'] + c['output_tokens'] for c in calls) if measured else None
        totals[variant] = {
            'runs': len(rows), 'successes': successes, 'success_rate': successes / len(rows) if rows else 0,
            'model_calls': len(calls), 'input_tokens': sum(c['input_tokens'] for c in calls) if measured else None,
            'output_tokens': sum(c['output_tokens'] for c in calls) if measured else None, 'total_tokens': tokens,
            'tokens_per_success': tokens/successes if tokens is not None and successes else None,
            'model_latency_ms': sum(c.get('latency_ms', 0) for c in calls),
            'estimated_cost_usd': None,
        }
    baseline = totals['baseline']['total_tokens']
    candidate = totals['relevant_context']['total_tokens']
    raw_change = 100 * (candidate - baseline) / baseline if baseline and candidate is not None else None
    approved = not reasons and raw_change is not None and raw_change < 0
    if not reasons and not approved:
        reasons.append('Candidate did not reduce total tokens')
    return {
        'schema_version': 1, 'comparison': 'internal harness context comparison; baseline means broad context, NOT no harness',
        'variants': totals, 'observed_total_token_change_percent': raw_change,
        'token_savings_claim_supported': approved, 'accepted_savings_percent': -raw_change if approved else None,
        'blocking_reasons': reasons, 'hosted_cost_savings': None,
        'scope': 'These results describe only the recorded local model runs on Task Set A. No claim about unseen coding tasks, teaching quality, ChatGPT usage or hosted invoices.',
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('runs', nargs='+')
    parser.add_argument('--out', required=True)
    args = parser.parse_args()
    report = compare([json.loads(Path(p).read_text()) for p in args.runs])
    Path(args.out).write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps(report, indent=2))


if __name__ == '__main__':
    main()
