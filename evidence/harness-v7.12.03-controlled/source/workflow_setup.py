"""Explicit run identity and concurrent, read-only local environment probes."""
import concurrent.futures
import json
import os
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
    manifest_path = repo / 'package.json'
    manifest = json.loads(manifest_path.read_text()) if manifest_path.exists() else {}
    manager = manifest.get('packageManager', '')
    pinned_pnpm = re.fullmatch(r'pnpm@(\d+\.\d+\.\d+)', manager) if isinstance(manager, str) else None
    expected_pnpm = pinned_pnpm.group(1) if pinned_pnpm else None
    pnpm_remediation = ('Activate pnpm ' + expected_pnpm + ' declared in package.json before retrying.'
                        if expected_pnpm else 'Make pnpm available in this environment before retrying.')
    restore = 'Restore the repository\'s locked dependencies separately with pnpm install --offline --frozen-lockfile --ignore-scripts when appropriate; rerun preflight afterward.'
    probes = [
        ('node', ['node', '--version'], 'Make Node.js 24 or newer available before retrying.'),
        ('pnpm', ['pnpm', '--version'], pnpm_remediation),
        ('func', ['func', '--version'], 'Make Azure Functions Core Tools (func) available before retrying.'),
        ('java', ['java', '-version'], 'Make the required Java runtime available before retrying.'),
        ('typescript', ['node', '-e', "console.log(require('typescript').version)"],
         'Ensure the repository\'s installed TypeScript package is resolvable by Node. ' + restore),
        ('turbo', ['pnpm', 'exec', 'turbo', '--version'],
         'Ensure the repository\'s Turbo build tool can execute through pnpm. ' + restore),
        ('biome', ['pnpm', 'exec', 'biome', '--version'],
         'Ensure the repository\'s Biome formatter can execute through pnpm. ' + restore),
        ('tsgo', ['pnpm', 'exec', 'tsgo', '--version'],
         'Ensure the repository\'s tsgo type checker can execute through pnpm. ' + restore),
    ]
    # Version probes must not bootstrap Corepack/pnpm downloads or rewrite packageManager.
    probe_env = dict(os.environ, COREPACK_ENABLE_NETWORK='0', COREPACK_ENABLE_DOWNLOAD_PROMPT='0',
                     COREPACK_ENABLE_AUTO_PIN='0', npm_config_offline='true',
                     npm_config_manage_package_manager_versions='false',
                     PNPM_MANAGE_PACKAGE_MANAGER_VERSIONS='false')
    def probe(item):
        name, argv, remediation = item
        started = time.monotonic()
        try:
            result = subprocess.run(argv, cwd=repo, capture_output=True, text=True, timeout=20,
                                    env=probe_env)
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
        row = {'name': name, 'argv': argv, 'exit_code': code, 'passed': passed,
               'summary': text.strip()[:300], 'log': name + '.log',
               'remediation': remediation, 'seconds': time.monotonic() - started}
        if name == 'pnpm':
            row.update(expected_version=expected_pnpm,
                       actual_version=result.stdout.strip() if code == 0 else None)
            if expected_pnpm:
                row['passed'] = passed and row['actual_version'] == expected_pnpm
        return row
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
                   'remediation': restore,
                   'note': 'Direct-link readiness only; lockfile/install coherence is not verified. Frozen lockfile restoration and final build/tests remain required.'})
    try:
        with socket.socket() as server:
            server.bind(('127.0.0.1', 0))
        checks.append({'name': 'localhost', 'passed': True,
                       'remediation': 'Run in an isolated environment permitted to bind localhost; do not skip HTTP checks.'})
    except OSError as error:
        checks.append({'name': 'localhost', 'passed': False, 'error': str(error),
                       'remediation': 'Run in an isolated environment permitted to bind localhost; do not skip HTTP checks.'})
    record.update(checks=checks, passed=all(row['passed'] for row in checks), final_validation_required=True,
                  remediation='Restore locked dependencies with pnpm install --offline --frozen-lockfile --ignore-scripts when appropriate; install missing runtimes separately. No install, network access or permissions change is performed by this probe.')
    (out / 'preflight.json').write_text(json.dumps(record, indent=2) + '\n')
    return record
