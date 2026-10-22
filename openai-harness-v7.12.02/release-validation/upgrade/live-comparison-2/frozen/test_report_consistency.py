"""Final report agreement and safe explicit export without model calls."""
import hashlib
import json
from pathlib import Path
import tempfile
import unittest
from evidence_report import report, export_report


def fixture(root, passed=False):
    repo = root / 'repo'; repo.mkdir()
    evidence = root / 'evidence'; (evidence / 'run').mkdir(parents=True)
    def save(name, value):
        (evidence / name).write_text(json.dumps(value))
    save('trial.json', {'identity': {'repo': str(repo)}, 'source_hashes': {'manifest.py': 'declared'}})
    (evidence / 'frozen').mkdir()
    (evidence / 'frozen/manifest.py').write_text('# controller\n')
    save('run/task.json', {'id': 'fixture', 'settings': {'model': 'fixture-model'}, 'controlled_workflow': {'required': True}})
    save('run/state.json', {'repo': str(repo)})
    save('run/result.json', {'passed': True, 'checks': [{'exit_code': 0}]})
    calls = [{'actor': actor, 'source': 'provider', 'model': 'fixture-model', 'input_tokens': 10,
              'output_tokens': 2, 'total_tokens': 12, 'cached_tokens': 0, 'reasoning_output_tokens': 0}
             for actor in ('primary', 'reviewer')]
    save('run/provider-usage.json', {'complete': True, 'calls': calls})
    save('comparison-record.json', {'controlled_eligible': passed, 'eligibility_reasons': [] if passed else ['Review failed.']})
    save('run/controlled-review.json', {'model_dispatched': True, 'passed': passed, 'scope_complete': True,
                                       'findings': [] if passed else ['a.ts:1 missing behavior']})
    return repo, evidence


class ReportConsistencyTests(unittest.TestCase):
    def test_failed_review_blocks_completion_and_rubric_assignment(self):
        with tempfile.TemporaryDirectory() as tmp:
            _, evidence = fixture(Path(tmp).resolve()); report(evidence)
            text = (evidence / 'evaluation-run-record.md').read_text()
            self.assertIn('| Requirements Completed / Attempted | Not established;', text)
            self.assertIn('fixture-model; controller-dispatched fresh review', text)
            self.assertIn('a.ts:1 missing behavior', text)
            self.assertIn('| Final Rubric Score | Not assigned;', text)
            self.assertFalse(json.loads((evidence / 'report-snapshot.json').read_text())['completed'])

    def test_rerender_is_idempotent_and_export_is_byte_identical(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp).resolve(); _, evidence = fixture(root, True); report(evidence)
            names = ('evaluation-run-record.md', 'usage.json', 'efficiency.json', 'projection.json', 'cost-estimate.json', 'report-snapshot.json')
            before = {name: (evidence / name).read_bytes() for name in names}
            report(evidence)
            self.assertEqual(before, {name: (evidence / name).read_bytes() for name in names})
            exported = export_report(evidence, root / 'root-evaluation.md')
            self.assertEqual((root / 'root-evaluation.md').read_bytes(), before['evaluation-run-record.md'])
            self.assertEqual(exported['sha256'], hashlib.sha256(before['evaluation-run-record.md']).hexdigest())

    def test_manifest_changes_and_output_changes_block_stale_exports(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp).resolve(); _, evidence = fixture(root); report(evidence)
            (evidence / 'frozen/manifest.py').write_text('# changed\n')
            with self.assertRaisesRegex(ValueError, 'stale'):
                export_report(evidence, root / 'report.md')
            report(evidence); (evidence / 'usage.json').write_text('{}')
            with self.assertRaisesRegex(ValueError, 'output changed'):
                export_report(evidence, root / 'report.md')

    def test_checkout_missing_parent_and_symlinks_are_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp).resolve(); repo, evidence = fixture(root); report(evidence)
            with self.assertRaisesRegex(ValueError, 'contaminate'):
                export_report(evidence, repo / 'EVALUATION.md')
            with self.assertRaisesRegex(ValueError, 'existing parent'):
                export_report(evidence, root / 'absent/report.md')
            target = root / 'target.md'; target.write_text('original')
            link = root / 'link.md'; link.symlink_to(target)
            with self.assertRaisesRegex(ValueError, 'symlink'):
                export_report(evidence, link)
            linked = root / 'linked'; linked.symlink_to(repo, target_is_directory=True)
            with self.assertRaisesRegex(ValueError, 'symlink'):
                export_report(evidence, linked / 'report.md')
            self.assertEqual(target.read_text(), 'original')


if __name__ == '__main__':
    unittest.main()
