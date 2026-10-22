import json
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

from coding_context import source_page, choose_sources, request_context
from coding_agent import run_validators, source_paths
from usage_accounting import codex_usage, provider_usage, estimated_cost
from workflow_setup import identity, preflight
from evidence_report import report, package


def git(repo, *args):
    return subprocess.check_output(['git', '-C', str(repo), *args], text=True).strip()


def repository(root):
    repo = (root / 'repo').resolve(); repo.mkdir()
    git(repo, 'init', '-q');git(repo, 'config', 'user.name', 'Test');git(repo, 'config', 'user.email', 'test@example.invalid')
    (repo / 'package.json').write_text('{}')
    git(repo, 'add', '.');git(repo, '-c', 'core.hooksPath=/dev/null', 'commit', '-qm', 'base')
    return repo


class SetupTests(unittest.TestCase):
    def test_identity_rejects_wrong_base_branch_and_missing_values_without_mutation(self):
        with tempfile.TemporaryDirectory() as tmp:
            repo = repository(Path(tmp));base = git(repo, 'rev-parse', 'HEAD');branch = git(repo, 'branch', '--show-current')
            self.assertEqual(identity(repo, base, branch)['base_commit'], base)
            for a, b in [(None, branch), (base, None), (base, 'wrong')]:
                with self.assertRaises(ValueError):identity(repo, a, b)
            self.assertEqual(git(repo, 'rev-parse', 'HEAD'), base)
            self.assertEqual(git(repo, 'status', '--porcelain'), '')

    def test_preflight_failure_saves_diagnostics_without_install_or_network(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp);repo = repository(root)
            def run(argv, **kwargs):
                if argv[0] == 'func':raise FileNotFoundError('missing func')
                return subprocess.CompletedProcess(argv, 0, 'v24.0.0' if argv[0] == 'node' else 'test', '')
            with patch('workflow_setup.subprocess.run', side_effect=run), patch('workflow_setup.socket.socket'):
                result = preflight(repo, 'HEAD', git(repo, 'branch', '--show-current'), root/'preflight')
            self.assertFalse(result['passed'])
            self.assertTrue((root/'preflight/func.log').exists())
            self.assertIn('func', [r['name'] for r in result['checks'] if not r['passed']])
            self.assertEqual(git(repo, 'status', '--porcelain'), '')


class ContextEfficiencyTests(unittest.TestCase):
    def test_large_sources_are_bounded_and_exact_later_pages_retrievable(self):
        with tempfile.TemporaryDirectory() as tmp:
            repo = Path(tmp).resolve();(repo/'large.ts').write_text('x'*15000 + 'TAIL')
            page = source_page(repo, 'large.ts', {'large.ts'})
            self.assertLess(len(page), 10300);self.assertIn('more=True', page)
            self.assertIn('TAIL', source_page(repo, '@source/large.ts:15000:20', {'large.ts'}))
            with self.assertRaises(ValueError):source_page(repo, '@source/../secret:0:1', {'large.ts'})
            with self.assertRaises(ValueError):source_page(repo, '@source/large.ts:0:99999', {'large.ts'})

    def test_unknown_repairs_load_contracts_and_explicit_reads_not_all_sources(self):
        names = ['package.json', 'a.ts', 'b.ts']
        self.assertEqual(choose_sources({}, 'relevant_context', names, set(), {'b.ts'}, {'target':'a.ts'}), set(names))
        self.assertEqual(choose_sources({}, 'relevant_context', names, set(), set(), {'target':'a.ts'}), {'package.json', 'a.ts'})

    def test_archived_runs_and_skill_catalogs_are_excluded_from_inventory(self):
        names = ['apps/api/src/index.ts', 'apps/docs/evidence/huge.md', 'apps/docs/skills/SKILL.md', 'AGENTS.md']
        with patch('coding_agent.coding_task.git', return_value='\0'.join(names)):
            self.assertEqual(source_paths(Path('.')), ['AGENTS.md', 'apps/api/src/index.ts'])

    def test_success_summary_shows_exit_and_log_without_repeating_output(self):
        text = request_context({'current_files':{},'requested_logs':{},'implementation_progress':{},'validation_feedback':{'commands':[{'stage':'build','exit_code':0,'log':'repair-01/00.log','output':'NOISE'*500}]}})
        self.assertNotIn('NOISE',text);self.assertIn('repair-01/00.log',text);self.assertIn('exit_code',text)


class ValidatorEfficiencyTests(unittest.TestCase):
    def test_defer_then_reuse_then_invalidate_but_do_not_cache_failures(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp);repo=repository(root);out=root/'out';out.mkdir();(out/'verification').mkdir()
            source=repo/'apps/api/src/a.ts';source.parent.mkdir(parents=True);source.write_text('export const a=1;')
            changed={'apps/api/src/a.ts'};task={'defer_validation_until_planned_files':True,'implementation_steps':[{'path':'apps/api/src/a.ts'},{'path':'apps/docs/a.md'}]}
            def command(argv, repo, log, timeout):
                log.write_text('passed')
                return {'argv':argv,'exit_code':0,'seconds':.01}
            with patch('coding_agent.coding_task.command',side_effect=command) as runner:
                result=run_validators(repo,out,1,changed,task)
                self.assertEqual(runner.call_count,1);self.assertFalse(result['passed'])
                doc=repo/'apps/docs/a.md';doc.parent.mkdir(parents=True);doc.write_text('docs');changed.add('apps/docs/a.md')
                run_validators(repo,out,2,changed,task);self.assertEqual(runner.call_count,5)
                run_validators(repo,out,3,changed,task);self.assertEqual(runner.call_count,6) # format only; full gates never use this cache
                source.write_text('export const a=2;');run_validators(repo,out,4,changed,task);self.assertEqual(runner.call_count,10)

    def test_failure_is_rerun_without_source_change(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp);repo=repository(root);out=root/'out';out.mkdir()
            def command(argv,repo,log,timeout):
                log.write_text('failure');return {'argv':argv,'exit_code':1,'seconds':.01}
            with patch('coding_agent.coding_task.command',side_effect=command) as runner:
                run_validators(repo,out,1,set());run_validators(repo,out,2,set());self.assertEqual(runner.call_count,2)


class UsageTests(unittest.TestCase):
    def log(self, path, complete=True):
        def usage(n):return {'input_tokens':n,'cached_input_tokens':n//2,'output_tokens':n//10,'reasoning_output_tokens':n//20,'total_tokens':n+n//10}
        def row(kind,payload):return {'timestamp':'2026-10-14T19:00:00Z','type':kind,'payload':payload}
        def count(n,first=False):return row('event_msg',{'type':'token_count','info':{'total_token_usage':usage(n),'last_token_usage':usage(n if first else 100)}})
        rows=[row('event_msg',{'type':'task_started','turn_id':'original'}),count(100,True),count(200)]
        if complete:rows += [row('response_item',{'type':'message','role':'assistant','phase':'final_answer'}),count(300),row('event_msg',{'type':'task_complete','turn_id':'original'})]
        rows += [row('event_msg',{'type':'task_started','turn_id':'followup'}),count(999900)]
        path.write_text('\n'.join(json.dumps(r) for r in rows)+'\n')

    def test_original_final_response_included_followup_excluded_without_summing_snapshots(self):
        with tempfile.TemporaryDirectory() as tmp:
            p=Path(tmp)/'session.jsonl';self.log(p)
            u=codex_usage(p,'original');self.assertTrue(u['complete']);self.assertEqual(u['measured_usage']['total_tokens'],330)
            self.assertEqual(u['measured_usage']['cached_input_tokens'],150)

    def test_original_pending_final_stays_incomplete_even_when_followup_has_counters(self):
        with tempfile.TemporaryDirectory() as tmp:
            p=Path(tmp)/'session.jsonl';self.log(p,False)
            u=codex_usage(p,'original');self.assertFalse(u['complete']);self.assertEqual(u['measured_usage']['total_tokens'],220)
            self.assertIn('original final-response usage pending',u['missing_usage'])

    def test_subsequent_turn_uses_observed_baseline(self):
        with tempfile.TemporaryDirectory() as tmp:
            p=Path(tmp)/'session.jsonl';self.log(p)
            u=codex_usage(p,'followup');self.assertEqual(u['measured_usage']['input_tokens'],999600)
            self.assertEqual(u['baseline']['basis'],'observed cumulative token_count before original task')

    def test_unknown_provider_counters_and_pricing_never_become_zero(self):
        u=provider_usage({'complete':False,'calls':[{'source':'provider','input_tokens':100,'output_tokens':10,'cached_tokens':None}]})
        self.assertIsNone(u['measured_usage']['cached_input_tokens']);self.assertFalse(u['complete'])
        rates={'input':2.,'cached_input':.1,'output':10.}
        self.assertIsNone(estimated_cost(u,rates)['estimated_usd'])
        with self.assertRaises(ValueError):estimated_cost(u,dict(rates,input=-1))

    def test_known_cost_does_not_double_count_cached_or_reasoning(self):
        u={'complete':True,'measured_usage':{'input_tokens':2359033,'cached_input_tokens':2270976,'output_tokens':17585,'reasoning_output_tokens':2393}}
        rates={'input':2,'cached_input':.1,'output':10,'cache_writes_in_input_rate':True,'long_context_adjustment_required':False}
        self.assertAlmostEqual(estimated_cost(u,rates)['estimated_usd'],.5790616)


class ReportTests(unittest.TestCase):
    def test_report_preserves_template_reviewer_blanks_estimates_and_archive_hashes(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp);out=root/'evidence';(out/'run').mkdir(parents=True)
            (out/'trial.json').write_text(json.dumps({'label':'v7.12.01','projection':{'total_tokens':250000}}))
            (out/'run/task.json').write_text(json.dumps({'version':'v7.12.01','id':'fixture','settings':{'model':'fixture'}}))
            value=report(out);self.assertFalse(value['usage_complete'])
            text=(out/'evaluation-run-record.md').read_text();self.assertIn('250000',text);self.assertIn('(leave blank for now)',text)
            archive=root/'archive.zip';result=package(out,archive);self.assertTrue(archive.exists());self.assertGreater(result['files'],0)
            with self.assertRaises(ValueError):package(out,out/'archive.zip')
            (out/'unsafe').symlink_to(root/'private')
            with self.assertRaises(ValueError):package(out,root/'second.zip')


if __name__ == '__main__':unittest.main()
