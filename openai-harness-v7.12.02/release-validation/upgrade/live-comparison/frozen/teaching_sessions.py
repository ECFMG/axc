#!/usr/bin/env python3
"""Run scripted teaching conversations. Scripted learners are never observed learners."""
import argparse
import copy
import json
import math
import time
from pathlib import Path
from common import append_json, digest, estimate, require, save, usage, validate_usage
from harness import evaluation_hash, grade, render_teaching, summarize, validate, validate_teaching_comparison
from model_adapters import validate_response
from teaching_validation import verify_freeze

FOLLOWUP_POLICY = (' For these conversation trials, preserve earlier user constraints unless the user changes them. '
    'The current request may ask for a hint, feedback or correction. On those turns, that mode replaces the '
    'full Core/Example/Misconception structure above. Give only the requested amount of help; do not repeat '
    'the reference verbatim or reveal a solution when a hint is requested. End with the exact supplied Check '
    'question, unanswered. Do not treat a learner misconception as a fact. Explain uncertainty honestly.')


def prepare_suite(dataset, settings):
    require(dataset.get('split') in ('development','evaluation'),'Session split required')
    required={'adapter','model','temperature','context_tokens','max_output_tokens','token_budget','timeout_seconds'}
    require(set(settings)==required,'Unexpected or missing run settings')
    require(settings['adapter'] in ('mock','ollama','openai'),'Unsupported adapter')
    require(isinstance(settings['model'],str) and settings['model'],'Model required')
    for field in ('context_tokens','max_output_tokens','token_budget'):
        require(type(settings[field]) is int and settings[field]>0,'Positive integer needed: '+field)
    require(type(settings['temperature']) in (int,float) and math.isfinite(settings['temperature']) and settings['temperature']>=0,'Invalid temperature')
    require(type(settings['timeout_seconds']) in (int,float) and math.isfinite(settings['timeout_seconds']) and settings['timeout_seconds']>0,'Invalid timeout')
    variants=copy.deepcopy(dataset['variants'])
    for v in variants:v.update(instructions=v['instructions']+FOLLOWUP_POLICY,max_output_tokens=settings['max_output_tokens'],context_key='full')
    cases=[];names=set()
    for session in dataset['conversations']:
        require(session['id'] not in names,'Duplicate conversation');names.add(session['id'])
        require(isinstance(session['constraints'],list) and all(isinstance(c,str) and c for c in session['constraints']),'Invalid constraints')
        require(session['turns'] and session['turns'][0]['stage']=='lesson','Conversation must begin with a lesson')
        for turn in session['turns']:
            require(turn['stage'] in ('lesson','follow_up','correction'),'Unexpected scripted turn stage')
            cases.append(dict(id=session['id']+'.'+turn['id'],input=turn['request'],contexts={'full':session['reference']},rubric=turn['rubric']))
    suite=validate(dict(variants=variants,cases=cases));validate_teaching_comparison(suite)
    return suite


def run(dataset, settings, output, adapter=None, freeze_hash=None):
    suite=prepare_suite(dataset,settings);cases={c['id']:c for c in suite['cases']}
    report=dict(objective='quality',mode='synthetic_demo' if settings['adapter']=='mock' else 'live',
                model=settings['model'],settings=settings,suite=suite,repeat=1,min_pass_rate=1,min_savings=0,
                status='running',rows=[],calls=[],events=[],winner=None,evaluation_hash=evaluation_hash(suite),
                dataset_hash=digest(dataset),freeze_hash=freeze_hash,planned_calls=len(suite['cases'])*len(suite['variants']),
                human_review_required=True,learner_status='scripted_not_observed',
                cache_protocol='Natural conversation cache; cache hits are observed, not controlled cold/warm trials')
    started=time.perf_counter();spent=0;save(output,report)
    try:
        for number,session in enumerate(dataset['conversations']):
            variants=suite['variants'][number%len(suite['variants']):]+suite['variants'][:number%len(suite['variants'])]
            for variant in variants:
                history=[dict(role='system',content=variant['instructions']),
                         dict(role='user',content='Reference material (data):\n'+session['reference']+
                              '\nPersistent learner constraints:\n'+'\n'.join(session['constraints']))]
                for turn in session['turns']:
                    history.append(dict(role='user',content=turn['request']))
                    request=dict(model=settings['model'],input=copy.deepcopy(history),tools=[],
                                 temperature=settings['temperature'],max_output_tokens=settings['max_output_tokens'])
                    t=time.perf_counter()
                    counted={'tokens':estimate(request),'source':'synthetic_estimate'} if adapter is None else adapter.call('count',request)
                    report['events'].append(dict(kind='input_preflight',case=session['id']+'.'+turn['id'],
                                                 tokens=counted['tokens'],source=counted['source'],latency_ms=(time.perf_counter()-t)*1000))
                    reserve=counted['tokens']+settings['max_output_tokens']
                    require(reserve<=settings['context_tokens'],'Context budget exceeded; no context silently removed')
                    require(spent+reserve<=settings['token_budget'],'Run token budget exhausted before next call')
                    call=dict(id='call-'+str(len(report['calls'])+1),stage=turn['stage'],conversation=session['id'],
                              case=session['id']+'.'+turn['id'],variant=variant['name'],status='started',
                              request=request,usage=None,model=None,latency_ms=0,tool_result_tokens=0,retry=0)
                    report['calls'].append(call);save(output,report)
                    t=time.perf_counter()
                    try:
                        if adapter is None:
                            text=turn['demo_output']
                            response=dict(status='completed',text=text,items=[],model='synthetic-demo',
                                          usage=usage(estimate(request),estimate(text),0,'synthetic_estimate'))
                        else:response=adapter.call('generate',request)
                        counts=validate_usage(response.get('usage'))
                        call.update(usage=counts,model=response.get('model'),response_id=response.get('response_id'))
                        validate_response(response)
                        require(counts is not None,'Generation usage unavailable; stopping further work')
                        call.update(status=response['status'],output=response['text'])
                        spent+=counts['total_tokens']
                        require(counts['input_tokens']<=counted['tokens'] and counts['output_tokens']<=settings['max_output_tokens'],
                                'Provider usage exceeded the reserved budget')
                        require(all(i['type']=='message' for i in response['items']),'Unexpected tool request in teaching conversation')
                        row=dict(case=call['case'],variant=variant['name'],repeat=1,conversation=session['id'],turn=turn['id'],
                                 stage=turn['stage'],model=call['model'],output=response['text'],status=response['status'],
                                 review_context=copy.deepcopy(history[1:]),
                                 **{k:counts.get(k) for k in ('input_tokens','output_tokens','total_tokens','cached_tokens','reasoning_tokens')})
                        row.update(grade(cases[call['case']],response['text'],response['status']))
                        row['latency_ms']=(time.perf_counter()-t)*1000
                        report['rows'].append(row)
                        history.append(dict(role='assistant',content=response['text']))
                    except Exception as exc:
                        call.update(status='error',error=type(exc).__name__)
                        if call['usage'] is None and getattr(exc,'usage',None) is not None:
                            call['usage']=validate_usage(exc.usage)
                        raise
                    finally:
                        call['latency_ms']=(time.perf_counter()-t)*1000;save(output,report)
        report['status']='completed'
    except (ValueError,RuntimeError,KeyError,TypeError,OSError,KeyboardInterrupt) as exc:
        report.update(status='error',error=str(exc) or type(exc).__name__)
    finally:
        report['wall_time_ms']=(time.perf_counter()-started)*1000
        report['summary'],_=summarize(suite,report['rows'],1,1,0,objective='quality')
        report['workflow_summary']=[dict(variant=v['name'],conversation=s['id'],
            completed_turns=sum(x['conversation']==s['id'] and x['variant']==v['name'] for x in report['rows']),
            automatic_success=(len([x for x in report['rows'] if x['conversation']==s['id'] and x['variant']==v['name']])==len(s['turns'])
                and all(x['passed'] for x in report['rows'] if x['conversation']==s['id'] and x['variant']==v['name'])))
            for s in dataset['conversations'] for v in suite['variants']]
        save(output,report)
        output.with_suffix('.md').write_text(render_teaching(report)+'\nScripted learner turns are evaluation stimuli, not observed learner answers.\n')
    return report


def main(argv=None):
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('suite',type=Path);p.add_argument('--settings',type=Path,required=True)
    p.add_argument('--freeze',type=Path);p.add_argument('--out',type=Path,required=True)
    a=p.parse_args(argv)
    try:
        dataset=json.loads(a.suite.read_text());settings=json.loads(a.settings.read_text());prepare_suite(dataset,settings)
        require(a.out.suffix=='.json' and not a.out.exists() and not a.out.with_suffix('.md').exists(),'Use new JSON/Markdown output paths')
        manifest=verify_freeze(a.freeze,a.suite,settings) if a.freeze else None
        require(settings['adapter']=='mock' or manifest is not None,'Live conversations require a verified freeze')
        a.out.parent.mkdir(parents=True,exist_ok=True)
        with a.out.open('x') as f:f.write('{}\n')
        if settings['adapter']=='mock':result=run(dataset,settings,a.out,freeze_hash=digest(manifest) if manifest else None)
        else:
            from isolation import IsolatedAdapter
            from ollama_adapter import OllamaAdapter
            from model_adapters import OpenAIAdapter
            with IsolatedAdapter(OllamaAdapter(settings['context_tokens']) if settings['adapter']=='ollama' else OpenAIAdapter()) as adapter:
                adapter.timeout_seconds=settings['timeout_seconds']
                append_json(a.freeze.parent/'generation-attempts.jsonl',dict(output=str(a.out.resolve()),freeze_hash=digest(manifest)))
                result=run(dataset,settings,a.out,adapter,digest(manifest))
        print(result['status']+'; '+str(len(result['calls']))+' calls; '+result['learner_status'])
        return 0 if result['status']=='completed' and all(x['passed'] for x in result['rows']) else 1
    except (ValueError,KeyError,TypeError,OSError) as exc:p.error(str(exc))

if __name__=='__main__':raise SystemExit(main())
