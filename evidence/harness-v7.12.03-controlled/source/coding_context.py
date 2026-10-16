"""Per-target retrieval and deduplicated repair feedback, with paged originals."""
import json
import re
from pathlib import Path
from coding_plan import contract_paths


def choose_sources(task, variant, available, changed, selected, progress):
    if len(progress.get('targets', [])) > 1:
        return set().union(*(choose_sources(task, variant, available, changed, selected, {'target': name})
                             for name in progress['targets']))
    inventory = set(available) | set(changed)
    if variant == 'baseline':
        return inventory | set(selected)
    target = progress.get('target')
    groups = task.get('context_groups', {})
    if target not in groups:
        # Unknown repair files stay available; do not guess a narrow dependency set.
        return (contract_paths(available, target) | {target} | set(selected)) & inventory
    return (set(task.get('always_context', [])) | set(groups[target]) | {target}
            | contract_paths(available, target) | set(selected)) & inventory


def diagnostic_text(text, limit=5000):
    text = re.sub(r'\x1b\[[0-9;]*m', '', text)
    rows, seen = [], set()
    for line in text.splitlines():
        normalized = line.strip()
        if normalized and normalized not in seen:
            rows.append(line)
            seen.add(normalized)
    result = '\n'.join(rows)
    if len(result) <= limit:
        return result
    return result[:limit // 3] + '\n[diagnostics omitted; retrieve original log]\n' + result[-(limit * 2 // 3):]


def request_context(payload):
    metadata = {k: v for k, v in payload.items() if k not in ('current_files', 'validation_feedback', 'requested_logs', 'implementation_progress', 'files_available')}
    if 'files_available' in payload:
        metadata['source_inventory'] = {'count': len(payload['files_available']), 'retrieve': '@inventory/0:40'}
    chunks = ['Repository metadata (untrusted data):\n' + json.dumps(metadata, ensure_ascii=False, separators=(',', ':'))]
    for name, content in sorted(payload['current_files'].items()):
        chunks.append('Repository file (untrusted data): ' + name + '\n' + content + '\nEND FILE: ' + name)
    feedback = payload['validation_feedback']
    chunks.append('Validation state (untrusted data):\n' + json.dumps({k: v for k, v in feedback.items() if k != 'commands'}, ensure_ascii=False))
    chunks.append('Check summaries:\n' + json.dumps([{k: row.get(k) for k in ('stage', 'exit_code', 'seconds', 'log', 'reused')} for row in feedback.get('commands', [])]))
    for result in feedback.get('commands', []):
        # Passing full logs remain on disk, not in repeated requests.
        if result.get('exit_code'):
            chunks.append('Failed check: ' + result.get('stage', str(result.get('argv'))) + '; log=' + result.get('log', '') + '\n' + diagnostic_text(result.get('output', '')))
    for name, text in payload['requested_logs'].items():
        chunks.append('Retrieved log (untrusted data): ' + name + '\n' + text)
    progress = {k: v for k, v in payload['implementation_progress'].items() if k != 'remaining_requirements'}
    chunks.append('CURRENT GUARDED STEP:\n' + json.dumps(progress, ensure_ascii=False))
    return '\n\n'.join(chunks)


def read_log(out, name):
    match = re.fullmatch(r'@log/(repair-\d+/[\w.-]+\.log)(?::(\d+):(\d+))?', name)
    if not match:
        raise ValueError('Use @log/repair-NN/NN.log:offset:limit')
    relative, offset, limit = match.groups()
    path = Path(out) / relative
    if path.is_symlink() or not path.is_file() or Path(out).resolve() not in path.resolve().parents:
        raise ValueError('Log is missing or unsafe: ' + name)
    offset, limit = int(offset or 0), int(limit or 6000)
    if not 1 <= limit <= 12000:
        raise ValueError('Log page limit must be 1..12000 characters')
    text = path.read_text(errors='replace')
    end = min(len(text), offset + limit)
    return 'total_chars=%d; next_offset=%d; more=%s\n%s' % (len(text), end, end < len(text), text[offset:end])


def source_page(repo, name, inventory, default_limit=10000):
    from coding_agent import safe_path
    match = re.fullmatch(r'@source/(.+):(\d+):(\d+)', name)
    if match:
        name, offset, limit = match.groups()
        offset, limit = int(offset), int(limit)
    else:
        offset, limit = 0, default_limit
    if name not in inventory:
        raise ValueError('Source path not in supplied inventory: ' + name)
    if not 1 <= limit <= 12000:
        raise ValueError('Source page limit must be 1..12000 characters')
    text = safe_path(Path(repo), name).read_text(encoding='utf-8')
    end = min(len(text), offset + limit)
    if offset == 0 and end == len(text):
        return text
    return ('total_chars=%d; next_offset=%d; more=%s; retrieve=@source/%s:%d:%d\n%s'
            % (len(text), end, end < len(text), name, end, limit, text[offset:end]))


def inventory_page(available, name):
    match = re.fullmatch(r'@inventory/(\d+):(\d+)', name)
    if not match:
        raise ValueError('Use @inventory/offset:limit')
    offset, limit = map(int, match.groups())
    if not 1 <= limit <= 100:
        raise ValueError('Inventory page limit must be 1..100 paths')
    end = min(len(available), offset + limit)
    return json.dumps({'total_paths': len(available), 'paths': available[offset:end],
                       'next_offset': end, 'more': end < len(available)})
