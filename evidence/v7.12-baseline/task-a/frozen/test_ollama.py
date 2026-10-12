"""Offline Ollama HTTP fixtures. These tests do not establish live model quality."""

import copy
import io
import json
import os
import tempfile
import unittest
from contextlib import redirect_stderr, redirect_stdout
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch
from urllib.error import HTTPError

import harness
import workflow
from common import encoded
from model_adapters import ModelError
from ollama_adapter import OllamaAdapter

ROOT = Path(__file__).resolve().parent
CONFIG = json.loads((ROOT / 'ollama-config.json').read_text())
TASK = json.loads((ROOT / 'tasks-eval.json').read_text())['tasks'][0]


def response(text='{"lesson_minutes":15,"exercise_count":2}', **overrides):
    return dict(model='tiny:latest', done=True, done_reason='stop',
                message={'role': 'assistant', 'content': text},
                prompt_eval_count=100, prompt_eval_cached_count=0, eval_count=20,
                **overrides)


class Transport:
    def __init__(self, responses=None):
        self.calls = []
        self.responses = responses if responses is not None else [response()]
        self.version = '0.34.4'
        self.model = {'name': 'tiny:latest', 'digest': 'sha256:test-model'}
        self.drop_text = None

    def __call__(self, path, payload=None):
        self.calls.append((path, copy.deepcopy(payload)))
        if path == '/api/version':
            return {'version': self.version}
        if path == '/api/tags':
            return {'models': [copy.deepcopy(self.model)]}
        if payload.get('_debug_render_only'):
            text = '\n'.join(m['content'] + m.get('thinking', '') for m in payload['messages'])
            text += encoded(payload['tools'])
            if self.drop_text:
                text = text.replace(self.drop_text, '')
            return {'_debug_info': {'rendered_template': text}}
        result = self.responses.pop(0)
        if isinstance(result, Exception):
            raise result
        return copy.deepcopy(result)

    def generations(self):
        return [body for path, body in self.calls if path == '/api/chat' and not body.get('_debug_render_only')]


class OllamaChecks(unittest.TestCase):
    def request(self):
        messages, _, _ = workflow.prepare(TASK, [], CONFIG)
        return dict(model='tiny', input=messages, tools=workflow.TOOLS,
                    max_output_tokens=512, temperature=0, prompt_cache_key='test')

    def adapter(self, responses=None):
        adapter, transport = OllamaAdapter(), Transport(responses)
        adapter.http = transport
        return adapter, transport

    def test_role_order_constraints_and_tools_survive_translation(self):
        request = self.request()
        original = copy.deepcopy(request)
        adapter, transport = self.adapter()
        count = adapter.count(request)
        self.assertEqual(request, original)
        self.assertEqual(transport.generations(), [])
        self.assertEqual(count['source'], 'estimated_rendered_bytes')
        self.assertIn('sha256:test-model', count['model'])
        wire = adapter.payload(request)
        self.assertIn(workflow.SYSTEM, wire['messages'][0]['content'])
        self.assertIn('original system instructions outrank developer', wire['messages'][0]['content'])
        self.assertIn(workflow.DEVELOPER, wire['messages'][1]['content'])
        self.assertIn('Original instruction role: developer', wire['messages'][1]['content'])
        self.assertEqual(wire['messages'][-1]['content'], request['input'][-1]['output'])
        self.assertEqual(wire['messages'][-1]['tool_name'], 'load_context')
        self.assertEqual(wire['messages'][-1]['tool_call_id'], 'initial_context')

    def test_reported_counts_and_caps_are_preserved_without_double_counting(self):
        body = response()
        body.update(prompt_eval_cached_count=60, eval_count=22)
        adapter, transport = self.adapter([body])
        request = self.request()
        adapter.count(request)
        result = adapter.generate(request)
        self.assertEqual(result['usage']['total_tokens'], 122)
        self.assertEqual(result['usage']['cached_tokens'], 60)
        self.assertEqual(result['usage']['source'], 'provider')
        self.assertIsNone(result['usage']['reasoning_tokens'])
        wire = transport.generations()[0]
        self.assertFalse(wire['stream'])
        self.assertFalse(wire['truncate'])
        self.assertFalse(wire['shift'])
        self.assertEqual(wire['options'], {'num_ctx': 32768, 'num_predict': 512, 'temperature': 0})
        self.assertNotIn('prompt_cache_key', wire)

    def test_tool_calls_and_thinking_round_trip(self):
        first = response('')
        first['message'].update(thinking='Need the source first.', tool_calls=[{
            'function': {'name': 'read_detail', 'arguments': {'ref': 'doc:x', 'query': '', 'start': 0, 'limit': 1}}},
            {'function': {'name': 'read_detail', 'arguments': {'ref': 'doc:y', 'query': '', 'start': 0, 'limit': 1}}}])
        adapter, _ = self.adapter([first, response()])
        request = self.request()
        adapter.count(request)
        result = adapter.generate(request)
        request['input'].extend(result['items'])
        calls = result['items'][1:]
        self.assertEqual(len({call['call_id'] for call in calls}), 2)
        for call in calls:
            request['input'].append({'type': 'function_call_output', 'call_id': call['call_id'], 'output': 'answer data'})
        adapter.count(request)
        wire = adapter.payload(request)
        self.assertEqual(wire['messages'][-3]['thinking'], 'Need the source first.')
        self.assertEqual(len(wire['messages'][-3]['tool_calls']), 2)
        self.assertEqual(wire['messages'][-1]['tool_call_id'], calls[-1]['call_id'])
        self.assertEqual(adapter.generate(request)['status'], 'completed')

    def test_template_omission_rejects_before_generation(self):
        adapter, transport = self.adapter()
        transport.drop_text = workflow.DEVELOPER
        with self.assertRaisesRegex(ValueError, 'omitted'):
            adapter.count(self.request())
        self.assertEqual(transport.generations(), [])

    def test_old_server_cloud_and_changed_model_are_rejected(self):
        for version in ('0.12.0', '0.34.3', 'garbage', '0.34.4-rc1'):
            adapter, transport = self.adapter()
            transport.version = version
            with self.subTest(version=version), self.assertRaisesRegex(ValueError, '0.34.4'):
                adapter.count(self.request())
            self.assertEqual(transport.generations(), [])
        adapter, transport = self.adapter()
        transport.model['remote_host'] = 'https://cloud.example'
        with self.assertRaisesRegex(ValueError, 'Cloud'):
            adapter.count(self.request())
        adapter, transport = self.adapter()
        adapter.count(self.request())
        transport.model['digest'] = 'sha256:changed'
        with self.assertRaisesRegex(ValueError, 'changed'):
            adapter.generate(self.request())
        self.assertEqual(transport.generations(), [])

    def test_missing_and_invalid_usage_never_become_estimates(self):
        for field, value in [('prompt_eval_count', None), ('eval_count', True), ('prompt_eval_cached_count', 101)]:
            body = response()
            body[field] = value
            adapter, _ = self.adapter([body])
            adapter.count(self.request())
            with self.subTest(field=field), self.assertRaises(ModelError) as error:
                adapter.generate(self.request())
            self.assertIsNone(error.exception.usage)

    def test_unknown_cache_stays_unknown_and_comparison_flags_it(self):
        body = response()
        body.pop('prompt_eval_cached_count')
        adapter, _ = self.adapter([body])
        config = copy.deepcopy(CONFIG)
        config['model']['name'] = 'tiny'
        config['limits']['isolate_adapter'] = False
        record = workflow.execute(TASK, config, [], adapter, 'cold')
        self.assertTrue(record['success'])
        self.assertIsNone(record['summary']['cached_tokens'])
        report = dict(adapter=adapter.name, dataset_hash='same', split='eval', protocol_hash='same',
                      implementation_hash='same', config=config, strategies=[], status='completed',
                      summary=record['summary'], workflows=[dict(record, repetition=0, cache_trial='cold_attempt')],
                      by_cache_trial={}, measurement_label='HTTP fixtures, not a live benchmark')
        compared = workflow.compare(report, copy.deepcopy(report))
        self.assertTrue(any('unknown live cache' in flag for flag in compared['flags']))

    def test_incomplete_output_and_malformed_tools_retain_usage(self):
        body = response()
        body['done_reason'] = 'length'
        adapter, _ = self.adapter([body])
        adapter.count(self.request())
        result = adapter.generate(self.request())
        self.assertEqual(result['status'], 'incomplete')
        self.assertEqual(result['usage']['total_tokens'], 120)
        body = response()
        body['message']['tool_calls'] = [{'function': {'name': 'read_detail', 'arguments': 'not an object'}}]
        adapter, _ = self.adapter([body])
        adapter.count(self.request())
        with self.assertRaises(ModelError) as error:
            adapter.generate(self.request())
        self.assertEqual(error.exception.usage['total_tokens'], 120)

    def test_budgets_prevent_generation_and_actual_overruns_stop(self):
        config = copy.deepcopy(CONFIG)
        config['model']['name'] = 'tiny'
        config['limits'].update(isolate_adapter=False, context_tokens=1)
        adapter, transport = self.adapter()
        record = workflow.execute(TASK, config, [], adapter, 'blocked')
        self.assertFalse(record['success'])
        self.assertEqual(transport.generations(), [])
        self.assertEqual(record['calls'], [])
        config['limits']['context_tokens'] = 32768
        body = response()
        body['prompt_eval_count'] = 99999
        adapter, _ = self.adapter([body])
        record = workflow.execute(TASK, config, ['retrieve'], adapter, 'overrun')
        self.assertFalse(record['success'])
        self.assertFalse(record['fallback'])
        self.assertEqual(record['summary']['input_tokens'], 99999)
        self.assertIn('exceeded token reservation', record['attempts'][0]['reason'])

    def test_runner_owns_retries_and_unknown_usage_reservation(self):
        config = copy.deepcopy(CONFIG)
        config['model']['name'] = 'tiny'
        config['limits']['isolate_adapter'] = False
        adapter, transport = self.adapter([ModelError('timeout', True), response()])
        with patch.object(workflow.time, 'sleep'):
            record = workflow.execute(TASK, config, [], adapter, 'retry')
        self.assertTrue(record['success'])
        self.assertEqual(record['summary']['retries'], 1)
        self.assertEqual(record['summary']['unknown_usage_calls'], 1)
        self.assertIsNone(record['summary']['estimated_cost_usd'])
        self.assertEqual(len(transport.generations()), 2)
        self.assertGreater(record['budget_used_or_reserved'], record['summary']['total_tokens'])

    def test_http_has_no_authorization_no_retries_and_honors_timeout(self):
        adapter = OllamaAdapter(timeout_seconds=7)
        with patch('ollama_adapter.build_opener') as build:
            build.return_value.open.return_value = io.BytesIO(b'{"version":"0.34.4"}')
            adapter.http('/api/version')
            request = build.return_value.open.call_args.args[0]
            self.assertEqual(request.full_url, 'http://127.0.0.1:11434/api/version')
            self.assertFalse(request.has_header('Authorization'))
            self.assertEqual(build.return_value.open.call_args.kwargs['timeout'], 7)
            build.return_value.open.side_effect = HTTPError(request.full_url, 503, 'unavailable', {}, None)
            with self.assertRaises(ModelError) as error:
                adapter.http('/api/version')
            self.assertTrue(error.exception.retryable)
            self.assertEqual(build.return_value.open.call_count, 2)

    def test_teaching_provider_works_without_key_and_labels_preflight(self):
        suite = harness.validate(json.loads((ROOT / 'example.json').read_text()))
        adapter, transport = self.adapter()
        with tempfile.TemporaryDirectory() as temp, patch.dict(os.environ, {}, clear=True):
            args = SimpleNamespace(demo=False, adapter='ollama', model='tiny', repeat=1, min_pass_rate=1, objective='tokens',
                                   min_savings=0.1, token_budget=100000, context_tokens=32768,
                                   plan=True, out=Path(temp) / 'plan.json')
            report = harness.run(suite, args, lambda path, payload, key: adapter.post((path, payload, key)))
        self.assertEqual(report['status'], 'planned')
        self.assertEqual(report['adapter'], 'ollama-local-v1')
        self.assertEqual(report['preflight'][0]['count_source'], 'estimated_rendered_bytes')
        self.assertEqual(transport.generations(), [])
        request = harness.request_body(suite['variants'][0], suite['cases'][0], 'tiny')
        # The count endpoint omits the output cap, while generation includes it.
        measured = harness.measure(adapter.post(('responses', request, '')))
        self.assertEqual(measured['total_tokens'], 120)

    def test_cli_selects_ollama_without_key_and_rejects_illustrative_pricing(self):
        with tempfile.TemporaryDirectory() as temp, patch.dict(os.environ, {}, clear=True):
            temp = Path(temp)
            config = copy.deepcopy(CONFIG)
            config['limits'].update(isolate_adapter=False, repetitions=1)
            (temp / 'config.json').write_text(json.dumps(config))
            (temp / 'tasks.json').write_text(json.dumps({'split': 'eval', 'tasks': [TASK]}))
            transport = Transport()
            with patch.object(OllamaAdapter, 'http', side_effect=transport), redirect_stdout(io.StringIO()), redirect_stderr(io.StringIO()):
                code = workflow.main(['baseline', '--adapter', 'ollama', '--model', 'tiny',
                                      '--config', str(temp / 'config.json'), '--tasks', str(temp / 'tasks.json'),
                                      '--out', str(temp / 'run')])
            self.assertEqual(code, 0)
            report = json.loads((temp / 'run/results.json').read_text())
            self.assertEqual(report['adapter'], 'ollama-local-v1')
            self.assertEqual(report['summary']['usage_sources'], ['provider'])
            self.assertEqual(report['summary']['estimated_cost_usd'], 0)
            with redirect_stderr(io.StringIO()):
                code = workflow.main(['baseline', '--adapter', 'ollama', '--model', 'tiny',
                                      '--out', str(temp / 'invalid-prices')])
            self.assertEqual(code, 2)
            self.assertFalse((temp / 'invalid-prices').exists())


if __name__ == '__main__':
    unittest.main()
