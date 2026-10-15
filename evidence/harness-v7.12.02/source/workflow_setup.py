"""Explicit run identity and concurrent, read-only local environment probes."""
import concurrent.futures
import json
from pathlib import Path
import socket
import re
import subprocess
import time


def identity(repo, base, branch):
    repo = Path(repo).resolve()
    if not base or not branch:
        raise ValueError('Specify --repo, --base and --branch before preparing a run.')
    def git(*args):
        return subprocess.check_output(['git', '-C', str(repo), *args], text=True).strip()
    expected = git('rev-parse', '--verify', base + '^{commit}')
    actual = git('rev-parse', 'HEAD')
    current = git('branch', '--show-current')
    if actual != expected or current != branch:
        raise ValueError('Checkout must be at the declared base and branch; no automatic reset or checkout is performed.')
    return {'repo': str(repo), 'base_commit': actual, 'branch': current, 'destination_branch': branch}


def preflight(repo, base, branch, out):
    record = identity(repo, base, branch)
    repo = Path(record['repo'])
    out = Path(out).resolve()
    if out == Path(repo).resolve() or Path(repo).resolve() in out.parents:
        raise ValueError('Preflight evidence must be outside the checkout.')
    out.mkdir(parents=True, exist_ok=False)
    probes = [('node', ['node', '--version']), ('pnpm', ['pnpm', '--version']),
              ('func', ['func', '--version']), ('java', ['java', '-version']),
              ('typescript', ['node', '-e', "console.log(require('typescript').version)"])]
    def probe(item):
        name, argv = item
        started = time.monotonic()
        try:
            result = subprocess.run(argv, cwd=repo, capture_output=True, text=True, timeout=20)
            text, code = result.stdout + result.stderr, result.returncode
        except (OSError, subprocess.TimeoutExpired) as error:
            text, code = str(error), 127
        (out / (name + '.log')).write_text(text)
        passed = code == 0
        if name == 'node' and passed:
            try:
                passed = int(text.strip().lstrip('v').split('.')[0]) >= 24
            except ValueError:
                passed = False
        return {'name': name, 'argv': argv, 'exit_code': code, 'passed': passed,
                'summary': text.strip()[:300], 'log': name + '.log', 'seconds': time.monotonic() - started}
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:
        checks = list(pool.map(probe, probes))
    # Check installed direct links without running install hooks or accessing a registry.
    names = subprocess.check_output(['git', '-C', str(repo), 'ls-files', '-z'], text=True).split('\0')
    missing = []
    for name in names:
        if not re.fullmatch(r'(?:package\.json|apps/[^/]+/package\.json|packages/[^/]+/[^/]+/package\.json)', name):
            continue
        manifest = json.loads((Path(repo) / name).read_text())
        for dep in set(manifest.get('dependencies', {})) | set(manifest.get('devDependencies', {})):
            parent = (Path(repo) / name).parent
            while parent != Path(repo).parent:
                if (parent / 'node_modules' / dep).exists():
                    break
                parent = parent.parent
            else:
                missing.append(name + ': ' + dep)
    checks.append({'name': 'installed_dependency_links', 'passed': not missing, 'missing': missing,
                   'note': 'Direct-link readiness only; frozen lockfile restoration and final build/tests remain required.'})
    try:
        with socket.socket() as server:
            server.bind(('127.0.0.1', 0))
        checks.append({'name': 'localhost', 'passed': True})
    except OSError as error:
        checks.append({'name': 'localhost', 'passed': False, 'error': str(error),
                       'remediation': 'Run in an isolated environment permitted to bind localhost; do not skip HTTP checks.'})
    record.update(checks=checks, passed=all(row['passed'] for row in checks),
                  remediation='Restore locked dependencies with pnpm install --offline --frozen-lockfile --ignore-scripts when appropriate; install missing runtimes separately. No install, network access or permissions change is performed by this probe.')
    (out / 'preflight.json').write_text(json.dumps(record, indent=2) + '\n')
    return record
