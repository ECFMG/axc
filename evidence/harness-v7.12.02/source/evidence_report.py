"""Fill the supplied evaluation template and package hashed local evidence."""
import hashlib
import json
from pathlib import Path
import zipfile
from usage_accounting import provider_usage, estimated_cost


def write(path, value):
    Path(path).write_text(json.dumps(value, indent=2) + '\n')


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
    write(root / 'projection.json', trial.get('projection', {}))
    cost = estimated_cost(recorded, rates) if rates else {'estimated_usd': None, 'kind': 'rates not supplied; actual cost unmeasured'}
    write(root / 'cost-estimate.json', cost)
    counts = recorded['measured_usage']
    checks = result.get('checks', [])
    passed = sum(row['exit_code'] == 0 for row in checks)
    values = {'Team': 'OpenAI', 'Developer / Operator': trial.get('operator') or 'Not recorded',
              'Harness': task.get('version', 'Unknown') + ('; verification only' if trial.get('label') == 'no_harness' else '; native-host context/verification' if trial.get('execution') == 'external_host' else '; guarded coding adapter'),
              'Model': recorded.get('model') or (result.get('usage', {}).get('calls') or [{}])[0].get('model') or task['settings']['model'] + ' (configured; see ledger for verified identity)',
              'License / Plan': 'Not recorded', 'Codebase': 'ECFMG/axc', 'Task Set': task['id'],
              'Run Type': trial.get('label', 'Unknown') + '; repetition ' + str(trial.get('repetition', 1)),
              'Harness Engineering Used': 'Concurrent preflight; stateless focused context with paged inventory; guarded write batches; focused build/unit repair checks then mandatory final gates; bounded fresh-context review packet; one-command evidence and original-turn recovery.',
              'Config / Diff Notes': 'Fixed task/specification and independent oracle preserved. Source/check results in run/. Projected tokens: ' + str(trial.get('projection', {}).get('total_tokens')) + ' (estimate only).',
              'Branch / Commit': str(result.get('branch', trial.get('identity', {}).get('branch'))) + '; base ' + str(result.get('base_commit', trial.get('identity', {}).get('base_commit'))),
              'Requirements Completed / Attempted': 'Final validators passed; inspect acceptance evidence for coverage.' if result.get('passed') else 'Not established; see outstanding checks.',
              'Acceptance Criteria Passed / Total': 'Not independently totaled; see independent endpoint validator logs.',
              'Tests Passed / Failed': str(passed) + '/' + str(len(checks)) + ' validation commands passed (not individual test cases).',
              'Static Analysis / Security Findings': 'See lint/typecheck/architecture logs. No dedicated security audit inferred.',
              'Input Tokens': counts.get('input_tokens'), 'Cached Tokens': counts.get('cached_input_tokens'),
              'Output Tokens': str(counts.get('output_tokens')) + '; included reasoning output: ' + str(counts.get('reasoning_output_tokens')),
              'Total Tokens or Credits Used': str(counts.get('total_tokens')) + '; complete=' + str(recorded['complete']) + '; missing=' + str(recorded['missing_usage']),
              'Estimated Cost': 'USD ' + str(cost.get('estimated_usd')) + '; calculated estimate, actual billing unmeasured',
              'Elapsed Time': str(result.get('elapsed_seconds')) + ' seconds through validation; unavailable if not yet checked',
              'Number of Human Interventions / Redirects': trial.get('human_interventions', 'Not recorded'),
              'Recommendation': 'Continue' if result.get('passed') else 'Remediate'}
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
    (root / 'evaluation-run-record.md').write_text('\n'.join(lines) + '\n')
    return {'report': str(root / 'evaluation-run-record.md'), 'usage_complete': recorded['complete'],
            'measured_total_tokens': counts.get('total_tokens'), 'estimated_cost_usd': cost.get('estimated_usd')}


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
