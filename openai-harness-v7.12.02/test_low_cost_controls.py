"""Proof for bounded context and runtime readiness; no model calls."""
import hashlib
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
from coding_context import source_snapshot, source_page, request_context
from coding_plan import contract_paths
from coding_workflow import host_context
from workflow_setup import runtime_preflight, RUNTIME_CHECKS
from test_efficiency_release import repository, git

class LowCostControls(unittest.TestCase):
    def test_owner_test_context_excludes_other_packages(self):
        own='packages/axc/application-services'
        names=[own+'/package.json',own+'/vitest.config.ts',own+'/src/health.test.ts','apps/unrelated/vitest.config.ts']
        chosen=contract_paths(names,own+'/src/course.test.ts')
        self.assertIn(own+'/vitest.config.ts',chosen)
        self.assertIn(own+'/src/health.test.ts',chosen)
        self.assertNotIn('apps/unrelated/vitest.config.ts',chosen)

    def test_bounded_sources_keep_every_file_and_exact_retrieval(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp).resolve();texts={'small.ts':'small source','large.ts':'source content\n'*2000,'other.ts':'other source\n'*2000}
            for name,text in texts.items():(root/name).write_text(text)
            pages=source_snapshot(root,texts,texts,3000)
            original=source_snapshot(root,texts,texts)
            self.assertEqual(set(pages),set(texts))
            self.assertLessEqual(sum(map(len,pages.values())),3000)
            self.assertLess(sum(map(len,pages.values())),sum(map(len,original.values())))
            self.assertEqual(pages['small.ts'],texts['small.ts'])
            prefix,recovered=pages['large.ts'].split('\n',1)
            self.assertIn('retrieve=@source/large.ts:',prefix)
            while len(recovered)<len(texts['large.ts']):
                page=source_page(root,'@source/large.ts:%d:5000'%len(recovered),texts)
                recovered+=page.split('\n',1)[1]
            self.assertEqual(recovered,texts['large.ts'])

    def test_invalid_budgets_and_unsafe_paths_fail_closed(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp);(root/'a.ts').write_text('source');(root/'link.ts').symlink_to(root/'a.ts')
            for limit in [True,0,999,'12000']:
                with self.assertRaises(ValueError):source_snapshot(root,['a.ts'],['a.ts'],limit)
            with self.assertRaises(ValueError):source_snapshot(root,['link.ts'],['link.ts'],1000)
            names=['%d.ts'%i for i in range(20)]
            for name in names:(root/name).write_text('source')
            with self.assertRaises(ValueError):source_snapshot(root,names,names,1000)

    def test_request_deduplicates_instructions_not_evidence(self):
        payload=dict(current_files={'a.ts':'SOURCE'},requested_logs={'@source/a.ts:0:1':'EXACT PAGE'},validation_feedback={},implementation_progress={'targets':['a.ts'],'step':{'instruction':'INSTRUCTION'},'batch':[{'path':'a.ts','instruction':'INSTRUCTION'}],'remaining_requirements':['INSTRUCTION']})
        result=request_context(payload)
        self.assertEqual(result.count('INSTRUCTION'),1)
        self.assertIn('EXACT PAGE',result);self.assertIn('SOURCE',result)

    def test_native_packet_preserves_specs_and_requires_fresh_context(self):
        from test_native_efficiency import fixture
        with tempfile.TemporaryDirectory() as tmp:
            repo,out,_=fixture(Path(tmp));result=host_context(out);text=Path(result['packet']).read_text()
            self.assertIn('Fixed task.',text);self.assertIn('Fixed specification.',text)
            self.assertIn('do not inherit the original conversation',text)
            self.assertTrue(result['fresh_context_required']);self.assertFalse(result['model_invoked'])

    def runtime(self,repo,root,fail=False,mutate=False):
        commands=[]
        def command(argv,checkout,log,timeout):
            commands.append(argv);log.write_text('local baseline check')
            if mutate:(checkout/'package.json').write_text('{"changed":true}')
            return {'argv':argv,'exit_code':int(fail),'seconds':0}
        with patch('coding_task.command',side_effect=command):
            result=runtime_preflight(repo,'HEAD',git(repo,'branch','--show-current'),root/'runtime')
        return result,commands

    def test_runtime_pass_retains_final_gates_and_fresh_evidence(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp);repo=repository(root);result,commands=self.runtime(repo,root)
            self.assertTrue(result['passed']);self.assertFalse(result['model_invoked'])
            self.assertEqual(commands,RUNTIME_CHECKS);self.assertTrue(result['source_unchanged'])
            self.assertTrue(result['final_validation_required'])
            with self.assertRaises(FileExistsError):self.runtime(repo,root)

    def test_runtime_failures_and_source_mutation_block_readiness(self):
        for fail,mutate in [(True,False),(False,True)]:
            with self.subTest(fail=fail,mutate=mutate),tempfile.TemporaryDirectory() as tmp:
                root=Path(tmp);repo=repository(root);result,commands=self.runtime(repo,root,fail,mutate)
                self.assertFalse(result['passed'])
                if fail:self.assertEqual(len(commands),1)
                if mutate:self.assertFalse(result['source_unchanged'])

    def test_original_task_and_generation_limits_stay_fixed(self):
        root=Path(__file__).resolve().parent;old=root/'parent-v7.12.02'
        self.assertTrue(old.is_dir(), 'Packaged original .02 contracts required')
        previous=json.loads((old/'coding-task-set-a.json').read_text());new=json.loads((root/'coding-task-set-a.json').read_text())
        for key in ['settings','checks','allowed_paths','protected_paths','implementation_steps']:
            self.assertEqual(new[key],previous[key])
        for name in ['task-set-a-prompt.md','task-set-a-requirements.md','course_acceptance.mjs','task_a_gates.py']:
            self.assertEqual(hashlib.sha256((root/name).read_bytes()).hexdigest(),hashlib.sha256((old/name).read_bytes()).hexdigest())


    def test_prepare_stops_before_run_creation_after_runtime_failure(self):
        import run_task_a
        import shutil
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp);repo=repository(root)
            shutil.copy2(Path(__file__).with_name('task-set-a-requirements.md'),repo/'task-set-a-requirements.md')
            git(repo,'add','.');git(repo,'-c','core.hooksPath=/dev/null','commit','-qm','fixed spec')
            out=root/'evidence'
            with patch('run_task_a.preflight',return_value={'passed':True,'checks':[]}), patch('run_task_a.runtime_preflight',return_value={'passed':False}) as warmup:
                with self.assertRaisesRegex(ValueError,'Baseline runtime preflight failed'):
                    run_task_a.prepare(repo,out,base=git(repo,'rev-parse','HEAD'),branch=git(repo,'branch','--show-current'))
            warmup.assert_called_once()
            self.assertFalse((out/'run').exists())

    def test_identical_invalid_actions_stop_before_spending_remaining_calls(self):
        from coding_agent import run
        from unittest.mock import Mock
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp).resolve();repo=root/'repo';repo.mkdir();out=root/'run';out.mkdir();(out/'spec.md').write_text('Fixed spec.')
            task={'prompt':'Fixed prompt.','allowed_paths':['apps/api/'],'max_identical_action_errors':3,
                  'settings':{'model':'fixture','context_tokens':20000,'timeout_seconds':1,'temperature':0,'max_output_tokens':100,'max_calls':20,'token_budget':20000}}
            adapter=Mock();adapter.count.return_value={'tokens':100};adapter.reset_cache.return_value={}
            adapter.generate.return_value={'model':'fixture','status':'completed','provider_duration_ns':{},
                'usage':{'input_tokens':100,'output_tokens':10,'total_tokens':110},
                'text':json.dumps({'path':'apps/api/file.ts','content':'','edits':[],'read_files':[],'validate':True})}
            with patch('coding_agent.coding_task.load',return_value=({'repo':str(repo),'existing_axc_directories':[]},task)),patch('coding_agent.source_paths',return_value=[]),patch('coding_agent.JsonAdapter',return_value=adapter):
                result=run(out,'relevant_context')
            self.assertEqual(adapter.generate.call_count,3)
            self.assertFalse(result['passed_local_checks']);self.assertTrue(result['usage_complete'])
            self.assertIn('3 identical invalid actions',result['reason'])
            ledger=json.loads((out/'provider-usage.json').read_text());self.assertEqual(len(ledger['calls']),3)
            self.assertEqual(sum(c['total_tokens'] for c in ledger['calls']),330)
            self.assertFalse((repo/'apps/api/file.ts').exists())

    def test_cancellation_kills_detached_process_and_propagates_interrupt(self):
        import coding_task
        from unittest.mock import Mock
        import signal
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp);process=Mock();process.pid=123456;process.wait.side_effect=[KeyboardInterrupt(),0]
            with patch('coding_task.subprocess.Popen',return_value=process),patch('coding_task.os.killpg') as kill:
                with self.assertRaises(KeyboardInterrupt):coding_task.command(['fixture'],root,root/'log',10)
            kill.assert_called_once_with(123456,signal.SIGKILL)
            self.assertEqual(process.wait.call_count,2)
