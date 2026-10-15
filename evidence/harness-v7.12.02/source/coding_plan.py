"""Task-derived file sequence and repository contract context; no solution code."""
import json
import re
from pathlib import Path


GUIDANCE = """Task A is a fixture-backed sample: implement the Course model, varied local fixtures and stateless search in the existing application-services layer; add no database implementation unless the observed architecture requires it. Preserve the existing health service and factory exports. Add both the Hono course route and Azure HTTP registration at the existing composition root. Forward the existing Authorization header to the service factory as the health route does. Package manifests define valid public imports: never guess internal /src package subpaths or undeclared dependencies. Local TS imports follow the observed .ts convention. Follow exactOptionalPropertyTypes, noUncheckedIndexedAccess, and erasableSyntaxOnly. Validate raw pagination input before integer conversion. Tests belong in a registered package and must execute real assertions. Include two filter combinations, case-insensitive search and tag matching, no-match behavior, pagination, supported sorting, invalid queries and the specified error envelope. Documentation must show the path, parameters and success/error responses. Written files are provisional progress; acceptance requires validation."""


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
    if pending:
        chosen = pending[0]
    else:
        paths = diagnostics(feedback, set(changed))
        if paths:
            chosen = {'path': paths[0], 'instruction': 'Repair the precise outstanding diagnostic; preserve all required behavior and assertions.'}
        elif feedback.get('passed'):
            chosen = None
        else:
            # Only this last fallback is task-specific, not a reference answer.
            stage = next((r.get('stage', '') for r in feedback.get('commands', []) if r.get('exit_code')), '')
            default = task.get('repair_targets', {}).get(stage)
            chosen = {'path': default, 'instruction': 'Read the failing diagnostic and relevant declarations before repairing.'} if default else None
    batch_size = task.get('action_batch_size', 1)
    if type(batch_size) is not int or not 1 <= batch_size <= 2:
        raise ValueError('action_batch_size must be 1 or 2')
    batch = pending[:batch_size] if pending else ([chosen] if chosen else [])
    result = {'targets': [step['path'] for step in batch], 'batch': batch,
              'target': chosen['path'] if chosen else None, 'step': chosen,
              'written_unverified': sorted(changed), 'remaining_planned_files': len(pending),
              'remaining_requirements': [s['instruction'] for s in pending],
              'note': 'Only passing checks establish completion; file presence is provisional.'}
    return result


def contract_paths(available, target):
    names = set(available)
    contracts = {'AGENTS.md', 'package.json', 'pnpm-workspace.yaml', 'biome.json',
                 'packages/axc/README.md', 'packages/cellix/config-typescript/tsconfig.base.json',
                 'packages/cellix/config-typescript/tsconfig.node.json'}
    if target:
        root = target.split('/src/', 1)[0] if '/src/' in target else '/'.join(target.split('/')[:2])
        contracts |= {root + '/' + n for n in ('package.json', 'tsconfig.json', 'vitest.config.ts')}
        if target.startswith(('apps/api/', 'packages/axc/rest/')):
            contracts |= {'packages/axc/application-services/src/index.ts', 'packages/axc/application-services/package.json'}
        if target.startswith('packages/axc/application-services/'):
            contracts |= {'packages/axc/domain/package.json', 'packages/axc/domain/src/index.ts'}
        if '.test.' in target or '/test/' in target:
            contracts |= {n for n in names if n.endswith(('vitest.config.ts', 'tsconfig.vitest.json', 'health.test.ts'))}
    if target:
        contracts |= {str(parent / 'AGENTS.md') for parent in Path(target).parents}
    return contracts & names
