"""Measured token reduction, conditional on complete controlled runs of equal quality."""
import argparse
import json
import math
from pathlib import Path


VARIANTS = ('baseline', 'relevant_context')
ACTORS = ('primary', 'reviewer', 'reporting')
MANDATORY_CHECK_COUNT = 8
CONDITION_KEYS = (
    'prompt_sha256', 'spec_sha256', 'base_commit', 'model_identity',
    'verification_sha256', 'agent_sha256', 'runner_sha256', 'settings',
    'tool_versions', 'accounting_scope', 'protocol_sha256', 'mandatory_check_count', 'expected_repetitions', 'task_contract_sha256',
)
CONTROL_KEYS = (
    'context_limits_applied', 'fresh_review_executed', 'repair_checks_executed',
    'shared_budget_enforced',
)


def _mapping(value):
    return value if isinstance(value, dict) else {}


def _counter(value):
    return type(value) is int and value >= 0


def _without_forecasts(value):
    """Forecast annotations are never experimental conditions or scoring inputs."""
    if isinstance(value, dict):
        return {key: _without_forecasts(item) for key, item in value.items()
                if not key.startswith(('forecast', 'projection', 'projected_'))
                and key not in ('expected_calls', 'input_tokens_per_call', 'output_tokens_per_call')}
    if isinstance(value, list):
        return [_without_forecasts(item) for item in value]
    return value


def _calls(row):
    value = _mapping(row.get('ledger')).get('calls')
    return value if isinstance(value, list) else []


def _measured(call):
    return (isinstance(call, dict) and call.get('source') == 'provider'
            and all(_counter(call.get(key)) for key in ('input_tokens', 'output_tokens')))


def _tokens(calls):
    return sum(call['input_tokens'] + call['output_tokens'] for call in calls) if all(map(_measured, calls)) else None


def _quality_passed(row):
    validation = _mapping(row.get('validation'))
    checks = validation.get('checks')
    return (row.get('quality_passed') is True and isinstance(checks, list)
            and len(checks) == MANDATORY_CHECK_COUNT
            and all(isinstance(check, dict) and type(check.get('exit_code')) is int
                    and check['exit_code'] == 0 for check in checks)
            and all(validation.get(key) is True
                    for key in ('scope_passed', 'spec_unchanged', 'branch_unchanged')))


def _budget_complete(row):
    """Reconcile every actor, including the closed deterministic final report."""
    budget = _mapping(row.get('budget'))
    ledger = _mapping(row.get('ledger'))
    calls = _calls(row)
    actors = _mapping(budget.get('actors'))
    settings = _mapping(_mapping(row.get('conditions')).get('settings'))
    if (budget.get('complete') is not True or budget.get('budget_exhausted') is not False
            or budget.get('unknown_usage') is not False or budget.get('reservations') != {}
            or budget.get('pending_reservations', []) != []
            or ledger.get('complete') is not True or not calls
            or any(not _measured(call) or call.get('actor') not in ACTORS
                   or not _counter(call.get('reasoning_output_tokens'))
                   or call['reasoning_output_tokens'] > call['output_tokens'] for call in calls)):
        return False
    measured = _tokens(calls)
    if not _counter(budget.get('measured_tokens')) or budget['measured_tokens'] != measured:
        return False
    if (not _counter(settings.get('token_budget')) or settings['token_budget'] < 1
            or not _counter(settings.get('max_calls')) or settings['max_calls'] < 1
            or type(budget.get('limit_tokens')) is not int
            or budget['limit_tokens'] != settings['token_budget']
            or type(budget.get('max_calls')) is not int
            or budget['max_calls'] != settings['max_calls']
            or measured > budget['limit_tokens'] or len(calls) > budget['max_calls']):
        return False
    if any(not any(call['actor'] == actor for call in calls) for actor in ('primary', 'reviewer')):
        return False
    if set(actors) != set(ACTORS):
        return False
    for actor in ACTORS:
        evidence = _mapping(actors.get(actor))
        actor_tokens = sum(call['input_tokens'] + call['output_tokens'] for call in calls if call['actor'] == actor)
        if (evidence.get('complete') is not True or not _counter(evidence.get('measured_tokens'))
                or evidence['measured_tokens'] != actor_tokens):
            return False
    reporting = actors['reporting']
    return reporting.get('deterministic') is True and reporting['measured_tokens'] == 0


def _nullable_sum(calls, key):
    values = [call.get(key) if isinstance(call, dict) else None for call in calls]
    return (sum(values) if values and all(type(value) in (int, float)
            and math.isfinite(value) and value >= 0 for value in values) else None)


def compare(runs, expected_repetitions=2):
    if type(expected_repetitions) is not int or expected_repetitions < 2:
        raise ValueError('Predeclare at least two paired repetitions')
    rows = [_mapping(row) for row in runs]
    reasons = []
    by_variant = {variant: [row for row in rows if row.get('variant') == variant] for variant in VARIANTS}
    if any(row.get('variant') not in VARIANTS for row in rows):
        reasons.append('Unknown or missing variant')
    if not all(by_variant.values()) or len(by_variant['baseline']) != len(by_variant['relevant_context']):
        reasons.append('Missing or unbalanced variants')

    conditions = [_without_forecasts(_mapping(row.get('conditions'))) for row in rows]
    if any(any(not condition.get(key) for key in CONDITION_KEYS)
           or type(condition.get('mandatory_check_count')) is not int
           or condition['mandatory_check_count'] != MANDATORY_CHECK_COUNT for condition in conditions):
        reasons.append('Required reproducibility evidence is missing')
    if any(type(condition.get('expected_repetitions')) is not int
           or condition['expected_repetitions'] != expected_repetitions for condition in conditions):
        reasons.append('Supplied repetitions differ from the frozen protocol declaration')
    signatures = [json.dumps(_without_forecasts({key: condition.get(key) for key in CONDITION_KEYS}), sort_keys=True)
                  for condition in conditions]
    if len(set(signatures)) != 1:
        reasons.append('Task, base, model, verifier, code, protocol, accounting or tool conditions differ')
    if any(_mapping(row.get('controls')).get('mode') != 'controller_enforced'
           or any(_mapping(row.get('controls')).get(key) is not True for key in CONTROL_KEYS) for row in rows):
        reasons.append('Executed controller-enforced context, review, repair and shared-budget controls are required')

    repetitions = {variant: [row.get('repetition') for row in selected] for variant, selected in by_variant.items()}
    for variant, values in repetitions.items():
        if any(type(value) is not int or value < 1 for value in values):
            reasons.append('Invalid repetition: ' + variant)
        if len({json.dumps(value, sort_keys=True) for value in values}) != len(values):
            reasons.append('Duplicate repetitions: ' + variant)
    pair_ids = {variant: {json.dumps(value, sort_keys=True) for value in values} for variant, values in repetitions.items()}
    if pair_ids['baseline'] != pair_ids['relevant_context']:
        reasons.append('Repetition pairs differ')
    expected = set(range(1, expected_repetitions + 1))
    if any(any(type(value) is not int for value in values)
           or {value for value in values if type(value) is int} != expected for values in repetitions.values()):
        reasons.append('The predeclared repetitions are incomplete')

    all_calls = [call for row in rows for call in _calls(row)]
    if any(_mapping(row.get('ledger')).get('complete') is not True or not _calls(row) for row in rows):
        reasons.append('Incomplete provider usage')
    if any(not _measured(call) for call in all_calls):
        reasons.append('Unknown, estimated or invalid usage in comparison')
    models = [call.get('model') for call in all_calls if isinstance(call, dict)]
    if (not models or any(not isinstance(model, str) or not model for model in models)
            or len(set(json.dumps(model, sort_keys=True) for model in models)) != 1
            or any(call.get('model') != _mapping(row.get('conditions')).get('model_identity')
                   for row in rows for call in _calls(row) if isinstance(call, dict))):
        reasons.append('Measured model identities differ or are missing')
    if any(not isinstance(call, dict) or type(call.get('cached_tokens')) is not int
           or call['cached_tokens'] != 0 or _mapping(call.get('cache_reset')).get('verified_unloaded') is not True
           for call in all_calls):
        reasons.append('Comparable cold-cache conditions not established')
    if any(not _budget_complete(row) for row in rows):
        reasons.append('Complete reconciled shared-budget usage for primary, reviewer and final reporting is required')
    if any(not _quality_passed(row) for row in rows):
        reasons.append('At least one run failed required quality gates')

    totals = {}
    for variant, selected in by_variant.items():
        calls = [call for row in selected for call in _calls(row)]
        measured = bool(calls) and all(map(_measured, calls))
        successes = sum(_quality_passed(row) for row in selected)
        tokens = _tokens(calls) if measured else None
        per_accepted = tokens / successes if tokens is not None and successes else None
        totals[variant] = {
            'runs': len(selected), 'successes': successes,
            'success_rate': successes / len(selected) if selected else 0,
            'model_calls': len(calls),
            'input_tokens': sum(call['input_tokens'] for call in calls) if measured else None,
            'output_tokens': sum(call['output_tokens'] for call in calls) if measured else None,
            'total_tokens': tokens, 'tokens_per_accepted_task': per_accepted,
            'tokens_per_success': per_accepted,
            'usage_complete': bool(selected) and all(_budget_complete(row) for row in selected),
            'model_latency_ms': _nullable_sum(calls, 'latency_ms'),
            'estimated_cost_usd': None,
        }
    baseline = totals['baseline']['total_tokens']
    candidate = totals['relevant_context']['total_tokens']
    reduction = 100 * (baseline - candidate) / baseline if baseline and candidate is not None else None
    approved = not reasons and reduction is not None and reduction > 0
    if not reasons and not approved:
        reasons.append('Candidate did not reduce total tokens')
    return {
        'schema_version': 2,
        'comparison': 'controlled internal harness context comparison; baseline means broad context, NOT no harness',
        'expected_repetitions': expected_repetitions, 'variants': totals,
        'measured_total_token_reduction_percent': reduction,
        'observed_total_token_change_percent': -reduction if reduction is not None else None,
        'token_savings_claim_supported': approved,
        'accepted_savings_percent': reduction if approved else None,
        'blocking_reasons': reasons, 'hosted_cost_savings': None,
        'scope': 'These results describe only the recorded controlled local model runs on Task Set A. Failed runs and rejected, failed, retry, retrieval, repair and reviewer calls remain in consumption. No claim about unseen tasks, teaching quality, ChatGPT usage or hosted invoices.',
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('runs', nargs='+')
    parser.add_argument('--out', required=True)
    parser.add_argument('--expected-repetitions', type=int, default=2)
    args = parser.parse_args()
    report = compare([json.loads(Path(path).read_text()) for path in args.runs], args.expected_repetitions)
    Path(args.out).write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps(report, indent=2))


if __name__ == '__main__':
    main()
