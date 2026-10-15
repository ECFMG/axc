"""Teaching-quality policy checks. All human/learner records here are test fixtures."""
import copy
import io
import json
from pathlib import Path
import tempfile
import unittest
from contextlib import redirect_stderr, redirect_stdout

import harness as h
import teaching_review as review
from common import digest
from test_harness import exercise

ROOT=Path(__file__).resolve().parent
DEMO=h.validate(json.loads((ROOT/'teaching-quality-demo.json').read_text()))


def fixture(clean=True, observed=True):
    suite=copy.deepcopy(DEMO)
    if clean:
        for case in suite['cases']:
            case['demo_outputs']['reference_teacher']=case['demo_outputs']['scaffolded_teacher']
    report=exercise(suite=suite,objective='quality',repeat=1,token_budget=100000)
    # Unit-test provider simulation only; no live benchmark evidence is written.
    report['mode']='live'
    for row in report['rows']:
        row['model']='unit-test-provider'
        if row['variant']=='scaffolded_teacher':
            row['input_tokens']+=1000;row['total_tokens']+=1000
    pack=review.review_pack(report)
    by_id={digest([digest(report),i])[:20]:row for i,row in enumerate(report['rows'])}
    for item in pack['items']:
        row=by_id[item['id']]
        item['reviewer']='Unit-test fixture, not a human evaluation'
        item['reviewer_type']='human'  # Simulated provenance for this unit test only.
        item['ratings']={d:5 if row['variant']=='scaffolded_teacher' or d=='factual_correctness' else 4
                         for d in review.TEACHING_RATINGS}
        item['checks']={c:True for c in review.TEACHING_CHECKS}
        if observed:
            item.update(learner_response='Test fixture only: correct reasoning supplied.',learner_transfer_correct=True,
                        learner_id='fixture-'+item['id'],learner_support='none')
    return report,pack,by_id


class TeachingFocusChecks(unittest.TestCase):
    def test_quality_is_cli_default_with_a_runnable_honest_demo(self):
        with tempfile.TemporaryDirectory() as temp,redirect_stdout(io.StringIO()),redirect_stderr(io.StringIO()):
            path=Path(temp)/'demo.json'
            self.assertEqual(h.main(['--demo','--out',str(path)]),0)
            report=json.loads(path.read_text())
            self.assertEqual(report['objective'],'quality')
            self.assertEqual(report['mode'],'synthetic_demo')
            self.assertIsNone(report['winner'])
            self.assertIn('SYNTHETIC DEMO',path.with_suffix('.md').read_text())

    def test_extra_tokens_and_a_failed_baseline_do_not_block_better_teaching(self):
        report=exercise(suite=DEMO,objective='quality',repeat=1)
        self.assertFalse(report['summary'][0]['eligible'])
        self.assertTrue(report['summary'][1]['eligible'])
        self.assertGreater(report['summary'][1]['total_tokens'],report['summary'][0]['total_tokens'])
        self.assertIsNone(report['winner'])

    def test_word_limit_exists_only_when_explicitly_required(self):
        case=copy.deepcopy(DEMO['cases'][0]);output=case['demo_outputs']['scaffolded_teacher']
        output=output.replace('Example:',('Useful detail. '*350)+'Example:')
        self.assertTrue(h.grade(case,output)['passed'])
        case['rubric']['max_words']=100
        self.assertIn('word_limit',h.grade(case,output)['failed_checks'])

    def test_heading_style_does_not_replace_quality_or_question_checks(self):
        case=copy.deepcopy(DEMO['cases'][0]);answer=case['demo_outputs']['scaffolded_teacher']
        self.assertTrue(h.grade(case,answer.replace('Check: ',''))['passed'])
        self.assertFalse(h.grade(case,answer.replace('Check: ','')+' Extra answer.')['passed'])
        case['rubric']['required']['cannot_use_question']='72'
        self.assertIn('required:cannot_use_question',h.grade(case,answer)['failed_checks'])

    def test_quality_requires_fair_references_and_equal_output_limits(self):
        for field,value in [('context_key','short'),('max_output_tokens',200)]:
            suite=copy.deepcopy(DEMO);suite['variants'][1][field]=value
            with self.assertRaises(ValueError):h.validate_teaching_comparison(suite)

    def test_duplicate_or_partial_trial_sets_never_qualify(self):
        report,pack,_=fixture()
        for rows in (report['rows'][1:],report['rows']+[report['rows'][0]]):
            summaries,winner=h.summarize(report['suite'],rows,1,1,.1,objective='quality')
            self.assertFalse(any(s['eligible'] for s in summaries));self.assertIsNone(winner)
        report['rows']=report['rows'][1:]
        pack=review.review_pack(report)
        result=review.assess(report,pack)
        self.assertFalse(result['recommended_variants'])

    def test_reviewed_quality_wins_even_when_it_costs_more(self):
        report,pack,_=fixture()
        for row in report['rows']:
            row['cached_tokens']=0 if row['variant']=='reference_teacher' else None
        # Rebuild ids after changing report metadata; retain synthetic review contents.
        fresh=review.review_pack(report)
        for new,old in zip(fresh['items'],pack['items']):
            for field in ('reviewer','reviewer_type','ratings','checks','learner_response','learner_transfer_correct','learner_id','learner_support'):
                new[field]=old[field]
        pricing=dict(label='Unit-test prices',input_per_million=2,cached_input_per_million=1,output_per_million=3)
        result=review.assess(report,fresh,pricing)
        self.assertEqual(result['selected_variant'],'scaffolded_teacher')
        self.assertTrue(result['diagnostics']);self.assertFalse(result['flags'])
        self.assertGreater(result['summaries'][1]['estimated_cost_usd'],result['summaries'][0]['estimated_cost_usd'])

    def test_equal_quality_stays_tied_and_tokens_cannot_break_the_tie(self):
        report,pack,_=fixture()
        for item in pack['items']:item['ratings']={d:5 for d in review.TEACHING_RATINGS}
        result=review.assess(report,pack)
        self.assertEqual(result['recommended_variants'],['reference_teacher','scaffolded_teacher'])
        self.assertIsNone(result['selected_variant']);self.assertEqual(result['status'],'accepted_on_sample')

    def test_factual_errors_and_paired_human_regressions_block_a_candidate(self):
        for dimension in ('factual_correctness','clarity'):
            report,pack,by_id=fixture()
            for item in pack['items']:
                candidate=by_id[item['id']]['variant']=='scaffolded_teacher'
                if dimension=='clarity':item['ratings']['clarity']=4 if candidate else 5
                elif candidate:item['ratings']['factual_correctness']=4
            result=review.assess(report,pack)
            self.assertNotIn('scaffolded_teacher',result['recommended_variants'])

    def test_no_learning_claim_without_real_unassisted_responses(self):
        report,pack,_=fixture(observed=False)
        result=review.assess(report,pack)
        self.assertEqual(result['status'],'learner_evidence_pending')
        self.assertTrue(all(s['lesson_quality_passed'] for s in result['summaries']))
        self.assertIsNone(result['selected_variant'])
        report,pack,_=fixture()
        for item in pack['items']:item['learner_support']='hint'
        result=review.assess(report,pack)
        self.assertFalse(result['recommended_variants'])
        self.assertTrue(all(s['unassisted_responses']==0 for s in result['summaries']))

    def test_failed_learner_answers_are_visible_and_block_adoption(self):
        report,pack,_=fixture()
        for item in pack['items']:item['learner_transfer_correct']=False
        result=review.assess(report,pack)
        self.assertEqual(result['status'],'learner_quality_failed')
        self.assertFalse(result['recommended_variants'])

    def test_review_and_learner_provenance_cannot_be_silently_changed(self):
        for field,value in [('reference','Changed'),('learner_id',None),('learner_support','unknown')]:
            report,pack,_=fixture();pack['items'][0][field]=value
            with self.assertRaises(ValueError):review.assess(report,pack)
        report,pack,_=fixture();pack['review_policy_hash']='changed'
        with self.assertRaisesRegex(ValueError,'Review policy changed'):review.assess(report,pack)

    def test_mock_review_never_becomes_real_teaching_evidence(self):
        report=exercise(suite=DEMO,objective='quality',repeat=1)
        result=review.assess(report,review.review_pack(report))
        self.assertFalse(result['recommended_variants'])
        self.assertTrue(any('synthetic' in flag for flag in result['flags']))

    def test_ai_or_unattributed_reviews_cannot_satisfy_human_gate(self):
        for provenance in ('ai', None):
            report,pack,_=fixture()
            for item in pack['items']:item['reviewer_type']=provenance
            result=review.assess(report,pack)
            self.assertEqual(result['pending_reviews'],len(report['rows']))
            self.assertFalse(result['recommended_variants'])
            self.assertTrue(all(row['human_pass'] is None for row in result['rows']))
        report,pack,_=fixture();pack['items'][0]['reviewer_type']='guessed'
        with self.assertRaisesRegex(ValueError,'Reviewer type'):review.assess(report,pack)


if __name__=='__main__':unittest.main()
