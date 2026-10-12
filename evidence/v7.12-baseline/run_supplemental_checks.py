import json
from pathlib import Path
import subprocess
import time

root = Path('/Users/dfortun/Documents/Codex/2026-10-12/have')
repo = root / 'work/df-oai-0-a-out'
out = root / 'work/v7.12-task-a-baseline/supplemental'
out.mkdir(exist_ok=True)
checks = [
    ('script-policy', ['node', 'scripts/check-script-policy.mjs']),
    ('biome-check', ['pnpm', 'exec', 'biome', 'check', '.']),
    ('knip', ['pnpm', 'run', 'knip']),
    ('e18e', ['pnpm', 'run', 'e18e']),
    ('snyk', ['pnpm', 'run', 'snyk']),
    ('diff-check', ['git', 'diff', '--check']),
]
results = []
for name, argv in checks:
    started = time.time()
    log = out / (name + '.log')
    with log.open('w') as stream:
        try:
            result = subprocess.run(argv, cwd=repo, stdout=stream,
                                    stderr=subprocess.STDOUT, timeout=900)
            code, timeout = result.returncode, False
        except subprocess.TimeoutExpired:
            code, timeout = None, True
        except OSError as error:
            stream.write(str(error) + '\n')
            code, timeout = 127, False
    text = log.read_text(errors='replace')
    status = 'skipped' if name == 'snyk' and 'Snyk: SKIPPED' in text else ('passed' if code == 0 else 'failed')
    results.append({'name': name, 'argv': argv, 'exit_code': code,
                    'status': status, 'timeout': timeout,
                    'started_at_epoch': started, 'seconds': time.time()-started,
                    'log': log.name})
    (out / 'results.json').write_text(json.dumps(results, indent=2) + '\n')
    print(json.dumps(results[-1]), flush=True)
