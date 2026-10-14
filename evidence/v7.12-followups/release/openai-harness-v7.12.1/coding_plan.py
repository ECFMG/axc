"""Task-derived file sequence and repository contract context; no solution code."""
import json
import re
from pathlib import Path


GUIDANCE = """Follow the existing package responsibilities: domain owns Course contracts; persistence owns fixture storage; application-services consumes an injected repository for filtering, sorting and pagination; REST validates query input; apps/api wires dependencies through Cellix. No database is needed for this sample. Preserve health, authorization forwarding, existing exports and scripts. When enabled by task policy, only additive dependencies on existing @axc workspace packages are allowed; external dependency versions and root configuration stay unchanged. Use public package roots and observed .ts import conventions. Follow strict compiler rules. Validate raw pagination before converting integers and return pageSize exactly as specified. Add registered functional tests and actual-host Serenity scenarios, plus documentation. Repair syntax/lint failures before proceeding. File presence is provisional progress, not verified completion."""


def diagnostics(feedback, names):
    text = '\n'.join(r.get('output', '') for r in feedback.get('commands', []) if r.get('exit_code')) + '\n' + str(feedback.get('error', '')) + '\n' + json.dumps(feedback.get('submitted', {}).get('errors', []))
    hits = []
    for name in names:
        relative = name.split('/src/', 1)[-1] if '/src/' in name else None
        if name in text or (relative and ('src/' + relative) in text):
            hits.append(name)
    # Do not guess when a package-relative path could name several packages.
    return sorted(hits) if len(hits) == 1 else sorted(n for n in hits if n in text)


def progress(task, repo, changed, feedback, available):
    steps = task.get('implementation_steps', [])
    if not steps:
        return {}
    pending = [s for s in steps if s['path'] not in changed or not (Path(repo) / s['path']).is_file()]
    paths = diagnostics(feedback, set(changed))
    if paths:
        chosen = {'path': paths[0], 'instruction': 'Repair the precise outstanding diagnostic before proceeding; preserve required behavior and assertions.'}
    elif pending:
        chosen = pending[0]
    else:
        if feedback.get('passed'):
            chosen = None
        else:
            # Only this last fallback is task-specific, not a reference answer.
            stage = next((r.get('stage', '') for r in feedback.get('commands', []) if r.get('exit_code')), '')
            default = task.get('repair_targets', {}).get(stage)
            chosen = {'path': default, 'instruction': 'Read the failing diagnostic and relevant declarations before repairing.'} if default else None
    result = {'target': chosen['path'] if chosen else None, 'step': chosen,
              'written_unverified': sorted(changed), 'remaining_planned_files': len(pending),
              'remaining_requirements': [s['instruction'] for s in pending],
              'note': 'Only passing checks establish completion; file presence is provisional.'}
    return result


def implementation_ready(task, repo, changed):
    steps = [s for s in task.get('implementation_steps', []) if s.get('stage', 'implementation') == 'implementation']
    return all(s['path'] in changed and (Path(repo) / s['path']).is_file() for s in steps)


def contract_paths(available, target):
    names = set(available)
    contracts = {'package.json', 'pnpm-workspace.yaml', 'biome.json',
                 'packages/axc/README.md', 'packages/cellix/config-typescript/tsconfig.base.json',
                 'packages/cellix/config-typescript/tsconfig.node.json'}
    if target:
        root = target.split('/src/', 1)[0] if '/src/' in target else '/'.join(target.split('/')[:2])
        contracts |= {root + '/' + n for n in ('package.json', 'tsconfig.json', 'vitest.config.ts')}
        if target.startswith(('apps/api/', 'packages/axc/rest/')):
            contracts |= {'packages/axc/application-services/src/index.ts', 'packages/axc/application-services/package.json'}
        if target.startswith('packages/axc/application-services/'):
            contracts |= {'packages/axc/domain/package.json', 'packages/axc/domain/src/index.ts'}
        if target.startswith('packages/axc/persistence/'):
            contracts |= {'packages/axc/domain/package.json', 'packages/axc/domain/src/index.ts'}
        if '.test.' in target or '/test/' in target:
            contracts |= {n for n in names if n.endswith(('vitest.config.ts', 'tsconfig.vitest.json', 'health.test.ts'))}
    return contracts & names
