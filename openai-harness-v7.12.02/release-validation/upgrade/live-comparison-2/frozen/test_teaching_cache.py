"""Cache protocol, teaching omissions and blinded worksheet checks."""
import copy
import json
from pathlib import Path
from unittest import TestCase
import harness
from common import digest
from teaching_cache import cache_evidence
from teaching_review import review_pack, render_worksheet
from test_harness import exercise
from ollama_adapter import OllamaAdapter
ROOT=Path(__file__).resolve().parent

class CacheAndTeachingChecks(TestCase):
    def test_reset_unloads_only_requested_model_and_verifies_absence(self):
        adapter=OllamaAdapter();calls=[]
        def http(path,payload=None):
            calls.append((path,payload))
            if path=='/api/version':return {'version':'0.34.4'}
            if path=='/api/tags':return {'models':[{'name':'tiny:latest','digest':'test'}]}
            if path=='/api/generate':return {'done':True,'done_reason':'unload'}
            return {'models':[{'name':'unrelated:latest'}]}
        adapter.http=http
        self.assertTrue(adapter.reset_cache('tiny')['verified_unloaded'])
        self.assertEqual(calls[2],('/api/generate',{'model':'tiny','keep_alive':0,'stream':False}))
        self.assertEqual(calls[-1][0],'/api/ps')
        adapter.http=lambda path,payload=None: {'done':True,'done_reason':'stop'} if path=='/api/generate' else http(path,payload)
        with self.assertRaisesRegex(ValueError,'acknowledged'):adapter.reset_cache('tiny')

    def test_cold_priming_and_warm_calls_are_counted_and_budgeted(self):
        suite=json.loads((ROOT/'teaching-quality-demo.json').read_text())
        provider=harness.demo_provider(suite);calls=[]
        def post(path,payload,key):
            calls.append(path)
            if path=='harness/cache_reset':return {'verified_unloaded':True,'latency_ms':1}
            result=provider(path,payload,key)
            if path=='responses' and calls[-2]=='responses':
                result['usage']['input_tokens_details']['cached_tokens']=result['usage']['input_tokens']
            return result
        report=exercise(suite=suite,objective='quality',repeat=1,demo=False,adapter='ollama',
                        context_tokens=8192,cache_trials=True,temperature=0,post=post)
        self.assertEqual(len(report['rows']),8);self.assertEqual(report['repeat'],2)
        self.assertEqual(calls.count('harness/cache_reset'),4)
        self.assertTrue(report['cache_evidence']['comparable'])
        self.assertEqual(report['planned_max_tokens'],sum(p['input_tokens']+p['max_output_tokens'] for p in report['preflight'])*2)
        for cold,warm in zip(report['rows'][::2],report['rows'][1::2]):self.assertEqual(cold['request_hash'],warm['request_hash'])
        limited=exercise(suite=suite,objective='quality',repeat=1,demo=False,adapter='ollama',
                         context_tokens=8192,cache_trials=True,token_budget=report['planned_max_tokens']-1,post=post)
        self.assertEqual(limited['status'],'error');self.assertEqual(limited['rows'],[])
        for changed in ('missing','cache','model','request','cold'):
            altered=copy.deepcopy(report)
            if changed=='missing':altered['rows'].pop()
            elif changed=='cache':altered['rows'][1]['cached_tokens']=0
            elif changed=='model':altered['rows'][1]['model']='other'
            elif changed=='request':altered['rows'][1]['request_hash']='other'
            else:altered['rows'][0]['cached_tokens']=1
            self.assertFalse(cache_evidence(altered)['comparable'])

    def test_known_omissions_and_valid_paraphrases_are_distinct(self):
        cases={c['id']:c for c in json.loads((ROOT/'teaching-quality-tune.json').read_text())['cases']}
        for identity,check,absent,present in [
            ('quality-range','scope','range starts at zero.','For a positive stop, range starts at zero.'),
            ('quality-scaling','positive_quantity','A factor below one makes things smaller.','For a positive quantity, a factor below one reduces it.'),
            ('quality-language','exceptions','Use did not and the base form.','Be and modal verbs have special negative patterns.')]:
            case=cases[identity];question=case['rubric']['transfer_question']
            self.assertFalse(harness.grade(case,absent+' '+question)['checks']['required:'+check])
            self.assertTrue(harness.grade(case,present+' '+question)['checks']['required:'+check])
        c=cases['quality-evidence'];q=c['rubric']['transfer_question']
        for phrase in ('Without that comparison, we can only make a descriptive claim.',
                       'A high percentage does not explain the reason for the outcome.',
                       'This does not prove that tutoring caused learning.'):
            self.assertTrue(harness.grade(c,phrase+' '+q)['checks']['required:causality'])
        self.assertFalse(harness.grade(c,'This result proves tutoring works. '+q)['checks']['forbidden:causal_proof'])
        c=cases['quality-range']
        self.assertFalse(harness.grade(c,'Use range(stop=3). '+c['rubric']['transfer_question'])['checks']['forbidden:keyword_stop'])

    def test_worksheet_is_blinded_and_keeps_scores_empty(self):
        suite=json.loads((ROOT/'teaching-quality-demo.json').read_text())
        report=exercise(suite=suite,objective='quality',repeat=1)
        pack=review_pack(report);before=digest(pack);text=render_worksheet(pack)
        self.assertEqual(before,digest(pack))
        for variant in suite['variants']:self.assertNotIn(variant['name'],text)
        self.assertNotIn('synthetic-demo',text)
        self.assertIn('Actual learner answer and reasoning',text)
        for item in pack['items']:
            self.assertIn(item['id'],text)
            self.assertTrue(all(v is None for v in item['ratings'].values()))
