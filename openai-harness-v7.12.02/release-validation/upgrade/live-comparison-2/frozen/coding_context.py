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
    if progress.get('batch'):
        progress.pop('step', None)  # Same instruction already appears in batch.
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


def source_snapshot(repo, names, inventory, character_limit=None):
    """Bound source excerpts, never the fixed task; full raw pages stay retrievable."""
    from coding_agent import safe_path
    repo = Path(repo).resolve()
    names = sorted(name for name in names if safe_path(repo, name).is_file())
    if character_limit is None:
        return {name: source_page(repo, name, inventory) for name in names}
    if type(character_limit) is not int or character_limit < 1000:
        raise ValueError('Source context character limit must be an integer >= 1000')
    # Small files fit whole first; remaining files share the remaining budget.
    sizes = {name: len(safe_path(repo, name).read_text(encoding='utf-8')) for name in names}
    result = {}
    remaining = character_limit
    for index, name in enumerate(sorted(names, key=lambda n: (sizes[n], n))):
        share = remaining // (len(names) - index)
        # Reserve room for the raw-page locator and total/offset metadata.
        limit = min(10000, share - len(name) - 180)
        if limit < 1:
            raise ValueError('Source context limit cannot fit all file locators; increase the declared limit')
        page = source_page(repo, name, inventory, default_limit=limit)
        if len(page) > remaining:
            raise ValueError('Source context budget exceeded; no source may be silently omitted')
        result[name] = page
        remaining -= len(page)
    return dict(sorted(result.items()))


def source_payload(repo, names, inventory, character_limit=None, retrieved=None):
    """Share one excerpt budget between automatic sources and explicit raw pages."""
    repo = Path(repo).resolve()
    retrieved = dict(retrieved or {})
    requested = sorted(name for name in retrieved if name.startswith('@source/'))
    if character_limit is None or not requested:
        return source_snapshot(repo, names, inventory, character_limit), retrieved
    if type(character_limit) is not int or character_limit < 1000:
        raise ValueError('Source context character limit must be an integer >= 1000')
    # Explicit reads get at most half; preserve room for automatic source locators.
    share = character_limit // (2 * len(requested))
    for name in requested:
        match = re.fullmatch(r'@source/(.+):(\d+):(\d+)', name)
        if not match:
            raise ValueError('Use @source/path:offset:limit')
        path, offset, requested_limit = match.groups()
        limit = min(int(requested_limit), share - len(path) - 180)
        if limit < 1:
            raise ValueError('Source budget cannot fit all requested page locators')
        retrieved[name] = source_page(repo, '@source/%s:%s:%d' % (path, offset, limit), inventory)
    reserved = sum(len(retrieved[name]) for name in requested)
    snapshot = source_snapshot(repo, names, inventory, character_limit - reserved)
    if sum(map(len, snapshot.values())) + reserved > character_limit:
        raise ValueError('Combined source context budget exceeded')
    return snapshot, retrieved


class NoProgressError(ValueError):
    pass


class NoProgressGuard:
    """Bound repeated successful reads, validation requests and no-op writes."""
    def __init__(self, maximum=3):
        if type(maximum) is not int or maximum < 2:
            raise ValueError('max_repeated_actions must be an integer >= 2')
        self.maximum = maximum
        self.seen = {}

    def observe(self, action, evidence, changed=False):
        import hashlib
        if changed:
            self.seen.clear()
            return
        signature = hashlib.sha256(json.dumps([action, evidence], sort_keys=True).encode()).hexdigest()
        self.seen[signature] = self.seen.get(signature, 0) + 1
        if self.seen[signature] >= self.maximum:
            raise NoProgressError('Stopped repeated action without source progress; full evidence and usage retained')
