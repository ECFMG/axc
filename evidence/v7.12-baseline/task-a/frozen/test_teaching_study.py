"""Synthetic unit fixtures only: no learner observations are written to evidence."""
import copy
import unittest
from common import digest
from teaching_study import summarize

def fixture():
    protocol=dict(assignments=[dict(learner_id='fixture',arm='A',case_order=['math'])],immediate_window_minutes=30,delayed_window_days=[6,8])
    observations=dict(protocol_hash=digest(protocol),sessions=[dict(learner_id='fixture',case='math',lesson_started_at='2026-09-01T11:45:00Z',lesson_ended_at='2026-09-01T12:00:00Z',prior_same_lesson=False,additional_study=False)],rows=[])
    for phase,date in [('pretest','2026-09-01T11:00:00Z'),('immediate','2026-09-01T12:10:00Z'),('delayed','2026-09-08T12:00:00Z')]:
        observations['rows'].append(dict(learner_id='fixture',case='math',phase=phase,observed_at=date,response='UNIT FIXTURE: arithmetic and reasoning',support='none',score=2,scorer='Unit fixture',reviewer_type='human'))
    return protocol,observations

class StudyChecks(unittest.TestCase):
    def test_blank_records_remain_unmeasured(self):
        p,o=fixture()
        for r in o['rows']:
            for k in ('observed_at','response','support','score','scorer','reviewer_type'):r[k]=None
        result=summarize(p,o)
        self.assertEqual(result['status'],'not_measured');self.assertIsNone(result['summaries'][0]['accuracy'])
        self.assertEqual(result['delayed_transfer_status'],'not_measured')
    def test_delayed_independent_reasoning_is_reported_without_causal_claims(self):
        p,o=fixture();r=summarize(p,o)
        self.assertEqual(r['matched_immediate_delayed_pairs'],1);self.assertEqual(r['retained_correct_pairs'],1)
        self.assertFalse(r['retention_claim_supported']);self.assertIsNone(r['selected_variant'])
    def test_assistance_ai_scoring_and_early_tests_cannot_count_as_delayed_evidence(self):
        for field,value in [('support','hint'),('reviewer_type','ai'),('observed_at','2026-09-02T12:00:00Z')]:
            p,o=fixture();o['rows'][-1][field]=value;r=summarize(p,o)
            self.assertEqual(r['delayed_transfer_status'],'not_measured');self.assertEqual(len(r['exclusions']),1)
    def test_answer_without_reasoning_and_missing_followup_are_not_success(self):
        p,o=fixture();o['rows'][-1]['score']=1;r=summarize(p,o)
        self.assertEqual(r['summaries'][-1]['accuracy'],0);self.assertEqual(r['retained_correct_pairs'],0)
    def test_exposure_and_late_immediate_are_reported_separately(self):
        p,o=fixture();o['sessions'][0]['additional_study']=True;o['rows'][1]['observed_at']='2026-09-01T13:00:00Z'
        r=summarize(p,o);self.assertEqual(len(r['exclusions']),2)
        p,o=fixture();o['sessions'][0]['prior_same_lesson']=True
        self.assertEqual(len(summarize(p,o)['exclusions']),3)
    def test_fabrication_shortcuts_and_protocol_changes_are_rejected(self):
        for transform in [lambda o:o['rows'].append(copy.deepcopy(o['rows'][0])),lambda o:o['rows'].pop(),lambda o:o['rows'][0].update(response=None),lambda o:o['rows'][0].update(observed_at='2026-09-01T11:00:00')]:
            p,o=fixture();transform(o)
            with self.assertRaises(ValueError):summarize(p,o)
        p,o=fixture();p['delayed_window_days']=[0,10]
        with self.assertRaisesRegex(ValueError,'protocol changed'):summarize(p,o)

if __name__=='__main__':unittest.main()
