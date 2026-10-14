"""Legacy internal comparison of broad/relevant context, NOT a no-harness baseline."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import time

import coding_task
from coding_comparison import compare
from ollama_adapter import OllamaAdapter


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def benchmark(repository, base, work, out, store):
    repository, work, out, store = [Path(p).resolve() for p in (repository, work, out, store)]
    harness = Path(__file__).resolve().parent
    task = json.loads((harness / 'coding-task-set-a.json').read_text())
    if out.exists():
        raise ValueError('Use a new evidence directory; previous runs are immutable.')
    work.mkdir(parents=True, exist_ok=True)
    out.mkdir(parents=True)
    frozen = out / 'frozen'
    frozen.mkdir()
    # Freeze the complete executable harness and task inputs before generation.
    for source in harness.iterdir():
        if source.is_file() and source.suffix in ('.py', '.mjs', '.json', '.md'):
            shutil.copy2(source, frozen / source.name)
    model_identity = OllamaAdapter().identity(task['settings']['model'])
    versions = {}
    for name, argv in [('node', ['node', '--version']), ('pnpm', ['pnpm', '--version']), ('func', ['func', '--version']), ('java', ['java', '-version'])]:
        result = subprocess.run(argv, capture_output=True, text=True, check=True)
        versions[name] = (result.stdout + result.stderr).strip()
    versions['mongodb'] = '7.0.24 (preinstalled local test fixture binary)'
    order = [('baseline', 1), ('relevant_context', 1), ('relevant_context', 2), ('baseline', 2)]
    protocol = {'task_id': task['id'], 'base_commit': base, 'model_identity': model_identity,
                'settings': task['settings'], 'order': order, 'tool_versions': versions,
                'prompt_sha256': sha(frozen / 'task-set-a-prompt.md'),
                'spec_sha256': hashlib.sha256(subprocess.check_output(['git', '-C', str(repository), 'show', base + ':' + task['spec']])).hexdigest(),
                'source_hashes': {p.name: sha(p) for p in frozen.iterdir() if p.suffix in ('.py', '.mjs', '.json', '.md')},
                'comparison_rule': 'This is NOT no harness. Only initial source inclusion differs. All cold generation calls, retrieval requests and repairs count. Every run must pass all fixed checks before a savings claim.',
                'started_at': time.time()}
    coding_task.write_json(out / 'protocol.json', protocol)
    conditions = {k: protocol[k] for k in ('prompt_sha256', 'spec_sha256', 'base_commit', 'model_identity', 'settings', 'tool_versions')}
    conditions.update(verification_sha256=sha(frozen / 'course_acceptance.mjs'), agent_sha256=sha(frozen / 'coding_agent.py'), runner_sha256=sha(frozen / 'coding_task.py'))
    rows = []
    for variant, repetition in order:
        name = ('baseline' if variant == 'baseline' else 'optimized') + '-' + str(repetition)
        repo = work / name
        if not repo.exists():
            subprocess.run(['git', 'clone', '--no-hardlinks', '--quiet', str(repository), str(repo)], check=True)
            subprocess.run(['git', '-C', str(repo), 'switch', '-c', 'harness/v7-' + name, base], check=True, capture_output=True)
        if coding_task.git(repo, 'rev-parse', 'HEAD').strip() != base or coding_task.git(repo, 'status', '--porcelain'):
            raise ValueError('Prepared checkout does not match the clean fixed base: ' + str(repo))
        setup = coding_task.command(['pnpm', 'install', '--offline', '--frozen-lockfile', '--ignore-scripts', '--store-dir', str(store)], repo, out / (name + '-install.log'), 180)
        if setup['exit_code']:
            raise ValueError('Offline dependency restoration failed; inspect ' + name + '-install.log')
        selected = json.loads(json.dumps(task))
        selected['prompt_file'] = str(frozen / 'task-set-a-prompt.md')
        selected['verification_files'] = [str(frozen / 'course_acceptance.mjs')]
        selected['agent_command'] = ['python3', '-B', str(frozen / 'coding_agent.py'), '--variant', variant]
        task_path = out / (name + '-task.json')
        coding_task.write_json(task_path, selected)
        run = out / name
        # Execute the same frozen runner that produced the manifest.
        subprocess.run(['python3', '-B', str(frozen / 'coding_task.py'), 'begin', '--repo', str(repo), '--task', str(task_path), '--out', str(run)], check=True, stdout=subprocess.DEVNULL)
        print('Starting ' + name, flush=True)
        with (out / (name + '-execute.log')).open('w') as log:
            subprocess.run(['python3', '-B', str(frozen / 'coding_task.py'), 'execute', str(run)], stdout=log, stderr=subprocess.STDOUT)
        ledger_path = run / 'provider-usage.json'
        ledger = json.loads(ledger_path.read_text()) if ledger_path.exists() else {'complete': False, 'calls': []}
        args = ['python3', '-B', str(frozen / 'coding_task.py'), 'check', str(run)]
        if ledger.get('complete') and ledger.get('calls'):
            args += ['--usage', str(ledger_path)]
        with (out / (name + '-check.log')).open('w') as log:
            subprocess.run(args, stdout=log, stderr=subprocess.STDOUT)
        result_path = run / 'result.json'
        result = json.loads(result_path.read_text()) if result_path.exists() else {'passed': False, 'error': 'validation did not complete'}
        row = {'variant': variant, 'repetition': repetition, 'conditions': conditions, 'quality_passed': result['passed'],
               'ledger': ledger, 'result': result, 'run_directory': str(run), 'repository': str(repo)}
        coding_task.write_json(out / (name + '-comparison.json'), row)
        rows.append(row)
        coding_task.write_json(out / 'comparison.json', compare(rows))
        print(json.dumps({'run': name, 'quality_passed': result['passed'], 'model_calls': len(ledger['calls'])}), flush=True)
    report = compare(rows)
    coding_task.write_json(out / 'comparison.json', report)
    return report


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--repository', required=True)
    parser.add_argument('--base', required=True)
    parser.add_argument('--work', required=True)
    parser.add_argument('--out', required=True)
    parser.add_argument('--store', required=True)
    args = parser.parse_args()
    print(json.dumps(benchmark(args.repository, args.base, args.work, args.out, args.store), indent=2))
