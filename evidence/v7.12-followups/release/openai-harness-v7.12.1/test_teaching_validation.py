"""Developer fixtures only; these tests supply no human or learner evidence."""
import copy,json,tempfile,unittest
from pathlib import Path
from unittest.mock import patch
from common import estimate,usage
from model_adapters import ModelError
from quality import teaching_checks,validate_rubric
import teaching_review as review
import teaching_sessions as sessions
import teaching_validation as validation
from teaching_study import content_release
from test_teaching_focus import fixture
ROOT=Path(__file__).resolve().parent
DEV=json.loads((ROOT/'teaching-grader-development.json').read_text())
DEMO=json.loads((ROOT/'teaching-sessions-demo.json').read_text())
SETTINGS=json.loads((ROOT/'teaching-sessions-demo-settings.json').read_text())
class TeachingValidationTests(unittest.TestCase):
    def test_calibration_reports_confusion_and_rejects_holdout_tuning(self):
        r=validation.calibrate(DEV)
        self.assertEqual(r['status'],'matches_labels');self.assertEqual(r['examples'],27)
        self.assertEqual(r['confusion'],dict(true_positive=12,true_negative=15,false_positive=0,false_negative=0))
        bad=copy.deepcopy(DEV);bad['cases'][0]['rubric']['numeric']['energy']['value']=2
        self.assertGreater(validation.calibrate(bad)['confusion']['false_negative'],0)
        bad['split']='evaluation'
        with self.assertRaisesRegex(ValueError,'development'):validation.calibrate(bad)
    def test_numeric_schema_and_optional_capture_fail_closed(self):
        rubric=copy.deepcopy(DEV['cases'][0]['rubric'])
        for edit in ({'scope':'everything'},{'units':[]},{'pattern':'(?P<value>2)'}):
            bad=copy.deepcopy(rubric);bad['numeric']['capacity'].update(edit)
            with self.assertRaises(ValueError):validate_rubric(bad)
        rubric['numeric']['capacity']['pattern']=r'capacity(?P<value>2)?(?P<unit>J)?'
        r=teaching_checks(rubric,'capacity')
        self.assertFalse(r['numeric:capacity']);self.assertFalse(r['units:capacity'])
    def test_independence_and_all_claims_gate(self):
        for flag in ('all_claims_checked','independent_review','variant_and_usage_hidden'):
            report,pack,_=fixture()
            for item in pack['items']:item['checks'][flag]=False
            r=review.assess(report,pack)
            self.assertFalse(r['recommended_variants'])
            self.assertTrue(all(not s['lesson_quality_passed'] for s in r['summaries']))
    def test_actual_history_and_review_context_integrity(self):
        with tempfile.TemporaryDirectory() as temp:r=sessions.run(DEMO,SETTINGS,Path(temp)/'r.json')
        self.assertEqual(len(r['calls']),6);self.assertTrue(all(x['automatic_success'] for x in r['workflow_summary']))
        for i in (0,3):
            first,second=r['calls'][i:i+2];history=second['request']['input']
            self.assertEqual(history[-2],dict(role='assistant',content=first['output']))
            self.assertIn('metric',history[1]['content']);self.assertNotIn('rubric',json.dumps(second['request']))
            self.assertNotIn('demo_output',json.dumps(second['request']))
        pack=review.review_pack(r);pack['items'][0]['conversation_context'][0]['content']='forged'
        with self.assertRaisesRegex(ValueError,'conversation was modified'):review.assess(r,pack)
    def test_budget_before_call_and_failed_usage_retained(self):
        with tempfile.TemporaryDirectory() as temp:
            r=sessions.run(DEMO,{**SETTINGS,'token_budget':1},Path(temp)/'a.json')
            self.assertEqual(r['status'],'error');self.assertFalse(r['calls'])
            class Fail:
                def call(self,method,request):
                    if method=='count':return dict(tokens=estimate(request),source='unit_fixture')
                    raise ModelError('unit failure',usage=usage(10,2,None,'provider'))
            r=sessions.run(DEMO,{**SETTINGS,'adapter':'ollama'},Path(temp)/'b.json',Fail())
            self.assertEqual(r['status'],'error');self.assertEqual(len(r['calls']),1)
            self.assertEqual(r['calls'][0]['usage']['total_tokens'],12)
            self.assertTrue(all(not s['eligible'] for s in r['summary']))
    def test_freeze_rejects_changed_files_settings_and_wrong_copy(self):
        with tempfile.TemporaryDirectory() as temp:
            d=Path(temp)/'freeze';validation.freeze(ROOT/'teaching-sessions-demo.json',SETTINGS,d)
            args=(d/'freeze.json',d/'source/teaching-sessions-demo.json',SETTINGS)
            with self.assertRaisesRegex(ValueError,'frozen source copy'):validation.verify_freeze(*args)
            with patch.object(validation,'ROOT',d/'source'):
                validation.verify_freeze(*args)
                with self.assertRaisesRegex(ValueError,'settings differ'):validation.verify_freeze(args[0],args[1],{**SETTINGS,'temperature':1})
                (d/'source/quality.py').write_text('changed')
                with self.assertRaisesRegex(ValueError,'file changed'):validation.verify_freeze(*args)
    def test_total_effort_accounts_for_repairs_retries_humans_and_unknowns(self):
        report=dict(status='completed',calls=[dict(id='base',stage='lesson',usage=usage(10,2,4,'provider'),model='test')])
        log=validation.effort_template(report);r=validation.effort_summary(report,log)
        self.assertFalse(r['model_accounting_complete']);self.assertIsNone(r['estimated_combined_cost_usd'])
        log.update(external_calls_complete=True,human_time_complete=True,human_hourly_rate_usd=60,
            prices={'test':dict(source_url='https://example.invalid/unit-fixture',as_of='unit fixture',input_per_million=2,cached_input_per_million=1,output_per_million=3)})
        log['external_calls']=[dict(id='repair',stage='repair',usage=usage(8,2,0,'provider'),model='test'),dict(id='retry',stage='retry',usage=usage(4,1,0,'provider'),model='test')]
        log['human_activities']=[dict(id='r',kind='review',minutes=5,actor='unit fixture'),dict(id='c',kind='correction',minutes=2,actor='unit fixture')]
        r=validation.effort_summary(report,log)
        self.assertEqual(r['known_total_tokens'],27);self.assertEqual(r['known_human_minutes'],7)
        self.assertAlmostEqual(r['estimated_model_cost_usd'],.000055)
        self.assertAlmostEqual(r['estimated_combined_cost_usd'],7.000055)
        log['external_calls'][1]['usage']=None;r=validation.effort_summary(report,log)
        self.assertEqual(r['unknown_usage_calls'],1);self.assertIsNone(r['estimated_model_cost_usd'])
        log['external_calls'][0]['id']='base'
        with self.assertRaisesRegex(ValueError,'Duplicate call'):validation.effort_summary(report,log)
    def test_exact_independent_content_approvals(self):
        p=dict(forms_hash='forms',lesson_hashes={'a':'lesson'});self.assertFalse(content_release(p,None)['ready'])
        s=dict(forms_hash='forms',forms_approved_by='unit fixture',items=[dict(answer_hash='lesson',reviewer='unit fixture',reviewer_type='ai',all_claims_checked=True,independent_review=True,variant_and_usage_hidden=True,approved=True)])
        self.assertFalse(content_release(p,s)['ready']);s['items'][0]['reviewer_type']='human'
        self.assertTrue(content_release(p,s)['ready']);s['items'][0]['answer_hash']='changed'
        with self.assertRaisesRegex(ValueError,'exact lesson'):content_release(p,s)
if __name__=='__main__':unittest.main()
