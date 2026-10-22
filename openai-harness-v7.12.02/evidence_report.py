"""Fill the supplied evaluation template and package hashed local evidence."""
import hashlib
import json
from pathlib import Path
import zipfile
from usage_accounting import provider_usage, estimated_cost
from efficiency_metrics import summarize_usage


def write(path, value):
    Path(path).write_text(json.dumps(value, indent=2) + '\n')


def report_fingerprints(root):
    """Inputs that must stay unchanged between rendering and explicit export."""
    root = Path(root)
    names = {'trial.json', 'protocol.json', 'finish-status.json', 'comparison-record.json',
             'reported-provider-usage.json', 'run/task.json', 'run/state.json',
             'run/result.json', 'run/provider-usage.json', 'run/shared-budget.json',
             'run/controlled-review.json', 'frozen/EVALUATION_RUN_RECORD_TEMPLATE.md'}
    trial = json.loads((root / 'trial.json').read_text())
    names.update('frozen/' + name for name in trial.get('source_hashes', {}))
    return {name: hashlib.sha256((root / name).read_bytes()).hexdigest()
            if (root / name).is_file() else None for name in sorted(names)}


def report(evidence, recorded=None, rates=None):
    root = Path(evidence).resolve()
    trial = json.loads((root / 'trial.json').read_text())
    task = json.loads((root / 'run/task.json').read_text())
    result = json.loads((root / 'run/result.json').read_text()) if (root / 'run/result.json').exists() else {}
    finish_status = root / 'finish-status.json'
    if finish_status.is_file() and json.loads(finish_status.read_text()).get('execution_error'):
        result = {**result, 'passed': False}
    ledger_path = root / 'run/provider-usage.json'
    ledger = json.loads(ledger_path.read_text()) if ledger_path.exists() else {'complete': False, 'calls': []}
    # check() can supply an external ledger through this frozen copy.
    if (root / 'reported-provider-usage.json').exists():
        ledger = json.loads((root / 'reported-provider-usage.json').read_text())
    recorded = recorded or provider_usage(ledger)
    write(root / 'usage.json', recorded)
    write(root / 'efficiency.json', summarize_usage(recorded))
    write(root / 'projection.json', trial.get('projection', {}))
    cost = estimated_cost(recorded, rates) if rates else {'estimated_usd': None, 'kind': 'rates not supplied; actual cost unmeasured'}
    write(root / 'cost-estimate.json', cost)
    counts = recorded['measured_usage']
    comparison_path = root / 'comparison-record.json'
    comparison = json.loads(comparison_path.read_text()) if comparison_path.exists() else {}
    controlled_required = task.get('controlled_workflow', {}).get('required') is True
    eligible = comparison.get('controlled_eligible') is True
    review_path = root / 'run/controlled-review.json'
    review = json.loads(review_path.read_text()) if review_path.is_file() else {}
    reviewer_calls = [call for call in ledger.get('calls', []) if call.get('actor') == 'reviewer']
    review_executed = bool(reviewer_calls and review.get('model_dispatched') is True)
    review_passed = review_executed and review.get('passed') is True
    eligible = bool(eligible and review_passed and recorded.get('complete') is True) if controlled_required else eligible
    completed = bool(result.get('passed') and (not controlled_required or
                     (eligible and review_passed and recorded.get('complete') is True)))
    snapshot = {'schema_version': 1, 'trial': trial, 'task': task, 'result': result,
                'comparison': comparison, 'review': review, 'usage': recorded,
                'cost': cost, 'completed': completed, 'input_sha256': report_fingerprints(root)}
    checks = result.get('checks', [])
    passed = sum(row['exit_code'] == 0 for row in checks)
    values = {'Team': 'OpenAI', 'Developer / Operator': trial.get('operator') or 'Not recorded',
              'Harness': task.get('version', 'Unknown') + ('; verification only' if trial.get('label') == 'no_harness' else '; native-host context/verification' if trial.get('execution') == 'external_host' else '; guarded coding adapter'),
              'Model': recorded.get('model') or (result.get('usage', {}).get('calls') or [{}])[0].get('model') or task['settings']['model'] + ' (configured; see ledger for verified identity)',
              'License / Plan': 'Not recorded', 'Codebase': 'ECFMG/axc', 'Task Set': task['id'],
              'Run Type': trial.get('label', 'Unknown') + '; repetition ' + str(trial.get('repetition', 1)),
              'Harness Engineering Used': ('Controller receipts: ' + json.dumps(comparison.get('controls', {}), sort_keys=True)) if controlled_required else 'See recorded execution evidence; workflow use is not inferred from reading the archive.',
              'Config / Diff Notes': 'Fixed task/specification and independent oracle preserved. Source/check results in run/. Projected tokens: ' + str(trial.get('projection', {}).get('total_tokens')) + ' (estimate only).',
              'Branch / Commit': str(result.get('branch', trial.get('identity', {}).get('branch'))) + '; base ' + str(result.get('base_commit', trial.get('identity', {}).get('base_commit'))),
              'Requirements Completed / Attempted': 'Final validators passed; inspect acceptance evidence for coverage.' if completed else 'Not established; validation, review or accounting evidence is incomplete.',
              'Acceptance Criteria Passed / Total': 'Not independently totaled; see independent endpoint validator logs.',
              'Tests Passed / Failed': str(passed) + '/' + str(len(checks)) + ' validation commands passed (not individual test cases).',
              'Static Analysis / Security Findings': 'See lint/typecheck/architecture logs. No dedicated security audit inferred.',
              'Input Tokens': counts.get('input_tokens'), 'Cached Tokens': counts.get('cached_input_tokens'),
              'Output Tokens': str(counts.get('output_tokens')) + '; included reasoning output: ' + str(counts.get('reasoning_output_tokens')),
              'Total Tokens or Credits Used': str(counts.get('total_tokens')) + '; complete=' + str(recorded['complete']) + '; missing=' + str(recorded['missing_usage']),
              'Estimated Cost': 'USD ' + str(cost.get('estimated_usd')) + '; calculated estimate, actual billing unmeasured',
              'Elapsed Time': str(result.get('elapsed_seconds')) + ' seconds through validation; unavailable if not yet checked',
              'Number of Human Interventions / Redirects': trial.get('human_interventions', 'Not recorded'),
              'Recommendation': ('Eligible for matched controlled comparison' if eligible else 'Ineligible for controlled savings claims') if controlled_required else ('Continue' if completed else 'Remediate'),
              'Final Rubric Score': 'Not assigned; independent rubric evaluation missing.'}
    if controlled_required:
        models = sorted({str(call.get('model') or 'unknown model') for call in reviewer_calls})
        values['Reviewer'] = ', '.join(models) + '; controller-dispatched fresh review' if review_executed else 'Not executed; evidence missing'
        values['Reviewer Notes'] = json.dumps({'executed': review_executed, 'passed': review_passed,
            'scope_complete': review.get('scope_complete', False), 'findings': review.get('findings', []),
            'missing_evidence': review.get('missing_evidence', []), 'error': review.get('error')}, sort_keys=True)
    template = root / 'frozen/EVALUATION_RUN_RECORD_TEMPLATE.md'
    if template.exists():
        if hashlib.sha256(template.read_bytes()).hexdigest() != trial.get('report_template_sha256'):
            raise ValueError('Frozen evaluation template changed.')
    else:
        template = Path(__file__).with_name('EVALUATION_RUN_RECORD_TEMPLATE.md')
    text = template.read_text()
    lines = []
    for line in text.splitlines():
        cells = [cell.strip() for cell in line.strip().strip('|').split('|')]
        if line.startswith('|') and cells[0] in values:
            value = str(values[cells[0]]).replace('|', '\\|').replace('\n', ' ')
            line = '| ' + cells[0] + ' | ' + value + ' |'
        lines.append(line)
    lines += ['', 'Measured counters and projected estimates are separate. Cached input is included in input; reasoning output is included in output. Unknown counters stay null. No score or savings claim is inferred from passing checks.',
              '', 'Scope: ' + recorded.get('scope', 'See supplied ledger.')]
    if controlled_required:
        lines += ['', 'Controlled comparison eligibility: ' + str(eligible) + '.',
                  'Eligibility blockers: ' + ('; '.join(comparison.get('eligibility_reasons', ['Controlled evidence has not been finalized.'])) or 'None for this run. A matched repeated baseline is still required for savings.'),
                  'Objective: measured token reduction against the frozen measured baseline. Quality and complete shared-budget accounting are mandatory gates; projections never affect efficiency.']
    rendered = ('\n'.join(lines) + '\n').encode('utf-8')
    (root / 'evaluation-run-record.md').write_bytes(rendered)
    snapshot['report_sha256'] = hashlib.sha256(rendered).hexdigest()
    snapshot['output_sha256'] = {name: hashlib.sha256((root / name).read_bytes()).hexdigest()
        for name in ('usage.json', 'efficiency.json', 'projection.json', 'cost-estimate.json')}
    write(root / 'report-snapshot.json', snapshot)
    return {'report': str(root / 'evaluation-run-record.md'), 'usage_complete': recorded['complete'],
            'measured_total_tokens': counts.get('total_tokens'), 'estimated_cost_usd': cost.get('estimated_usd'),
            'efficiency_report': str(root / 'efficiency.json')}


def export_report(evidence, destination):
    """Copy the final report explicitly, without writing in the measured checkout."""
    root = Path(evidence).resolve()
    target = Path(destination).absolute()
    for component in (target, *target.parents):
        if component.is_symlink():
            raise ValueError('Report export rejects symlink targets or parents')
    if not target.parent.is_dir():
        raise ValueError('Report export requires an existing parent directory')
    target = target.resolve()
    if target == root or root in target.parents:
        raise ValueError('Use an external report destination outside the evidence directory')
    state_path = root / 'run/state.json'
    state = json.loads(state_path.read_text()) if state_path.is_file() else {}
    trial = json.loads((root / 'trial.json').read_text())
    repository = state.get('repo') or trial.get('identity', {}).get('repo')
    if not repository:
        raise ValueError('Measured checkout identity is required for report export')
    checkout = Path(repository).resolve()
    if target == checkout or checkout in target.parents:
        raise ValueError('Report export inside the measured checkout would contaminate scope')
    snapshot = json.loads((root / 'report-snapshot.json').read_text())
    if snapshot.get('input_sha256') != report_fingerprints(root):
        raise ValueError('Report snapshot is stale; rerender finalized evidence before export')
    rendered = (root / 'evaluation-run-record.md').read_bytes()
    if hashlib.sha256(rendered).hexdigest() != snapshot.get('report_sha256'):
        raise ValueError('Rendered report changed after finalization')
    for name, expected in snapshot.get('output_sha256', {}).items():
        if hashlib.sha256((root / name).read_bytes()).hexdigest() != expected:
            raise ValueError('Report output changed after finalization: ' + name)
    if target.exists() and not target.is_file():
        raise ValueError('Report destination must be a regular file')
    target.write_bytes(rendered)
    return {'report': str(target), 'sha256': snapshot['report_sha256']}


def package(evidence, archive):
    root, archive = Path(evidence).resolve(), Path(archive).resolve()
    if root == archive or root in archive.parents or archive.exists():
        raise ValueError('Use a new archive path outside the evidence directory.')
    if not (root / 'evaluation-run-record.md').is_file():
        raise ValueError('Generate the evaluation report before packaging.')
    paths = []
    for path in sorted(root.rglob('*')):
        if path.is_symlink():
            raise ValueError('Evidence symlinks are not packaged: ' + str(path))
        if path.is_file() and path != root / 'SHA256SUMS.json':
            paths.append(path)
    hashes = {str(path.relative_to(root)): hashlib.sha256(path.read_bytes()).hexdigest() for path in paths}
    write(root / 'SHA256SUMS.json', hashes)
    archive.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(archive, 'x', compression=zipfile.ZIP_DEFLATED) as stream:
        for path in paths + [root / 'SHA256SUMS.json']:
            stream.write(path, 'evidence/' + str(path.relative_to(root)))
    return {'archive': str(archive), 'files': len(paths), 'sha256': hashlib.sha256(archive.read_bytes()).hexdigest()}
