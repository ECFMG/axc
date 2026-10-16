"""Guarded batching and deterministic workflow proofs; no live model savings claim."""
import json
import hashlib
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

import coding_task
from coding_actions import decode_action
from coding_agent import JsonAdapter, safe_path, write_actions, run_validators
from coding_context import request_context, inventory_page, choose_sources
from coding_plan import progress
from coding_workflow import projection, finish, recover, review_packet, host_context
from usage_accounting import codex_usage, codex_sessions
from test_efficiency_release import repository
import test_efficiency_release


def action(files):
    return json.dumps({'path': '', 'content': '', 'edits': [], 'files': files, 'read_files': [], 'validate': False})


def counters(n):
    return dict(input_tokens=n, cached_input_tokens=0, output_tokens=n // 10,
                reasoning_output_tokens=0, total_tokens=n + n // 10)


def session(path, turn='original', inherited=False):
    def event(kind, **payload):
        return {'timestamp': '2026-10-15T00:00:00Z', 'type': 'event_msg', 'payload': {'type': kind, **payload}}
    def count(n):
        return event('token_count', info={'total_token_usage': counters(n), 'last_token_usage': counters(100)})
    rows = [event('task_started', turn_id='inherited')] if inherited else []
    rows += [event('task_started', turn_id=turn), count(100), count(100),
             {'timestamp': '2026-10-15T00:00:01Z', 'type': 'response_item',
              'payload': {'role': 'assistant', 'phase': 'final_answer'}},
             count(200), event('task_complete', turn_id=turn),
             event('task_started', turn_id='followup'), count(999900)]
    path.write_text('\n'.join(json.dumps(row) for row in rows) + '\n')


class Batching(unittest.TestCase):
    def test_two_guarded_files_apply_together_and_invalid_second_never_partially_writes(self):
        with tempfile.TemporaryDirectory() as tmp:
            repo = Path(tmp).resolve()
            files = [{'path': 'apps/api/a.ts', 'content': 'a', 'edits': []},
                     {'path': 'apps/api/b.ts', 'content': 'b', 'edits': []}]
            task = {'allowed_paths': ['apps/api/']}; state = {'existing_axc_directories': []}
            decoded, _, _ = decode_action(action(files), repo, safe_path, [f['path'] for f in files])
            write_actions(repo, decoded, task, state)
            self.assertEqual((repo / 'apps/api/b.ts').read_text(), 'b')
            files[0]['content'] = 'changed';files[1]['path'] = 'private/b.ts'
            decoded, _, _ = decode_action(action(files), repo, safe_path, [f['path'] for f in files])
            with self.assertRaises(ValueError):write_actions(repo, decoded, task, state)
            self.assertEqual((repo / 'apps/api/a.ts').read_text(), 'a')

    def test_duplicates_mixed_actions_outside_targets_and_oversized_batches_reject(self):
        with tempfile.TemporaryDirectory() as tmp:
            repo = Path(tmp).resolve();a = {'path': 'a.ts', 'content': 'a', 'edits': []}
            for files, targets in [([a, a], ['a.ts']), ([a], ['b.ts']), ([a, a, a], ['a.ts'])]:
                with self.assertRaises(ValueError):decode_action(action(files), repo, safe_path, targets)
            mixed = json.loads(action([a]));mixed.update(path='a.ts',content='a')
            with self.assertRaises(ValueError):decode_action(json.dumps(mixed), repo, safe_path, ['a.ts'])

    def test_plan_and_native_schema_expose_only_next_two_targets(self):
        with tempfile.TemporaryDirectory() as tmp:
            task = {'action_batch_size': 2, 'implementation_steps': [{'path': f'{i}.ts', 'instruction': str(i)} for i in range(3)]}
            planned = progress(task, Path(tmp), set(), {}, [])
            self.assertEqual(planned['targets'], ['0.ts', '1.ts'])
            adapter = JsonAdapter();adapter.guarded_targets = planned['targets']
            schema = adapter.payload({'model': 'fixture', 'input': [], 'max_output_tokens': 10})['format']
            self.assertEqual(schema['properties']['files']['items']['properties']['path']['enum'], ['0.ts', '1.ts'])
            self.assertEqual(choose_sources({}, 'relevant_context', ['0.ts','1.ts','2.ts'], set(), set(), planned), {'0.ts','1.ts'})

    def test_controller_finishes_four_files_in_two_guarded_write_calls(self):
        from unittest.mock import Mock
        from coding_agent import run
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp);repo=root/'repo';repo.mkdir();out=root/'run';out.mkdir()
            (out/'spec.md').write_text('Fixed specification.')
            paths=['apps/api/a.ts','apps/api/b.ts','apps/api/c.test.ts','apps/docs/courses.md']
            task={'prompt':'Fixed task.','allowed_paths':['apps/api/','apps/docs/'],
                  'action_batch_size':2,'projection':{'total_tokens':1},
                  'implementation_steps':[{'path':name,'instruction':'Implement '+name} for name in paths],
                  'settings':{'model':'fixture','context_tokens':10000,'timeout_seconds':1,
                              'temperature':0,'max_output_tokens':100,'max_calls':4,'token_budget':10000}}
            adapter=Mock();adapter.count.return_value={'tokens':100}
            adapter.reset_cache.return_value={'verified_unloaded':True}
            adapter.generate.side_effect=[{'model':'fixture','status':'completed','provider_duration_ns':{},
                'usage':{'input_tokens':100,'cached_tokens':0,'output_tokens':10,'total_tokens':110},
                'text':action([{'path':name,'content':'fixture source','edits':[]} for name in paths[i:i+2]])}
                for i in (0,2)]
            def validate(repo,out,index,changed,task):
                return {'passed':set(paths)==changed and all((repo/name).is_file() for name in paths)}
            with patch('coding_agent.coding_task.load',return_value=({'repo':str(repo),'existing_axc_directories':[]},task)), \
                 patch('coding_agent.source_paths',return_value=[]), \
                 patch('coding_agent.JsonAdapter',return_value=adapter), \
                 patch('coding_agent.run_validators',side_effect=validate):
                result=run(out,'relevant_context')
            self.assertEqual(adapter.generate.call_count,2);self.assertTrue(result['passed_local_checks'])
            self.assertEqual(len(result['changed_files']),4)
            self.assertTrue(json.loads((out/'projection-status.json').read_text())['projection_exceeded'])

    def test_inventory_is_retrievable_without_repeating_every_path_or_plan_instruction(self):
        names = [f'apps/api/file-{i}.ts' for i in range(200)]
        text = request_context({'files_available': names, 'current_files': {}, 'validation_feedback': {},
                                'requested_logs': {}, 'implementation_progress': {'remaining_requirements': ['DUPLICATED PLAN']}})
        self.assertNotIn(names[-1], text);self.assertNotIn('DUPLICATED PLAN', text)
        self.assertEqual(json.loads(inventory_page(names, '@inventory/180:20'))['paths'], names[180:])
        with self.assertRaises(ValueError):inventory_page(names, '@inventory/0:99999')

    def test_focused_local_checks_keep_repair_build_and_tests_but_oracle_is_final_only(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp);repo = repository(root);out = root/'run';out.mkdir()
            task = {'focused_local_validation': True}
            def command(argv, repo, log, timeout):
                log.write_text('passed');return {'argv':argv,'exit_code':0,'seconds':0}
            with patch('coding_agent.coding_task.command', side_effect=command) as run:
                result = run_validators(repo, out, 1, set(), task)
            self.assertEqual([r['stage'] for r in result['commands']], ['build','submitted_tests'])
            self.assertEqual(run.call_count, 2)
            self.assertFalse(result['passed'])  # Source, tests and docs still required.


class Accounting(unittest.TestCase):
    def test_duplicate_snapshots_do_not_inflate_calls_and_forked_counter_origin_is_measured(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp)/'rollout-11111111-1111-1111-1111-111111111111.jsonl'
            session(path, inherited=True);u = codex_usage(path, 'original')
            self.assertTrue(u['complete']);self.assertEqual(u['measured_usage']['total_tokens'],220)
            self.assertEqual(u['model_calls_recorded'],2);self.assertEqual(u['duplicate_counter_events'],1)
            self.assertEqual(u['session_id'],'11111111-1111-1111-1111-111111111111')

    def test_resumed_rollout_uses_thread_id_instead_of_window_suffix(self):
        with tempfile.TemporaryDirectory() as tmp:
            thread='11111111-1111-1111-1111-111111111111'
            path=Path(tmp)/('rollout-'+thread+'_22222222-2222-2222-2222-222222222222.jsonl')
            session(path)
            self.assertEqual(codex_usage(path,'original')['session_id'],thread)

    def test_independent_subagents_sum_deltas_and_duplicate_logs_fail_closed(self):
        with tempfile.TemporaryDirectory() as tmp:
            a,b = Path(tmp)/'primary.jsonl',Path(tmp)/'reviewer.jsonl';session(a);session(b)
            u = codex_sessions(a,'original',[(b,'original')])
            self.assertTrue(u['complete']);self.assertEqual(u['measured_usage']['total_tokens'],440)
            self.assertEqual(u['model_calls_recorded'],4)
            with self.assertRaises(ValueError):codex_sessions(a,'original',[(a,'followup')])

    def test_missing_request_events_keep_totals_but_do_not_claim_a_complete_call_count(self):
        with tempfile.TemporaryDirectory() as tmp:
            path=Path(tmp)/'session.jsonl';test_efficiency_release.UsageTests().log(path)
            rows=[json.loads(line) for line in path.read_text().splitlines()]
            rows=[row for row in rows if not (row.get('payload',{}).get('type')=='token_count' and row['payload']['info']['total_token_usage']['input_tokens']==200)]
            path.write_text('\n'.join(json.dumps(row) for row in rows)+'\n')
            u=codex_usage(path,'original');self.assertEqual(u['measured_usage']['total_tokens'],330)
            self.assertTrue(u['complete']);self.assertFalse(u['request_accounting_complete']);self.assertIsNone(u['model_calls_recorded'])

    def test_projection_accounts_for_repeated_input_and_rejects_ambiguous_inputs(self):
        self.assertEqual(projection(calls=10,input_per_call=5000,output_per_call=1000)['total_tokens'],60000)
        for kwargs in [{'calls':10}, {'calls':10,'input_per_call':5000,'output_per_call':1000,'total':1}, {'total':-1}]:
            with self.assertRaises(ValueError):projection(**kwargs)


class Workflow(unittest.TestCase):
    def test_finish_checks_once_even_after_execution_failure_and_packet_failure_does_not_hide_evidence(self):
        with tempfile.TemporaryDirectory() as tmp:
            with patch('run_task_a.execute',side_effect=ValueError('blocked')), \
                 patch('run_task_a.check',return_value={'passed':True}) as check, \
                 patch('coding_workflow.review_packet',side_effect=ValueError('scope violations')), \
                 patch('coding_workflow.package',return_value={'files':1}) as pack:
                result=finish(tmp,execute_agent=True,archive=Path(tmp)/'evidence.zip')
            check.assert_called_once();pack.assert_called_once()
            self.assertFalse(result['passed']);self.assertEqual(result['execution_error'],'blocked')
            self.assertEqual(result['review_packet_error'],'scope violations')

    def test_real_finish_and_recovery_cli_generate_all_evidence_without_model_or_revalidation(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp);repo=repository(root);out=root/'evidence';out.mkdir();source=Path(__file__).resolve().parent
            frozen=out/'frozen';frozen.mkdir()
            for path in source.iterdir():
                if path.is_file() and path.suffix in ('.py','.mjs','.json','.md'):shutil.copyfile(path,frozen/path.name)
            (repo/'spec.md').write_text('Fixed specification.');(repo/'prompt.md').write_text('Fixed task.')
            subprocess.run(['git','-C',str(repo),'add','.'],check=True,capture_output=True)
            subprocess.run(['git','-C',str(repo),'-c','core.hooksPath=/dev/null','commit','-qm','spec'],check=True,capture_output=True)
            marker=out/'gate-count.txt'
            task={'id':'controlled-fixture-not-task-a','version':'v7.12.02','spec':'spec.md','prompt':'Fixed task.',
                  'allowed_paths':['apps/api/'],'settings':{'model':'fixture'},'execution_environment':{'passed':True},
                  'checks':[[sys.executable,'-c',f"from pathlib import Path;p=Path({str(marker)!r});p.write_text(p.read_text()+'x' if p.exists() else 'x')"]]}
            taskfile=root/'task.json';taskfile.write_text(json.dumps(task));state=coding_task.begin(repo,taskfile,out/'run')
            (out/'trial.json').write_text(json.dumps({'label':'no_harness','execution':'external_no_harness',
                'repetition':1, 'report_template_sha256':hashlib.sha256((frozen/'EVALUATION_RUN_RECORD_TEMPLATE.md').read_bytes()).hexdigest(),
                'acceptance_sha256':'fixture','source_hashes':{},'tool_versions':{},'settings':task['settings'],
                'cache_policy':'fixture','projection':projection(calls=2,input_per_call=100,output_per_call=10)}))
            new=repo/'apps/api/course.ts';new.parent.mkdir(parents=True);new.write_text('export const course = 1;')
            cli=[sys.executable,'-B',str(source/'run_task_a.py')]
            completed=subprocess.run(cli+['finish','--evidence',str(out),'--archive',str(root/'evidence.zip')],text=True,capture_output=True)
            self.assertEqual(completed.returncode,0,completed.stderr);self.assertEqual(marker.read_text(),'x')
            self.assertTrue((root/'evidence.zip').is_file());self.assertTrue((out/'projection.json').is_file())
            packet=(out/'review-packet.txt').read_text();self.assertIn('course.ts',packet);self.assertIn('Fixed specification.',packet)
            self.assertFalse(json.loads((out/'review-packet.json').read_text())['reviewer_executed'])
            # Truncation must remain explicit and never claim a complete review scope.
            new.write_text('x'*25000);packet=review_packet(out,12000)
            self.assertTrue(packet['truncated']);self.assertFalse(packet['scope_complete'])
            path=root/'original.jsonl';session(path)
            completed=subprocess.run(cli+['recover','--evidence',str(out),'--codex-log',str(path),'--turn-id','original'],text=True,capture_output=True)
            self.assertEqual(completed.returncode,0,completed.stderr);self.assertEqual(marker.read_text(),'x')
            self.assertTrue(json.loads((out/'usage.json').read_text())['complete'])
            self.assertFalse(json.loads(completed.stdout)['validation_rerun'])


class NativeHost(unittest.TestCase):
    def test_external_prepare_is_explicit_and_never_routes_to_the_model_adapter(self):
        import run_task_a
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp);repo=repository(root);source=Path(__file__).resolve().parent
            shutil.copyfile(source/'task-set-a-requirements.md',repo/'task-set-a-requirements.md')
            subprocess.run(['git','-C',str(repo),'add','.'],check=True,capture_output=True)
            subprocess.run(['git','-C',str(repo),'-c','core.hooksPath=/dev/null','commit','-qm','fixed spec'],check=True,capture_output=True)
            base=subprocess.check_output(['git','-C',str(repo),'rev-parse','HEAD'],text=True).strip()
            branch=subprocess.check_output(['git','-C',str(repo),'branch','--show-current'],text=True).strip()
            out=root/'evidence'
            with patch('run_task_a.preflight',return_value={'passed':True,'checks':[]}):
                run_task_a.prepare(repo,out,base=base,branch=branch,external=True,
                                   expected_calls=10,input_tokens_per_call=5000,output_tokens_per_call=1000)
            frozen=json.loads((out/'run/task.json').read_text())
            self.assertNotIn('agent_command',frozen)
            self.assertEqual(json.loads((out/'trial.json').read_text())['execution'],'external_host')
            packet=host_context(out)
            self.assertFalse(packet['model_invoked']);self.assertTrue(Path(packet['packet']).is_file())
            self.assertEqual(packet['targets'],[step['path'] for step in frozen['implementation_steps'][:2]])
            with self.assertRaises(ValueError):run_task_a.execute(out)
            with self.assertRaises(ValueError):run_task_a.prepare(repo,root/'bad',no_harness=True,external=True)
            # A prior passing result must not be presented as current after source edits.
            new=repo/'apps/api/new.ts';new.parent.mkdir(parents=True,exist_ok=True);new.write_text('first')
            snapshots=out/'run/validation-001/files/apps/api';snapshots.mkdir(parents=True);(snapshots/'new.ts').write_text('first')
            (out/'run/result.json').write_text(json.dumps({'passed':True,'scope':{'changed_paths':['apps/api/new.ts']},
                'checks':[{'exit_code':0,'log':'validation-001/0.log'}]}))
            host_context(out);self.assertIn('"matches_current_files": true',(out/'host-context.txt').read_text())
            new.write_text('changed');host_context(out)
            self.assertIn('"matches_current_files": false',(out/'host-context.txt').read_text())
            trial=json.loads((out/'trial.json').read_text());trial['label']='no_harness'
            (out/'trial.json').write_text(json.dumps(trial))
            with self.assertRaises(ValueError):host_context(out)


if __name__=='__main__':unittest.main()
