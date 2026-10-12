"""Prepare, execute and score fresh Task A trials; no-harness execution is external."""
import argparse
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import sys


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def prepare(repo, out, no_harness=False, repetition=1):
    repo, out = Path(repo).resolve(), Path(out).resolve()
    source = Path(__file__).resolve().parent
    if out.exists() or out == repo or repo in out.parents:
        raise ValueError('Use a fresh evidence directory outside the target repository')
    if repetition < 1:
        raise ValueError('Repetition must be positive')
    task = json.loads((source / 'coding-task-set-a.json').read_text())
    if sha(repo / task['spec']) != sha(source / 'task-set-a-requirements.md'):
        raise ValueError('Repository Task A requirements differ from the packaged fixed requirements')
    if subprocess.check_output(['git', '-C', str(repo), 'status', '--porcelain']).strip():
        raise ValueError('Prepare a clean isolated checkout before this command')
    out.mkdir(parents=True)
    frozen = out / 'frozen'
    frozen.mkdir()
    for p in source.iterdir():
        if p.is_file() and p.suffix in ('.py', '.mjs', '.json', '.md'):
            shutil.copy2(p, frozen / p.name)
    task['prompt_file'] = str(frozen / 'task-set-a-prompt.md')
    task['verification_files'] = [str(frozen / Path(n).name) for n in task['verification_files']]
    if no_harness:
        task.pop('agent_command', None)
    else:
        task['agent_command'] = [sys.executable, '-B', str(frozen / 'coding_agent.py'), '--variant', 'relevant_context']
    definition = out / 'task-definition.json'
    definition.write_text(json.dumps(task, indent=2) + '\n')
    run = out / 'run'
    subprocess.run([sys.executable, '-B', str(frozen / 'coding_task.py'), 'begin', '--repo', str(repo),
                    '--task', str(definition), '--out', str(run)], check=True)
    tools = {}
    for name, argv in [('node', ['node', '--version']), ('pnpm', ['pnpm', '--version']),
                       ('func', ['func', '--version']), ('java', ['java', '-version'])]:
        try:
            r = subprocess.run(argv, cwd=repo, capture_output=True, text=True, timeout=15)
            tools[name] = (r.stdout + r.stderr).strip() if r.returncode == 0 else None
        except (OSError, subprocess.TimeoutExpired):
            tools[name] = None
    metadata = {'label': 'no_harness' if no_harness else task['version'], 'repetition': repetition,
                'execution': 'external_no_harness' if no_harness else 'version_adapter', 'tool_versions': tools,
                'settings': task['settings'], 'cache_policy': 'cold',
                'source_hashes': {p.name: sha(p) for p in frozen.iterdir() if p.suffix in ('.py', '.mjs')},
                'acceptance_sha256': hashlib.sha256(json.dumps({Path(n).name: sha(n) for n in task['verification_files']}, sort_keys=True).encode()).hexdigest()}
    (out / 'trial.json').write_text(json.dumps(metadata, indent=2) + '\n')
    return {'run': str(run), 'label': metadata['label'], 'next': 'Execute Task A externally with only its original prompt/requirements.' if no_harness else 'Run execute --evidence ' + str(out)}


def execute(out):
    out = Path(out).resolve()
    meta = json.loads((out / 'trial.json').read_text())
    if meta['label'] == 'no_harness':
        raise ValueError('No-harness execution must occur externally; do not invoke the version adapter')
    return subprocess.run([sys.executable, '-B', str(out / 'frozen/coding_task.py'), 'execute', str(out / 'run')]).returncode


def check(out, usage_file=None):
    out = Path(out).resolve()
    meta = json.loads((out / 'trial.json').read_text())
    run = out / 'run'
    ledger_path = Path(usage_file).resolve() if usage_file else run / 'provider-usage.json'
    argv = [sys.executable, '-B', str(out / 'frozen/coding_task.py'), 'check', str(run)]
    if ledger_path.is_file():
        argv += ['--usage', str(ledger_path)]
    completed = subprocess.run(argv, check=False)
    if completed.returncode not in (0, 1):
        raise ValueError('Evaluation failed to produce a fresh valid result; no comparison record written')
    result = json.loads((run / 'result.json').read_text())
    ledger = json.loads(ledger_path.read_text()) if ledger_path.is_file() else {'complete': False, 'calls': []}
    models = {c.get('model') for c in ledger.get('calls', [])}
    identity = next(iter(models)) if len(models) == 1 else None
    conditions = {k: result[k] for k in ('prompt_sha256', 'spec_sha256', 'base_commit')}
    conditions.update(model_identity=identity, acceptance_sha256=meta['acceptance_sha256'],
                      tool_versions=meta['tool_versions'], settings=meta['settings'], cache_policy=meta['cache_policy'])
    quality = result['passed'] and bool(result['checks'])
    record = {'label': meta['label'], 'repetition': meta['repetition'], 'execution': meta['execution'],
              'conditions': conditions, 'quality_passed': quality, 'ledger': ledger,
              'source_hashes': meta['source_hashes'], 'result': str(run / 'result.json')}
    (out / 'comparison-record.json').write_text(json.dumps(record, indent=2) + '\n')
    return {'passed': quality, 'record': str(out / 'comparison-record.json'), 'usage_status': result['usage']['status']}


def commit(out, preserve_failed_baseline=False):
    out = Path(out).resolve()
    argv = [sys.executable, '-B', str(out / 'frozen/coding_task.py'), 'commit', str(out / 'run')]
    if preserve_failed_baseline:
        argv.append('--preserve-failed-baseline')
    return subprocess.run(argv).returncode


if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__)
    commands = p.add_subparsers(dest='command', required=True)
    b = commands.add_parser('prepare')
    b.add_argument('--repo', required=True); b.add_argument('--evidence', required=True)
    b.add_argument('--no-harness', action='store_true'); b.add_argument('--repetition', type=int, default=1)
    e = commands.add_parser('execute'); e.add_argument('--evidence', required=True)
    c = commands.add_parser('check'); c.add_argument('--evidence', required=True); c.add_argument('--usage')
    s = commands.add_parser('commit'); s.add_argument('--evidence', required=True)
    s.add_argument('--preserve-failed-baseline', action='store_true')
    a = p.parse_args()
    try:
        if a.command == 'prepare':
            print(json.dumps(prepare(a.repo, a.evidence, a.no_harness, a.repetition), indent=2))
        elif a.command == 'execute':
            raise SystemExit(execute(a.evidence))
        elif a.command == 'commit':
            raise SystemExit(commit(a.evidence, a.preserve_failed_baseline))
        else:
            result = check(a.evidence, a.usage)
            print(json.dumps(result, indent=2)); raise SystemExit(0 if result['passed'] else 1)
    except (ValueError, OSError, subprocess.SubprocessError) as error:
        p.exit(2, str(error) + '\n')
