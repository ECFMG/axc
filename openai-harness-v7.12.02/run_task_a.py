"""Prepare, execute and score fresh Task A trials; no-harness execution is external."""
import argparse
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import sys
import datetime
import re

from workflow_setup import identity, preflight, runtime_preflight
from usage_accounting import codex_usage, codex_sessions, provider_usage
from coding_workflow import projection, finish, recover, review_packet, repair
from evidence_report import report, package, export_report


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def prepare(repo, out, no_harness=False, repetition=1, base=None, branch=None, allow_unready=False, projected_tokens=None, projection_assumptions=None, operator=None, expected_calls=None, input_tokens_per_call=None, output_tokens_per_call=None, external=False, context_variant='relevant_context', expected_repetitions=2):
    repo, out = Path(repo).resolve(), Path(out).resolve()
    source = Path(__file__).resolve().parent
    if out.exists() or out == repo or repo in out.parents:
        raise ValueError('Use a fresh evidence directory outside the target repository')
    if type(expected_repetitions) is not int or expected_repetitions < 2 or not 1 <= repetition <= expected_repetitions:
        raise ValueError('Predeclare at least two repetitions; current repetition must be within that range.')
    if context_variant not in ('baseline', 'relevant_context'):
        raise ValueError('Unknown context variant.')
    if no_harness and external:
        raise ValueError('External host harness and no-harness control are separate execution modes.')
    declared = identity(repo, base, branch)
    forecast = projection(projected_tokens, expected_calls, input_tokens_per_call, output_tokens_per_call, projection_assumptions)
    forecast['recorded_at'] = datetime.datetime.now(datetime.timezone.utc).isoformat()
    task = json.loads((source / 'coding-task-set-a.json').read_text())
    if sha(repo / task['spec']) != sha(source / 'task-set-a-requirements.md'):
        raise ValueError('Repository Task A requirements differ from the packaged fixed requirements')
    if subprocess.check_output(['git', '-C', str(repo), 'status', '--porcelain']).strip():
        raise ValueError('Prepare a clean isolated checkout before this command')
    out.mkdir(parents=True)
    environment = preflight(repo, base, branch, out / 'preflight')
    if not environment['passed'] and not allow_unready:
        raise ValueError('Environment preflight failed; inspect ' + str(out / 'preflight/preflight.json') + '. Fix prerequisites and use a fresh evidence directory.')
    if task.get('runtime_preflight_required') and environment['passed']:
        readiness = runtime_preflight(repo, base, branch, out / 'runtime-preflight')
        environment['runtime_preflight'] = readiness
        environment['passed'] = readiness['passed']
        if not readiness['passed'] and not allow_unready:
            raise ValueError('Baseline runtime preflight failed before model dispatch; fix prerequisites and use fresh evidence.')
    task['execution_environment'] = environment
    task['projection'] = forecast
    frozen = out / 'frozen'
    frozen.mkdir()
    for p in source.iterdir():
        if p.is_file() and p.suffix in ('.py', '.mjs', '.json', '.md'):
            shutil.copy2(p, frozen / p.name)
    task['prompt_file'] = str(frozen / 'task-set-a-prompt.md')
    task['verification_files'] = [str(frozen / Path(n).name) for n in task['verification_files']]
    if no_harness or external:
        task.pop('agent_command', None)
    else:
        task['agent_command'] = [sys.executable, '-B', str(frozen / 'coding_agent.py'), '--variant', context_variant]
    definition = out / 'task-definition.json'
    definition.write_text(json.dumps(task, indent=2) + '\n')
    run = out / 'run'
    with (out / 'prepare-driver.log').open('w') as log:
        subprocess.run([sys.executable, '-B', str(frozen / 'coding_task.py'), 'begin', '--repo', str(repo),
                        '--task', str(definition), '--out', str(run)], stdout=log, stderr=subprocess.STDOUT, check=True)
    tools = {row['name']: row.get('summary') if row['passed'] else None for row in environment['checks'] if 'argv' in row}
    metadata = {'label': 'no_harness' if no_harness else task['version'], 'repetition': repetition,
                'execution': 'external_no_harness' if no_harness else 'external_host' if external else 'version_adapter', 'tool_versions': tools,
                'settings': task['settings'], 'cache_policy': 'cold',
                'report_template_sha256': sha(frozen / 'EVALUATION_RUN_RECORD_TEMPLATE.md'),
                'identity': declared, 'environment_ready': environment['passed'], 'operator': operator,
                'projection': forecast,
                'source_hashes': {p.name: sha(p) for p in frozen.iterdir() if p.suffix in ('.py', '.mjs')},
                'acceptance_sha256': hashlib.sha256(json.dumps({Path(n).name: sha(n) for n in task['verification_files']}, sort_keys=True).encode()).hexdigest()}
    from controlled_workflow import SCOPE
    protocol = {'expected_repetitions': expected_repetitions, 'base_commit': declared['base_commit'],
                'prompt_sha256': sha(frozen / 'task-set-a-prompt.md'), 'spec_sha256': sha(frozen / 'task-set-a-requirements.md'),
                'settings': task['settings'], 'tool_versions': tools, 'accounting_scope': SCOPE,
                'task_contract_sha256': sha(frozen / 'coding-task-set-a.json'),
                'verification_sha256': metadata['acceptance_sha256'], 'source_hashes': metadata['source_hashes']}
    protocol_bytes = json.dumps(protocol, sort_keys=True).encode()
    metadata.update(context_variant=context_variant, expected_repetitions=expected_repetitions,
                    protocol_sha256=hashlib.sha256(protocol_bytes).hexdigest(),
                    task_contract_sha256=protocol['task_contract_sha256'],
                    control_mode='external_advisory' if no_harness or external else 'controller_enforced')
    (out / 'protocol.json').write_text(json.dumps(protocol, indent=2) + '\n')
    (out / 'trial.json').write_text(json.dumps(metadata, indent=2) + '\n')
    return {'run': str(run), 'label': metadata['label'], 'next': 'Execute Task A externally with only its original prompt/requirements.' if no_harness else ('Use host-context, implement externally, then finish --evidence ' if external else 'Run execute --evidence ') + str(out)}


def execute(out):
    out = Path(out).resolve()
    meta = json.loads((out / 'trial.json').read_text())
    if not meta.get('environment_ready'):
        raise ValueError('Execution blocked: environment preflight did not pass. Prepare a fresh ready run.')
    if meta['execution'] in ('external_no_harness', 'external_host'):
        raise ValueError('External execution must occur in the host; do not invoke the version adapter')
    return subprocess.run([sys.executable, '-B', str(out / 'frozen/coding_task.py'), 'execute', str(out / 'run')]).returncode


def check(out, usage_file=None, codex_log=None, turn_id=None, rates=None, subagents=()):
    out = Path(out).resolve()
    meta = json.loads((out / 'trial.json').read_text())
    run = out / 'run'
    ledger_path = Path(usage_file).resolve() if usage_file else run / 'provider-usage.json'
    argv = [sys.executable, '-B', str(out / 'frozen/coding_task.py'), 'check', str(run)]
    supplied = json.loads(ledger_path.read_text()) if ledger_path.is_file() else {'complete': False, 'calls': []}
    if supplied.get('complete') and supplied.get('calls'):
        argv += ['--usage', str(ledger_path)]
    number = len(list(run.glob('validation-*'))) + 1
    with (out / ('check-driver-%03d.log' % number)).open('w') as log:
        completed = subprocess.run(argv, check=False, stdout=log, stderr=subprocess.STDOUT)
    if completed.returncode not in (0, 1):
        raise ValueError('Evaluation failed; inspect check-driver-%03d.log; no comparison record written' % number)
    result = json.loads((run / 'result.json').read_text())
    return record_result(out, usage_file, codex_log, turn_id, rates, subagents)


def record_result(out, usage_file=None, codex_log=None, turn_id=None, rates=None, subagents=()):
    from controlled_workflow import required, shared_budget, export_ledger, execution_evidence, SCOPE
    out = Path(out).resolve(); run = out / 'run'
    meta = json.loads((out / 'trial.json').read_text())
    result = json.loads((run / 'result.json').read_text())
    _, frozen_task = __import__('coding_task').load(run)
    if required(frozen_task) and meta.get('execution') == 'version_adapter' and codex_log:
        raise ValueError('Controlled adapter reporting uses its shared provider ledger; native Codex usage belongs to external-host mode.')
    ledger_path = Path(usage_file).resolve() if usage_file else run / 'provider-usage.json'
    budget = None
    if required(frozen_task) and meta.get('execution') == 'version_adapter' and (run / 'shared-budget.json').exists():
        budget = shared_budget(run, frozen_task['settings'])
        budget.reopen_actor('reporting')
        ledger = export_ledger(run)
    else:
        ledger = json.loads(ledger_path.read_text()) if ledger_path.is_file() else {'complete': False, 'calls': []}
    recorded = None

    def render(ledger):
        if budget is not None:
            counts = provider_usage(ledger)
            measured = counts['measured_usage']
            result['usage'] = {'status': 'provider_reported' if counts['complete'] else 'incomplete',
                               'complete': counts['complete'], 'calls': ledger['calls'],
                               'model_calls': len(ledger['calls']),
                               'input_tokens': measured['input_tokens'],
                               'output_tokens': measured['output_tokens'],
                               'cached_tokens': measured['cached_input_tokens'],
                               'total_tokens': measured['total_tokens'], 'estimated_cost_usd': None}
            (run / 'result.json').write_text(json.dumps(result, indent=2) + '\n')
            validation_results = sorted(run.glob('validation-*/result.json'))
            if validation_results:
                validation_results[-1].write_text(json.dumps(result, indent=2) + '\n')
            local_report = run / 'report.md'
            if local_report.is_file():
                text = re.sub(r'^Usage: .*$', 'Usage: ' + result['usage']['status'] + '. Total tokens: ' + str(measured['total_tokens']) + '.', local_report.read_text(), flags=re.MULTILINE)
                local_report.write_text(text)
        models = {c.get('model') for c in ledger.get('calls', [])}
        model_identity = next(iter(models)) if len(models) == 1 else None
        conditions = {k: result[k] for k in ('prompt_sha256', 'spec_sha256', 'base_commit')}
        conditions.update(model_identity=model_identity, acceptance_sha256=meta['acceptance_sha256'],
                          verification_sha256=meta['acceptance_sha256'],
                          agent_sha256=meta['source_hashes'].get('coding_agent.py'),
                          runner_sha256=meta['source_hashes'].get('coding_task.py'),
                          tool_versions=meta['tool_versions'], settings=meta['settings'], cache_policy=meta['cache_policy'],
                          accounting_scope=SCOPE, protocol_sha256=meta.get('protocol_sha256'),
                          task_contract_sha256=meta.get('task_contract_sha256'), mandatory_check_count=8, expected_repetitions=meta.get('expected_repetitions'))
        status = json.loads((out / 'finish-status.json').read_text()) if (out / 'finish-status.json').is_file() else {}
        validation_passed = not status.get('execution_error') and result['passed'] and bool(result['checks']) and frozen_task.get('execution_environment', {}).get('passed', False)
        evidence = execution_evidence(out, result, meta) if required(frozen_task) else {}
        quality = bool(validation_passed and (not required(frozen_task) or evidence['controlled_eligible']))
        record = {'label': meta['label'], 'variant': meta.get('context_variant', 'relevant_context'),
                  'repetition': meta['repetition'], 'execution': meta['execution'],
                  'conditions': conditions, 'validation_passed': bool(validation_passed), 'quality_passed': quality,
                  'ledger': ledger, 'source_hashes': meta['source_hashes'], 'result': str(run / 'result.json'), **evidence}
        (out / 'comparison-record.json').write_text(json.dumps(record, indent=2) + '\n')
        (out / 'reported-provider-usage.json').write_text(json.dumps(ledger, indent=2) + '\n')
        summary = report(out, recorded, rates)
        return {'passed': quality, 'validation_passed': bool(validation_passed), 'record': str(out / 'comparison-record.json'),
                'usage_status': result['usage']['status'], **summary,
                'controlled_required': required(frozen_task), 'controlled_eligible': evidence.get('controlled_eligible', False), 'eligibility_reasons': evidence.get('eligibility_reasons', ['Controlled execution not established.'])}

    try:
        recorded = codex_sessions(codex_log, turn_id, subagents) if codex_log else None
        summary = render(ledger)
        if budget is not None:
            # Closing is earned by successful writes; then refresh every view from
            # the closed ledger, without dispatching models or rerunning validation.
            budget.close_actor('reporting', deterministic=True)
            summary = render(export_ledger(run))
        return summary
    except Exception:
        if budget is not None:
            budget.reopen_actor('reporting')
            incomplete = export_ledger(run)
            # Partial outputs must not survive as a finalization receipt.
            for name in ('comparison-record.json', 'reported-provider-usage.json',
                         'report-snapshot.json', 'evaluation-run-record.md', 'usage.json',
                         'efficiency.json', 'projection.json', 'cost-estimate.json'):
                (out / name).unlink(missing_ok=True)
            (run / 'report.md').unlink(missing_ok=True)
            counts = provider_usage(incomplete)['measured_usage']
            result['usage'] = {'status': 'incomplete', 'complete': False,
                               'calls': incomplete['calls'], 'total_tokens': counts['total_tokens']}
            (run / 'result.json').write_text(json.dumps(result, indent=2) + '\n')
            validation_results = sorted(run.glob('validation-*/result.json'))
            if validation_results:
                validation_results[-1].write_text(json.dumps(result, indent=2) + '\n')
        raise


if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__)
    commands = p.add_subparsers(dest='command', required=True)
    b = commands.add_parser('prepare')
    b.add_argument('--repo', required=True); b.add_argument('--evidence', required=True)
    b.add_argument('--base', required=True); b.add_argument('--branch', required=True)
    b.add_argument('--allow-unready-environment', action='store_true', help='Evidence preparation only; execution and a matched quality claim remain blocked.')
    b.add_argument('--projected-tokens', type=int); b.add_argument('--projection-assumptions'); b.add_argument('--operator')
    b.add_argument('--external', action='store_true', help='Native host implementation with harness context/verification; not a no-harness control.')
    b.add_argument('--expected-calls', type=int); b.add_argument('--input-tokens-per-call', type=int); b.add_argument('--output-tokens-per-call', type=int)
    b.add_argument('--context-variant', choices=['baseline', 'relevant_context'], default='relevant_context')
    b.add_argument('--expected-repetitions', type=int, default=2)
    b.add_argument('--no-harness', action='store_true'); b.add_argument('--repetition', type=int, default=1)
    e = commands.add_parser('execute'); e.add_argument('--evidence', required=True)
    c = commands.add_parser('check'); c.add_argument('--evidence', required=True); c.add_argument('--usage')
    c.add_argument('--codex-log'); c.add_argument('--turn-id'); c.add_argument('--rates')
    f = commands.add_parser('preflight')
    f.add_argument('--repo', required=True); f.add_argument('--base', required=True); f.add_argument('--branch', required=True); f.add_argument('--evidence', required=True)
    u = commands.add_parser('record-codex-usage')
    u.add_argument('--log', required=True); u.add_argument('--turn-id', required=True); u.add_argument('--out', required=True)
    q = commands.add_parser('report')
    q.add_argument('--evidence', required=True); q.add_argument('--usage'); q.add_argument('--rates')
    export = commands.add_parser('export-report')
    export.add_argument('--evidence', required=True); export.add_argument('--destination', required=True)
    z = commands.add_parser('package')
    z.add_argument('--evidence', required=True); z.add_argument('--out', required=True)
    c.add_argument('--subagent', nargs=2, action='append', default=[], metavar=('LOG', 'TURN_ID'))
    for name in ('finish', 'recover', 'review-packet', 'host-context', 'repair', 'review'):
        parser = commands.add_parser(name)
        parser.add_argument('--evidence', required=True)
        if name in ('review-packet', 'host-context', 'repair', 'review'):
            if name in ('review-packet', 'review'):
                parser.add_argument('--limit', type=int, default=40000)
            continue
        parser.add_argument('--codex-log', required=name == 'recover')
        parser.add_argument('--turn-id', required=name == 'recover')
        parser.add_argument('--subagent', nargs=2, action='append', default=[], metavar=('LOG', 'TURN_ID'))
        parser.add_argument('--rates'); parser.add_argument('--archive')
        if name == 'finish':
            parser.add_argument('--usage'); parser.add_argument('--execute', action='store_true')
    m = commands.add_parser('efficiency'); m.add_argument('--usage', required=True); m.add_argument('--out')
    a = p.parse_args()
    try:
        if a.command == 'prepare':
            print(json.dumps(prepare(a.repo, a.evidence, a.no_harness, a.repetition, a.base, a.branch, a.allow_unready_environment, a.projected_tokens, a.projection_assumptions, a.operator, a.expected_calls, a.input_tokens_per_call, a.output_tokens_per_call, a.external, a.context_variant, a.expected_repetitions), indent=2))
        elif a.command == 'efficiency':
            from efficiency_metrics import summarize_usage
            summary = summarize_usage(json.loads(Path(a.usage).read_text()))
            if a.out:
                Path(a.out).write_text(json.dumps(summary, indent=2) + '\n')
            print(json.dumps(summary, indent=2))
        elif a.command == 'review':
            from controlled_workflow import review
            result = review(a.evidence, a.limit)
            record_result(a.evidence)
            print(json.dumps(result))
            raise SystemExit(0 if result['passed'] else 1)
        elif a.command == 'repair':
            summary = repair(a.evidence)
            print(json.dumps(summary))
            raise SystemExit(1 if summary['checks_failed'] else 0)
        elif a.command == 'host-context':
            from coding_workflow import host_context
            print(json.dumps(host_context(a.evidence)))
        elif a.command == 'review-packet':
            print(json.dumps(review_packet(a.evidence, a.limit)))
        elif a.command in ('finish', 'recover'):
            rates = json.loads(Path(a.rates).read_text()) if a.rates else None
            if a.command == 'finish':
                result = finish(a.evidence, a.usage, a.codex_log, a.turn_id, rates, a.archive, a.execute, a.subagent)
                print(json.dumps(result)); raise SystemExit(0 if result['passed'] else 1)
            print(json.dumps(recover(a.evidence, a.codex_log, a.turn_id, a.subagent, rates, a.archive)))
        elif a.command == 'execute':
            raise SystemExit(execute(a.evidence))
        elif a.command == 'preflight':
            result = preflight(a.repo, a.base, a.branch, a.evidence)
            print(json.dumps({'passed': result['passed'], 'checks': [{'name': r['name'], 'passed': r['passed']} for r in result['checks']], 'report': str(Path(a.evidence) / 'preflight.json')}, indent=2))
            raise SystemExit(0 if result['passed'] else 1)
        elif a.command == 'record-codex-usage':
            result = codex_usage(a.log, a.turn_id)
            Path(a.out).write_text(json.dumps(result, indent=2) + '\n')
            print(json.dumps({'complete': result['complete'], 'missing_usage': result['missing_usage'], 'out': a.out}))
        elif a.command == 'report':
            recorded = json.loads(Path(a.usage).read_text()) if a.usage else None
            rates = json.loads(Path(a.rates).read_text()) if a.rates else None
            print(json.dumps(report(a.evidence, recorded, rates), indent=2))
        elif a.command == 'export-report':
            print(json.dumps(export_report(a.evidence, a.destination), indent=2))
        elif a.command == 'package':
            print(json.dumps(package(a.evidence, a.out), indent=2))
        else:
            if bool(a.codex_log) != bool(a.turn_id) or (a.subagent and not a.codex_log):
                raise ValueError('Supply both --codex-log and --turn-id.')
            rates = json.loads(Path(a.rates).read_text()) if a.rates else None
            result = check(a.evidence, a.usage, a.codex_log, a.turn_id, rates, a.subagent)
            print(json.dumps(result, indent=2)); raise SystemExit(0 if result['passed'] else 1)
    except (ValueError, OSError, subprocess.SubprocessError) as error:
        p.exit(2, str(error) + '\n')
