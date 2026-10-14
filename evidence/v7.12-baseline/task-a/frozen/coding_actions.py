"""One guarded file action; exact edits are checked completely before writing."""
import json


SCHEMA = {
    'type': 'object', 'additionalProperties': False,
    'properties': {
        'path': {'type': 'string'}, 'content': {'type': 'string'},
        'edits': {'type': 'array', 'maxItems': 2, 'items': {
            'type': 'object', 'additionalProperties': False,
            'properties': {'old': {'type': 'string', 'minLength': 1, 'maxLength': 800},
                           'new': {'type': 'string', 'maxLength': 8000}},
            'required': ['old', 'new']}},
        'read_files': {'type': 'array', 'maxItems': 5, 'items': {'type': 'string'}},
        'validate': {'type': 'boolean'},
    }, 'required': ['path', 'content', 'edits', 'read_files', 'validate'],

}


def decode_action(text, repo, resolve, target=None):
    action = json.loads(text)
    keys = {'path', 'content', 'edits', 'read_files', 'validate'}
    if not isinstance(action, dict) or set(action) != keys:
        raise ValueError('Return exactly path, content, edits, read_files, validate; one path per action')
    path, content, edits = action['path'], action['content'], action['edits']
    if not isinstance(path, str) or not isinstance(content, str) or not isinstance(edits, list):
        raise ValueError('Invalid path/content/edits types')
    reads = action['read_files']
    if not isinstance(reads, list) or len(reads) > 5 or not all(isinstance(n, str) for n in reads):
        raise ValueError('read_files must contain at most five text paths')
    if type(action['validate']) is not bool or len(edits) > 2:
        raise ValueError('validate must be boolean; at most two exact edits are allowed')
    if path and target is not None and path != target:
        raise ValueError('Guarded target is ' + target + '; received ' + path)
    if content and edits:
        raise ValueError('Use content OR edits, never both: ' + path)
    if bool(path) != bool(content or edits):
        raise ValueError('A write requires a path and content or edits; reads use empty path')
    files = []
    if path:
        dest = resolve(repo, path)
        if edits:
            if not dest.is_file():
                raise ValueError('Cannot patch a missing file: ' + path)
            original = dest.read_text(encoding='utf-8')
            spans = []
            for edit in edits:
                if not isinstance(edit, dict) or set(edit) != {'old', 'new'}:
                    raise ValueError('Each edit must contain exactly old and new: ' + path)
                old, new = edit['old'], edit['new']
                if not isinstance(old, str) or not 1 <= len(old) <= 800 or not isinstance(new, str) or len(new) > 8000:
                    raise ValueError('Edit exceeds anchor/replacement bounds: ' + path)
                count = original.count(old)
                if count != 1:
                    raise ValueError('Anchor must match once in ' + path + '; matches=' + str(count))
                start = original.index(old)
                spans.append((start, start + len(old), new))
            spans.sort()
            if any(left[1] > right[0] for left, right in zip(spans, spans[1:])):
                raise ValueError('Overlapping edit anchors: ' + path)
            content = original
            for start, end, new in reversed(spans):
                content = content[:start] + new + content[end:]
        if dest.is_file() and dest.read_text(encoding='utf-8') == content:
            raise ValueError('No-op replacement: ' + path + '; use reads or validate instead')
        files = [{'path': path, 'content': content}]
    if not files and not reads and not action['validate']:
        raise ValueError('No write/read/validation requested')
    return files, reads, action['validate']
