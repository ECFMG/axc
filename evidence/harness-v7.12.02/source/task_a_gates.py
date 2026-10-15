"""Independent submitted-test execution and API-documentation evidence.

Uses the repository's existing test runners. Unsupported script shapes fail closed.
No filename-only fallback and no dependency or configuration changes.
"""
import argparse
import json
import os
import signal
from pathlib import Path
import re
import shlex
import subprocess
import sys


def changed_paths(repo, base):
    command = lambda args: subprocess.check_output(['git', '-C', str(repo)] + args).decode().split('\0')
    return sorted(set(command(['diff', '--no-renames', '--name-only', '-z', base]) +
                      command(['ls-files', '--others', '--exclude-standard', '-z'])) - {''})


def test_path(name):
    return bool(re.search(r'\.(?:test|spec)\.[cm]?[jt]sx?$', name)) or name.endswith('.feature')


def owner(repo, name):
    directory = (repo / name).parent
    while directory != repo and repo in directory.parents:
        if (directory / 'package.json').is_file():
            return directory
        directory = directory.parent
    return None


def registered_command(package, names, out, index):
    manifest = json.loads((package / 'package.json').read_text())
    scripts = manifest.get('scripts', {})
    relative = {str(Path(name).relative_to(package)) for name in names}
    report = out / ('tests-%02d.json' % index)
    for key, script in scripts.items():
        if key != 'test' and not key.startswith('test:'):
            continue
        args = shlex.split(script)
        if not args or any(x in script for x in ('&&', ';', '|', '$', '`', '\n')):
            continue
        if args[:2] == ['vitest', 'run'] and not any('typecheck.only' in a for a in args):
            return ['pnpm', 'run', key, '--reporter=json', '--outputFile=' + str(report)], report, 'vitest'
        if args[:2] == ['node', '--test']:
            file_args = [a for a in args[2:] if not a.startswith('-')]
            if file_args and not relative.issubset(set(file_args)):
                continue
            reporter = str(Path(__file__).with_name('node_test_reporter.mjs').resolve())
            return ['node', '--test', '--test-reporter=' + reporter,
                    '--test-reporter-destination=' + str(report)] + args[2:], report, 'node'
    raise ValueError('No supported registered runtime test script covers changed tests in ' + str(package))


def parse_evidence(report, kind, names):
    expected = {str(Path(n).resolve()) for n in names}
    records = {n: {'passed_cases': 0, 'failed': False, 'skipped': False, 'discovered': False} for n in expected}
    if kind == 'vitest':
        payload = json.loads(report.read_text())
        for result in payload.get('testResults', []):
            name = str(Path(result.get('name', '')).resolve())
            if name not in records:
                continue
            row = records[name]
            row['discovered'] = True
            assertions = result.get('assertionResults', [])
            row['failed'] |= result.get('status') != 'passed' or not assertions
            for case in assertions:
                row['passed_cases'] += case.get('status') == 'passed'
                row['failed'] |= case.get('status') == 'failed'
                row['skipped'] |= case.get('status') != 'passed'
    else:
        for line in report.read_text().splitlines():
            event = json.loads(line)
            name = str(Path(event.get('file') or '').resolve())
            if name not in records or event.get('suite'):
                continue
            row = records[name]
            row['discovered'] = True
            row['passed_cases'] += event['type'] == 'test:pass' and not event['skipped']
            row['failed'] |= event['type'] == 'test:fail'
            row['skipped'] |= event['skipped']
    for row in records.values():
        row['passed'] = row['discovered'] and row['passed_cases'] > 0 and not row['failed'] and not row['skipped']
    return records


def documentation(repo, changed):
    files = [n for n in changed if n.startswith('apps/docs/') and n.endswith('.md') and (repo / n).is_file()]
    text = '\n'.join((repo / n).read_text() for n in files)
    required = ['/api/courses', 'q', 'modality', 'status', 'tag', 'page', 'pageSize', 'sort',
                'items', 'totalItems', 'totalPages', 'INVALID_QUERY_PARAMETER', 'details']
    missing = [term for term in required if not re.search(r'(?<![\w])' + re.escape(term) + r'(?![\w])', text)]
    return {'passed': bool(files) and not missing, 'files': files, 'missing_terms': missing}


def evaluate(repo, base, out, changed=None, timeout=300):
    repo, out = Path(repo).resolve(), Path(out).resolve()
    if out == repo or repo in out.parents:
        raise ValueError('Evidence must be outside the repository')
    out.mkdir(parents=True, exist_ok=False)
    changed = changed_paths(repo, base) if changed is None else sorted(changed)
    tests = [n for n in changed if test_path(n)]
    groups, errors, executions = {}, [], []
    for name in tests:
        package = owner(repo, name)
        if package is None:
            errors.append({'path': name, 'message': 'Changed test has no registered owning package'})
        else:
            groups.setdefault(package, []).append(repo / name)
    if not tests:
        errors.append({'message': 'No changed submitted tests were found'})
    for index, (package, names) in enumerate(sorted(groups.items())):
        log = out / ('tests-%02d.log' % index)
        try:
            argv, report, kind = registered_command(package, names, out, index)
            with log.open('w') as stream:
                process = subprocess.Popen(argv, cwd=package, stdout=stream, stderr=subprocess.STDOUT, start_new_session=True)
                try:
                    process.wait(timeout=timeout)
                except subprocess.TimeoutExpired:
                    os.killpg(process.pid, signal.SIGKILL)
                    process.wait()
                    raise
                result = process
            evidence = parse_evidence(report, kind, names) if report.is_file() else {}
            passed = result.returncode == 0 and len(evidence) == len(names) and all(r['passed'] for r in evidence.values())
            executions.append({'package': str(package.relative_to(repo)), 'argv': argv, 'exit_code': result.returncode,
                               'files': evidence, 'report': str(report), 'log': str(log), 'passed': passed})
            if not passed:
                errors.append({'paths': [str(n.relative_to(repo)) for n in names], 'message': 'Tests failed, skipped, undiscovered or had zero executed cases'})
        except (ValueError, OSError, subprocess.TimeoutExpired) as error:
            errors.append({'paths': [str(n.relative_to(repo)) for n in names], 'message': str(error)})
    docs = documentation(repo, changed)
    report = {'submitted_tests': tests, 'executions': executions, 'errors': errors, 'documentation': docs,
              'tests_passed': bool(tests) and not errors,
              'passed': bool(tests) and not errors and docs['passed'],
              'limitations': 'Execution evidence does not prove assertion adequacy. Documentation terms do not prove prose correctness. Independent endpoint checks and source review remain required.'}
    (out / 'result.json').write_text(json.dumps(report, indent=2) + '\n')
    return report


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--repo', required=True)
    parser.add_argument('--base', required=True)
    parser.add_argument('--out', required=True)
    args = parser.parse_args()
    try:
        result = evaluate(args.repo, args.base, args.out)
        print(json.dumps(result, indent=2))
        raise SystemExit(0 if result['passed'] else 1)
    except (ValueError, OSError, subprocess.SubprocessError) as error:
        print(json.dumps({'passed': False, 'error': str(error)}))
        raise SystemExit(2)
