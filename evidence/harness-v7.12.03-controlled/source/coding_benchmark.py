"""Predeclared paired trials using the controlled workflow; never a no-harness claim."""
import argparse
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import sys
import time

import coding_task
from coding_comparison import compare
from ollama_adapter import OllamaAdapter


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def benchmark(repository, base, work, out, store, repetitions=2):
    if type(repetitions) is not int or repetitions < 2:
        raise ValueError('Predeclare at least two paired repetitions before running a benchmark.')
    repository, work, out, store = [Path(p).resolve() for p in (repository, work, out, store)]
    base = coding_task.git(repository, 'rev-parse', '--verify', base + '^{commit}').strip()
    harness = Path(__file__).resolve().parent
    task = json.loads((harness / 'coding-task-set-a.json').read_text())
    if out.exists():
        raise ValueError('Use a new evidence directory; previous trials and failed attempts are immutable.')
    work.mkdir(parents=True, exist_ok=True); out.mkdir(parents=True)
    frozen = out / 'frozen'; frozen.mkdir()
    for source in harness.iterdir():
        if source.is_file() and source.suffix in ('.py', '.mjs', '.json', '.md'):
            shutil.copy2(source, frozen / source.name)
    model_identity = OllamaAdapter().identity(task['settings']['model'])
    order = [(variant, repetition) for repetition in range(1, repetitions + 1)
             for variant in (('baseline', 'relevant_context') if repetition % 2 else ('relevant_context', 'baseline'))]
    protocol = {'task_id': task['id'], 'base_commit': base, 'model_identity': model_identity,
                'settings': task['settings'], 'order': order, 'expected_repetitions': repetitions,
                'source_hashes': {p.name: sha(p) for p in frozen.iterdir()},
                'controller_entrypoint': 'run_task_a.py finish --execute',
                'comparison_rule': 'Broad/relevant context only; identical quality gates and all-actor budgets. All attempts count. Forecasts never score. Not a no-harness or cross-model comparison.',
                'started_at': time.time()}
    coding_task.write_json(out / 'protocol.json', protocol)
    rows = []
    for variant, repetition in order:
        name = variant + '-' + str(repetition); repo = work / name
        if not repo.exists():
            subprocess.run(['git', 'clone', '--no-hardlinks', '--quiet', str(repository), str(repo)], check=True)
            subprocess.run(['git', '-C', str(repo), 'switch', '-c', 'harness/controlled-' + name, base], check=True, capture_output=True)
        if coding_task.git(repo, 'rev-parse', 'HEAD').strip() != base or coding_task.git(repo, 'status', '--porcelain'):
            raise ValueError('Prepared checkout does not match the clean fixed base: ' + str(repo))
        setup = coding_task.command(['pnpm', 'install', '--offline', '--frozen-lockfile', '--ignore-scripts', '--store-dir', str(store)], repo, out / (name + '-install.log'), 180)
        if setup['exit_code']:
            raise ValueError('Offline dependency restoration failed before model work; inspect ' + name + '-install.log')
        evidence = out / name; branch = coding_task.git(repo, 'branch', '--show-current').strip()
        prepare = [sys.executable, '-B', str(frozen / 'run_task_a.py'), 'prepare', '--repo', str(repo),
                   '--base', base, '--branch', branch, '--evidence', str(evidence), '--context-variant', variant,
                   '--repetition', str(repetition), '--expected-repetitions', str(repetitions)]
        with (out / (name + '-prepare.log')).open('w') as log:
            subprocess.run(prepare, stdout=log, stderr=subprocess.STDOUT, check=True)
        with (out / (name + '-finish.log')).open('w') as log:
            subprocess.run([sys.executable, '-B', str(frozen / 'run_task_a.py'), 'finish', '--execute', '--evidence', str(evidence)], stdout=log, stderr=subprocess.STDOUT)
        record = evidence / 'comparison-record.json'
        row = json.loads(record.read_text()) if record.is_file() else {
            'variant': variant, 'repetition': repetition, 'conditions': {}, 'quality_passed': False,
            'ledger': {'complete': False, 'calls': []}, 'error': 'Controlled workflow did not complete.'}
        row.update(run_directory=str(evidence), repository=str(repo))
        coding_task.write_json(out / (name + '-comparison.json'), row); rows.append(row)
        coding_task.write_json(out / 'comparison.json', compare(rows, repetitions))
        print(json.dumps({'run': name, 'quality_passed': row['quality_passed'], 'model_calls': len(row['ledger']['calls'])}), flush=True)
    report = compare(rows, repetitions)
    coding_task.write_json(out / 'comparison.json', report)
    return report


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    for name in ('repository', 'base', 'work', 'out', 'store'):
        parser.add_argument('--' + name, required=True)
    parser.add_argument('--repetitions', type=int, default=2)
    args = parser.parse_args()
    print(json.dumps(benchmark(args.repository, args.base, args.work, args.out, args.store, args.repetitions), indent=2))
