#!/usr/bin/env python3
"""Calibrate bounded teaching checks, freeze runs, and account for external effort."""
import argparse
import hashlib
import json
import math
import shutil
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from common import digest, require, save, validate_usage
from reporting import cost

ROOT = Path(__file__).resolve().parent


def calibrate(dataset):
    from harness import grade, validate
    require(dataset.get('split') == 'development', 'Calibration needs a development set, never a fresh holdout')
    require(dataset.get('label_source') in ('ai_authored', 'human_reviewed'), 'Label provenance required')
    variants = [dict(name=n, instructions='Fixture only', context_key='full') for n in ('a','b')]
    cases = [{k:v for k,v in c.items() if k != 'examples'} for c in dataset['cases']]
    validate(dict(variants=variants, cases=cases))
    rows=[]; identities=set()
    for case, original in zip(cases, dataset['cases']):
        for example in original['examples']:
            identity=(case['id'],example['id'])
            require(identity not in identities, 'Duplicate calibration example');identities.add(identity)
            require(type(example.get('acceptable')) is bool, 'Calibration labels must be booleans')
            checked=grade(case,example['text'])
            rows.append(dict(case=case['id'],example=example['id'],expected=example['acceptable'],
                             actual=checked['passed'],failed_checks=checked['failed_checks'],reason=example['reason']))
    require(rows and {r['expected'] for r in rows} == {False,True}, 'Calibration needs good and bad examples')
    counts=Counter(('true_positive' if r['expected'] else 'false_positive') if r['actual'] else
                   ('false_negative' if r['expected'] else 'true_negative') for r in rows)
    return dict(status='matches_labels' if all(r['actual']==r['expected'] for r in rows) else 'grader_regression',
                label_source=dataset['label_source'],dataset_hash=digest(dataset),examples=len(rows),
                confusion={k:counts[k] for k in ('true_positive','true_negative','false_positive','false_negative')},
                rows=rows,note='Development examples only. Matching AI-authored labels is not independent expert calibration or model teaching accuracy.')


def freeze(suite_path, settings, directory):
    require(not directory.exists(), 'Freeze directory must be new')
    directory.mkdir(parents=True);source=directory/'source';source.mkdir()
    for path in ROOT.glob('*.py'):
        if not path.name.startswith('test_'):shutil.copy2(path,source/path.name)
    shutil.copy2(suite_path,source/suite_path.name)
    manifest=dict(frozen_at=datetime.now(timezone.utc).isoformat(),suite=suite_path.name,settings=settings,
                  files={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in source.iterdir() if p.is_file()},
                  note='Freeze proves artifact identity, not dataset secrecy or independence. Live uses must be recorded; repeated use is no longer fresh.')
    save(directory/'freeze.json',manifest)
    return manifest


def verify_freeze(manifest_path, suite_path, settings):
    manifest=json.loads(manifest_path.read_text());source=manifest_path.parent/'source'
    require(ROOT.resolve()==source.resolve(), 'Run the frozen source copy, not a different implementation')
    require(suite_path.resolve()==(source/manifest['suite']).resolve(), 'Wrong frozen suite')
    require(manifest['settings']==settings,'Run settings differ from the freeze')
    for name,expected in manifest['files'].items():
        require(Path(name).name==name, 'Unsafe snapshot filename')
        require(hashlib.sha256((source/name).read_bytes()).hexdigest()==expected,'Frozen file changed: '+name)
    actual={p.name for p in source.glob('*.py')}
    require(actual=={n for n in manifest['files'] if n.endswith('.py')}, 'Frozen source inventory changed')
    return manifest


def effort_template(report):
    return dict(report_hash=digest(report),external_calls=[],human_activities=[],
                external_calls_complete=False,human_time_complete=False,
                human_hourly_rate_usd=None,prices={},
                note='Record actual external calls and minutes; null means unmeasured. Do not include model calls already in the report. Prices require exact model, official source and as-of date.')


def effort_summary(report, log):
    require(log.get('report_hash')==digest(report),'Effort log belongs to another report')
    calls=report['calls']+log['external_calls']
    ids=[c['id'] for c in calls]
    require(len(ids)==len(set(ids)), 'Duplicate call in effort ledger')
    for flag in ('external_calls_complete','human_time_complete'):
        require(type(log.get(flag)) is bool,'Completeness flags must be explicit booleans')
    def nonnegative(x):return type(x) in (int,float) and math.isfinite(x) and x>=0
    rate=log.get('human_hourly_rate_usd')
    require(rate is None or nonnegative(rate),'Invalid human hourly rate')
    human=log['human_activities'];hids=[e['id'] for e in human]
    require(len(hids)==len(set(hids)),'Duplicate human activity')
    for event in human:
        require(event.get('kind') in ('review','correction','follow_up','administration'), 'Unknown human effort kind')
        require(event.get('minutes') is None or nonnegative(event['minutes']),'Invalid human minutes')
        require(isinstance(event.get('actor'),str) and bool(event['actor'].strip()),'Human activity needs a pseudonymous actor')
    prices=log['prices']
    for model,p in prices.items():
        require(isinstance(model,str) and model and isinstance(p.get('source_url'),str)
                and p['source_url'].startswith('https://') and isinstance(p.get('as_of'),str) and p['as_of'],
                'Prices require exact model, official source URL and as-of date')
        for key in ('input_per_million','cached_input_per_million','output_per_million'):
            require(nonnegative(p.get(key)),'Invalid price: '+key)
    known=[];costs=[];stages=Counter();unknown=0
    for call in calls:
        require(call.get('stage') in ('lesson','follow_up','correction','repair','retry','retrieval','evaluation','fallback'), 'Unknown effort stage')
        stages[call['stage']]+=1
        counts=validate_usage(call.get('usage'))
        if counts is None:unknown+=1;costs.append(None);continue
        known.append(counts)
        p=prices.get(call.get('model'))
        costs.append(cost(counts,p) if p and (counts['cached_tokens'] is not None or
                     p['input_per_million']==p['cached_input_per_million']) else None)
    model_complete=log['external_calls_complete'] and unknown==0 and report['status']=='completed'
    human_complete=log['human_time_complete'] and all(e.get('minutes') is not None for e in human)
    minutes=sum(e['minutes'] for e in human if e.get('minutes') is not None)
    model_cost=sum(costs) if model_complete and all(c is not None for c in costs) else None
    labor_cost=minutes/60*rate if human_complete and rate is not None else None
    return dict(report_hash=digest(report),known_total_tokens=sum(c['total_tokens'] for c in known),
                usage_sources=sorted({c['source'] for c in known}),unknown_usage_calls=unknown,
                calls_by_stage=dict(stages),model_accounting_complete=model_complete,
                known_human_minutes=minutes,human_time_complete=human_complete,
                estimated_model_cost_usd=model_cost,estimated_labor_cost_usd=labor_cost,
                estimated_combined_cost_usd=(model_cost+labor_cost if model_cost is not None and labor_cost is not None else None),
                tokens_per_human_approved_task=None,
                note='Estimated prices are user-supplied, not invoice-verified. Human time and external calls must be declared complete. '
                     'Missing effort remains unknown. Scripted conversations are not learner observations; no quality or savings approval follows.')


def main(argv=None):
    parser=argparse.ArgumentParser(description=__doc__);commands=parser.add_subparsers(dest='command',required=True)
    c=commands.add_parser('calibrate');c.add_argument('dataset',type=Path);c.add_argument('--out',type=Path,required=True)
    f=commands.add_parser('freeze');f.add_argument('suite',type=Path);f.add_argument('--settings',type=Path,required=True);f.add_argument('--out',type=Path,required=True)
    e=commands.add_parser('effort');e.add_argument('report',type=Path);e.add_argument('--log',type=Path);e.add_argument('--out',type=Path,required=True)
    args=parser.parse_args(argv)
    try:
        require(not args.out.exists(),'Use a new output path')
        if args.command=='freeze':result=freeze(args.suite,json.loads(args.settings.read_text()),args.out)
        else:
            if args.command=='calibrate':result=calibrate(json.loads(args.dataset.read_text()))
            else:
                report=json.loads(args.report.read_text())
                result=effort_summary(report,json.loads(args.log.read_text())) if args.log else effort_template(report)
            args.out.parent.mkdir(parents=True,exist_ok=True);save(args.out,result)
        print(result.get('status','saved'))
        return 1 if result.get('status')=='grader_regression' else 0
    except (ValueError,KeyError,TypeError,OSError) as exc:parser.error(str(exc))

if __name__=='__main__':raise SystemExit(main())
