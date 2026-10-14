"""Deterministic output contracts. No model calls, silent repair, or answer inference."""

from decimal import Decimal, InvalidOperation
import json
import re
import unicodedata

from common import require


def json_answer(text):
    """Accept one JSON object, optionally inside one whole-response Markdown fence."""
    require(isinstance(text, str), 'JSON answer must be text')
    body = text.strip()
    fenced = re.fullmatch(r'```(?:json)?[ \t]*\r?\n([\s\S]*?)\r?\n```', body, re.IGNORECASE)
    if fenced:
        body = fenced.group(1).strip()

    def unique(pairs):
        value = {}
        for key, item in pairs:
            require(key not in value, 'Duplicate JSON key: ' + key)
            value[key] = item
        return value

    def finite(value):
        raise ValueError('Non-finite JSON value: ' + value)

    value = json.loads(body, object_pairs_hook=unique, parse_constant=finite)
    require(isinstance(value, dict), 'JSON answer must be an object')
    # Exponent overflow is not handled by parse_constant.
    json.dumps(value, allow_nan=False)
    return value, 'markdown_fence' if fenced else None


def normalize_teaching(text):
    """Normalize presentation only; retain numbers, negations and word order."""
    text = text.replace('²', '^2').replace('³', '^3')
    text = unicodedata.normalize('NFKC', text)
    text = text.translate(str.maketrans({'−': '-', '–': '-', '—': '-', '’': "'", '×': '*', '÷': '/'}))
    text = re.sub(r'\\(?:text|mathrm|mathbf|operatorname)\{([^{}]*)\}', r'\1', text)
    text = re.sub(r'\\(?:d?frac)\{([^{}]+)\}\{([^{}]+)\}', r'\1/\2', text)
    text = text.replace(r'\times', '*').replace(r'\div', '/')
    text = text.replace(r'\neq', '!=').replace(r'\ne ', '!= ').replace('≠', '!=')
    text = re.sub(r'\\(?:left|right|quad|qquad)\b', ' ', text)
    text = re.sub(r'\\[()\[\],;!%]', lambda m: '%' if m[0] == r'\%' else ' ', text)
    text = text.replace('**', '').replace('__', '').replace('`', '').replace('$', '')
    text = re.sub(r'(?<!\d)(\d{1,3}(?:,\d{3})+)(?!\d)', lambda m: m[0].replace(',', ''), text)
    text = re.sub(r'(?<=\d)\s+(?=(?:m/s|km/h|cm\^2)\b)', ' ', text)
    return text


def compact_text(text):
    return ' '.join(normalize_teaching(text).split()).strip()


def validate_rubric(rubric):
    def compile_pattern(pattern):
        try:
            return re.compile(pattern, re.IGNORECASE | re.DOTALL)
        except re.error as exc:
            raise ValueError('Invalid version 2 pattern: ' + str(exc)) from None

    allowed = {'version', 'required', 'forbidden', 'max_words', 'transfer_question', 'transfer_answer', 'numeric', 'require_sections'}
    require(rubric.get('version') == 2 and set(rubric) <= allowed, 'Invalid version 2 rubric')
    require(type(rubric.get('require_sections', True)) is bool, 'require_sections must be a boolean')
    require(isinstance(rubric.get('transfer_question'), str) and rubric['transfer_question'].strip().endswith('?'),
            'Version 2 rubric needs the exact transfer question')
    patterns = rubric.get('transfer_answer')
    require(isinstance(patterns, list) and patterns and all(isinstance(p, str) and p for p in patterns),
            'Version 2 rubric needs transfer-answer leakage patterns')
    numeric = rubric.get('numeric', {})
    require(isinstance(numeric, dict), 'numeric must map labels to checks')
    for name, item in numeric.items():
        require(isinstance(name, str) and name and isinstance(item, dict)
                and {'pattern', 'value'} <= set(item) <= {'pattern', 'value', 'scope', 'units'}, 'Invalid numeric check')
        require(item.get('scope', 'example') in ('example', 'lesson'), 'Numeric scope must be example or lesson')
        require(isinstance(item['pattern'], str), 'Numeric pattern must be text')
        pattern = compile_pattern(item['pattern'])
        require('value' in pattern.groupindex, 'Numeric pattern needs a named value group')
        if 'units' in item:
            require('unit' in pattern.groupindex and isinstance(item['units'], list) and item['units']
                    and all(isinstance(u, str) and u.strip() for u in item['units']),
                    'Unit checks need allowed units and a named unit group')
        try:
            require(type(item['value']) in (str, int, float) and Decimal(str(item['value'])).is_finite(),
                    'Numeric expected value must be finite')
        except InvalidOperation:
            raise ValueError('Invalid numeric expected value') from None
    for pattern in patterns:
        compile_pattern(pattern)


def teaching_checks(rubric, output):
    text = normalize_teaching(output)
    matches = list(re.finditer(r'(?<!\w)(Core|Example|Misconception|Check)\s*:', text, re.IGNORECASE))
    order = [m[1].lower() for m in matches]
    expected = ['core', 'example', 'misconception', 'check']
    sections = {}
    for index, match in enumerate(matches):
        end = matches[index+1].start() if index+1 < len(matches) else len(text)
        sections[match[1].lower()] = text[match.end():end].strip()
    checks = {'structure:sections': order == expected and all(sections.get(k) for k in expected)}
    # A requested question must not satisfy a fact check on the lesson itself.
    body = text[:matches[-1].start()] if matches and order[-1] == 'check' else text
    checks['transfer:exact_question'] = compact_text(sections.get('check', '')) == compact_text(rubric['transfer_question'])
    if not rubric.get('require_sections', True):
        # Teaching quality does not depend on decorative headings. The requested question still must be exact and final.
        checks.pop('structure:sections')
        flat, question = compact_text(text), compact_text(rubric['transfer_question'])
        checks['transfer:exact_question'] = flat.endswith(question)
        body = flat[:-len(question)] if checks['transfer:exact_question'] else flat
    checks['transfer:answer_withheld'] = not any(re.search(p, body, re.IGNORECASE | re.DOTALL)
                                                 for p in rubric['transfer_answer'])
    for kind in ('required', 'forbidden'):
        for name, pattern in rubric.get(kind, {}).items():
            matched = bool(re.search(pattern, body, re.IGNORECASE | re.DOTALL))
            checks[kind + ':' + name] = matched if kind == 'required' else not matched
    for name, rule in rubric.get('numeric', {}).items():
        scope = body if rule.get('scope') == 'lesson' else sections.get('example', '')
        matches = list(re.finditer(rule['pattern'], scope, re.IGNORECASE))
        try:
            checks['numeric:' + name] = bool(matches) and all(
                isinstance(m['value'], str) and Decimal(m['value'].replace(',', '.')) == Decimal(str(rule['value'])) for m in matches)
            if 'units' in rule:
                # ponytail: explicit aliases only; no guessed dimensional equivalence.
                unit = lambda text: re.sub(r'\s+', '', text).casefold()
                checks['units:' + name] = bool(matches) and all(
                    unit(m['unit'] or '') in {unit(u) for u in rule['units']} for m in matches)
        except InvalidOperation:
            checks['numeric:' + name] = False
    return checks
