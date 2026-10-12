import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest
from coding_plan import progress, contract_paths, diagnostics


class PlanTests(unittest.TestCase):
    def test_native_schema_restricts_writes_to_controller_target(self):
        from coding_agent import JsonAdapter
        adapter = JsonAdapter()
        adapter.guarded_target = 'apps/api/src/index.ts'
        payload = adapter.payload({'model': 'fixture', 'input': [{'role': 'user', 'content': 'fixed task'}], 'max_output_tokens': 100})
        self.assertEqual(payload['format']['properties']['path']['enum'], ['', 'apps/api/src/index.ts'])

    def test_written_files_are_not_labeled_verified(self):
        with tempfile.TemporaryDirectory() as tmp:
            repo = Path(tmp); (repo / 'a.ts').write_text('a')
            task = {'implementation_steps': [{'path': 'a.ts', 'instruction': 'a'}, {'path': 'b.ts', 'instruction': 'b'}]}
            result = progress(task, repo, {'a.ts'}, {'passed': False}, [])
            self.assertEqual(result['target'], 'b.ts')
            self.assertIn('a.ts', result['written_unverified'])

    def test_contracts_include_public_exports_and_manifest(self):
        names = ['packages/axc/rest/package.json', 'packages/axc/application-services/package.json', 'packages/axc/application-services/src/index.ts']
        self.assertEqual(contract_paths(names, 'packages/axc/rest/src/index.ts'), set(names))

    def test_command_arguments_do_not_select_a_false_diagnostic(self):
        feedback = {'commands': [{'argv': ['check', 'apps/api/src/index.ts'], 'exit_code': 1, 'output': 'packages/axc/application-services/src/course.ts:3 bad type'}]}
        self.assertEqual(diagnostics(feedback, ['apps/api/src/index.ts', 'packages/axc/application-services/src/course.ts']), ['packages/axc/application-services/src/course.ts'])

    def test_ambiguous_package_relative_diagnostic_is_not_guessed(self):
        feedback = {'commands': [{'exit_code': 1, 'output': 'src/index.ts:3 bad type'}]}
        self.assertEqual(diagnostics(feedback, ['apps/api/src/index.ts', 'packages/axc/rest/src/index.ts']), [])


@unittest.skipUnless(os.environ.get('HARNESS_TEST_TYPESCRIPT') and shutil.which('node'), 'Set HARNESS_TEST_TYPESCRIPT to an installed TypeScript module to exercise AST contracts')
class SyntaxContractTests(unittest.TestCase):
    def check(self, original, content):
        with tempfile.TemporaryDirectory() as tmp:
            repo = Path(tmp); (repo / 'node_modules').mkdir()
            (repo / 'node_modules/typescript').symlink_to(Path(os.environ['HARNESS_TEST_TYPESCRIPT']).parent.parent)
            (repo / 'package.json').write_text('{}')
            return subprocess.run(['node', str(Path(__file__).with_name('source_contracts.mjs'))], input=json.dumps({'repo': str(repo), 'path': 'index.ts', 'original': original, 'content': content}), text=True, capture_output=True)

    def test_export_loss_and_syntax_error_are_rejected(self):
        self.assertNotEqual(self.check('export const health = 1;', 'export const course = 1;').returncode, 0)
        self.assertNotEqual(self.check('', 'export const broken = ;').returncode, 0)

    def test_additive_source_and_exported_destructuring_pass(self):
        result = self.check('export const {health} = {health:1};', 'export const {health} = {health:1}; export const course = 2;')
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_self_import_rejected(self):
        self.assertNotEqual(self.check('', "import {x} from './index.ts'; export const y = x;").returncode, 0)
