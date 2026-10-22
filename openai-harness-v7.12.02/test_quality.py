"""Output contract, adversarial teaching checks and adoption-gate regressions."""
import copy
import io
import json
import tempfile
import unittest
from contextlib import redirect_stderr
from pathlib import Path

import harness
import teaching_review
import workflow as w
from model_adapters import MockAdapter
from quality import json_answer
from test_harness import exercise, TEACHING

ROOT=Path(__file__).resolve().parent
CONFIG=json.loads((ROOT/'workflow-config.json').read_text())
V2=harness.validate(json.loads((ROOT/'teaching-tune-v2.json').read_text()))
SPEED=V2['cases'][0]
GOOD='''Core: A speed divides distance by time; convert both units.
Example: 1 km = 1000 m and 1 hour = 3600 seconds. 90 * 1000 / 3600 = 25 m/s.
Misconception: Converting distance alone leaves time in hours.
Check: What is 72 km/h in m/s?'''

def task():
    return dict(id='contract',category='test',request='Requested fields: answer',history=[],
                documents=[dict(id='answer',text='answer=1')],tool_results=[],expected={'answer':1})

class QualityChecks(unittest.TestCase):
    def test_v2_invalid_patterns_fail_during_validation(self):
        for field in ('transfer_answer', 'numeric'):
            suite=copy.deepcopy(V2)
            if field=='transfer_answer': suite['cases'][0]['rubric'][field]=['[']
            else: suite['cases'][0]['rubric'][field]['speed']['pattern']='['
            with self.assertRaisesRegex(ValueError,'Invalid version 2 pattern'):harness.validate(suite)

    def test_median_condition_accepts_equivalent_concrete_wording(self):
        case=V2['cases'][2]
        answer=('Core: A mean uses every value; a median uses the middle sorted position. '
                'Example: For the sorted list 2, 3, 3, 4, 28, the mean is 40/5 = 8 and median is 3. '
                'Changing 28 to a larger number increases the mean but leaves the middle position fixed. '
                'Misconception: Editing the middle value can change the median. '
                'Check: If 28 changes to 38, which average stays unchanged?')
        self.assertTrue(harness.grade(case,answer)['passed'])
        for invalid in ('smaller number','different number'):
            self.assertIn('required:conditional_median',
                          harness.grade(case,answer.replace('larger number',invalid))['failed_checks'])

    def test_scope_defaults_and_positive_factor_are_required(self):
        loop=V2['cases'][4]
        answer=('Core: With a positive stop and default step of 1, range starts at zero. '
                'Example: range(4) produces 0, 1, 2, and 3; the stop 4 is excluded. '
                'Misconception: The stop is a boundary, not a valid index. '
                'Check: What is the last index produced by range(6)?')
        self.assertTrue(harness.grade(loop,answer)['passed'])
        for omission in ('positive stop','step of 1','excluded'):
            self.assertFalse(harness.grade(loop,answer.replace(omission,''))['passed'])
        scale=V2['cases'][5]
        answer=('Core: For a positive quantity, a positive factor less than 1 reduces it. '
                'A factor greater than 1 increases it. Example: A quarter of 20 is 20 / 4 = 5. '
                'Misconception: Many people think multiplication always makes numbers bigger, '
                'but it depends on the factor. Check: What is 20 × 1.5, and is it larger or smaller than 20?')
        self.assertTrue(harness.grade(scale,answer)['passed'])
        self.assertFalse(harness.grade(scale,answer.replace('a positive factor','a factor'))['passed'])
        self.assertFalse(harness.grade(scale,answer.replace('Example:',
                         'Multiplication always makes numbers bigger. Example:'))['passed'])

    def test_json_fences_are_presentation_only_and_values_stay_strict(self):
        for answer in (' {"answer":1} ', '```json\n{"answer":1}\n```', '```\r\n{"answer":1}\r\n```'):
            self.assertTrue(w.check(task(),answer)[0])
        for answer in ('{"answer":true}','{"answer":1.0}','{"answer":"1"}','{"answer":1,"extra":2}',
                       '{}','```json\n{"answer":2}\n```'):
            self.assertFalse(w.check(task(),answer)[0],answer)

    def test_invalid_json_is_never_silently_repaired(self):
        for answer in ('Answer: {"answer":1}', '{"answer":1} trailing', '{"answer":1,}',
                       '{"answer":0,"answer":1}', '{"answer":{"a":1,"a":2}}', '{"answer":NaN}',
                       '{"answer":Infinity}', '{"answer":1e999}', '[{"answer":1}]',
                       '```python\n{"answer":1}\n```', '```json\n{"answer":1}\n```\nMore text.'):
            with self.subTest(answer=answer),self.assertRaises(ValueError): json_answer(answer)

    def test_fenced_success_uses_one_call_and_keeps_raw_text_and_usage(self):
        class Fenced(MockAdapter):
            def generate(self,request):
                r=super().generate(request);r['text']='```json\n'+r['text']+'\n```';return r
        result=w.execute(task(),CONFIG,['deduplicate'],Fenced(),'test')
        self.assertTrue(result['success'] and result['initial_success'])
        self.assertFalse(result['fallback']);self.assertEqual(len(result['calls']),1)
        self.assertEqual(result['attempts'][0]['normalized_output'],'{"answer":1}')
        self.assertTrue(result['attempts'][0]['output'].startswith('```'))
        self.assertEqual(result['summary']['total_tokens'],result['calls'][0]['usage']['total_tokens'])

    def test_identical_failed_fallback_is_skipped_without_claiming_success(self):
        class Wrong(MockAdapter):
            def generate(self,request):
                r=super().generate(request);r['text']='{"answer":2}';return r
        result=w.execute(task(),CONFIG,['deduplicate'],Wrong(),'test')
        self.assertFalse(result['success']);self.assertFalse(result['fallback'])
        self.assertEqual(len(result['calls']),1)
        self.assertTrue(any(e['kind']=='fallback_skipped' for e in result['events']))

    def test_changed_context_retains_genuine_fallback(self):
        class OnceWrong(MockAdapter):
            def __init__(self): super().__init__();self.n=0
            def generate(self,request):
                self.n+=1;r=super().generate(request)
                if self.n==1:r['text']='{"answer":2}'
                return r
        t=task();t['documents'].append(dict(id='noise',text='unrelated supplies'))
        config=copy.deepcopy(CONFIG);config['optimization']['top_k']=1
        result=w.execute(t,config,['retrieve'],OnceWrong(),'test')
        self.assertTrue(result['success'] and result['fallback'])
        self.assertFalse(result['initial_success']);self.assertEqual(len(result['calls']),2)

    def test_identical_first_prompt_does_not_skip_tool_workflow_recovery(self):
        class ToolFailure(MockAdapter):
            def __init__(self): super().__init__();self.n=0
            def generate(self,request):
                self.n+=1;r=super().generate(request)
                if self.n==1:
                    r['text']=''
                    r['items']=[dict(type='function_call',call_id='bad-ref',name='read_detail',
                                     arguments='{"ref":"missing","start":0,"limit":1}')]
                return r
        result=w.execute(task(),CONFIG,['deduplicate'],ToolFailure(),'test')
        self.assertTrue(result['success'] and result['fallback'])
        self.assertFalse(result['initial_success']);self.assertEqual(len(result['calls']),2)

    def test_teaching_normalizes_typography_without_losing_numbers_or_units(self):
        formatted=GOOD.replace('Core:','**Core:**').replace('Example:','**Example:**')
        formatted=formatted.replace('3600','3,600').replace('25 m/s',r'25\text{ m/s}')
        self.assertTrue(harness.grade(SPEED,formatted)['passed'])
        for bad in (formatted.replace('25', '26'),formatted.replace('m/s','km/h'),formatted.replace('3,600','3,500')):
            self.assertFalse(harness.grade(SPEED,bad)['passed'])

    def test_correct_value_cannot_hide_a_conflicting_numeric_claim(self):
        bad=GOOD.replace('25 m/s.','25 m/s. The speed is 26 m/s.')
        self.assertIn('numeric:speed',harness.grade(SPEED,bad)['failed_checks'])

    def test_transfer_question_is_exact_final_and_unanswered(self):
        for answer in (GOOD+' The answer is 20 m/s.',GOOD.replace('72','36'),
                       GOOD.replace('Misconception:','The next answer is 20 m/s.\nMisconception:'),
                       GOOD.replace('Check:','Check: Check:')):
            self.assertFalse(harness.grade(SPEED,answer)['passed'])

    def test_question_cannot_supply_missing_lesson_facts(self):
        c=copy.deepcopy(SPEED);c['rubric']['required']['missing']='72'
        self.assertIn('required:missing',harness.grade(c,GOOD)['failed_checks'])

    def test_critical_failures_cannot_be_waived_with_a_lower_pass_threshold(self):
        suite=copy.deepcopy(V2);suite['cases']=[copy.deepcopy(SPEED)]
        rows=[]
        for variant in suite['variants']:
            for repeat in (1,2):
                output=GOOD if variant['name']=='baseline' or repeat==1 else GOOD.replace('25 m/s','26 m/s')
                row=dict(variant=variant['name'],case=SPEED['id'],repeat=repeat,input_tokens=100,
                         output_tokens=100 if variant['name']=='baseline' else 50,total_tokens=200 if variant['name']=='baseline' else 150,
                         cached_tokens=0,reasoning_tokens=None,latency_ms=1)
                row.update(harness.grade(SPEED,output));rows.append(row)
        summaries,winner=harness.summarize(suite,rows,2,.5,.1,objective='tokens')
        self.assertIsNone(winner);self.assertFalse(summaries[1]['eligible'])

    def test_duplicate_teaching_trials_do_not_make_a_complete_benchmark(self):
        report=exercise();rows=copy.deepcopy(report['rows']);rows[-1]=copy.deepcopy(rows[0])
        summary,winner=harness.summarize(report['suite'],rows,2,1,.1,objective='tokens')
        self.assertIsNone(winner);self.assertTrue(all(not s['eligible'] for s in summary))

    def test_human_gate_regrades_answers_and_rejects_forged_eligibility(self):
        report=exercise(suite=TEACHING,repeat=1,optimize='output')
        report.update(mode='live',evaluation_hash=harness.evaluation_hash(report['suite']),min_savings=.99)
        report['summary'][1]['eligible']=True
        guide={c['id']:{} for c in report['suite']['cases']}
        reviews=teaching_review.review_pack(report,guide)
        for item in reviews['items']:
            item.update(reviewer='Unit-test fixture')
            item['ratings']={k:5 for k in teaching_review.RATINGS};item['checks']={k:True for k in teaching_review.CHECKS}
        result=teaching_review.assess(report,reviews,CONFIG['pricing'])
        self.assertIsNone(result['selected_variant']);self.assertIn('automatic quality/token gate failed',result['flags'])
        report['rows'][0]['passed']=not report['rows'][0]['passed']
        reviews=teaching_review.review_pack(report,guide)
        with self.assertRaisesRegex(ValueError,'Stored teaching grade'):
            teaching_review.assess(report,reviews,CONFIG['pricing'])

    def test_workflow_gates_reject_broken_baselines_and_forged_totals(self):
        config=copy.deepcopy(CONFIG);config['limits']['repetitions']=1
        with tempfile.TemporaryDirectory() as temp,redirect_stderr(io.StringIO()):
            dataset=dict(split='eval',tasks=[task()])
            baseline=w.benchmark(config,dataset,[],MockAdapter(),Path(temp)/'b')
            candidate=w.benchmark(config,dataset,['deduplicate'],MockAdapter(),Path(temp)/'c')
        broken=copy.deepcopy(baseline);broken['workflows'][0]['success']=False;broken['summary']=w.totals(broken['workflows'])
        result=w.compare(broken,candidate)
        self.assertFalse(result['gates']['quality']);self.assertFalse(result['accepted'])
        missing=copy.deepcopy(candidate);missing['planned_trials'].append(dict(task_id='missing',repetition=0,cache_trial='cold_attempt'))
        with self.assertRaisesRegex(ValueError,'trial coverage'):w.compare(baseline,missing)
        self.assertFalse(w.compare(baseline,candidate)['token_reduction_qualified'])
        candidate['summary']['total_tokens']-=1
        with self.assertRaisesRegex(ValueError,'ledger'):w.compare(baseline,candidate)

if __name__=='__main__':unittest.main()
