"""Summarize controlled teaching cache trials without treating repeats as cache hits."""
import statistics


def cache_evidence(report):
    rows = report['rows']
    variants = [v['name'] for v in report['suite']['variants']]
    repetitions = report.get('cache_repetitions', 0)
    expected = {(c['id'], v, n, phase) for c in report['suite']['cases'] for v in variants
                for n in range(1, repetitions+1) for phase in ('cold', 'warm_attempt')}
    keys = [(r['case'], r['variant'], r['cache_repetition'], r['cache_trial']) for r in rows]
    complete = report['status'] == 'completed' and len(keys) == len(expected) and set(keys) == expected
    by_key = dict(zip(keys, rows))
    pair_checks = []
    for case in report['suite']['cases']:
        for repetition in range(1, repetitions+1):
            selected = [by_key.get((case['id'], v, repetition, phase))
                        for v in variants for phase in ('cold', 'warm_attempt')]
            reasons = []
            if any(r is None for r in selected):
                reasons.append('incomplete pair')
            else:
                cold, warm = selected[::2], selected[1::2]
                if len({r['model'] for r in selected}) != 1 or any(not r.get('model') for r in selected):
                    reasons.append('model identity differs or is unknown')
                if any(r['status'] != 'completed' for r in selected):
                    reasons.append('incomplete response')
                if any(not r.get('cache_reset', {}).get('verified_unloaded') for r in cold):
                    reasons.append('unload not verified')
                if any(r['cached_tokens'] != 0 for r in cold):
                    reasons.append('cold counters are not known zero')
                if any(a['request_hash'] != b['request_hash'] or a['input_tokens'] != b['input_tokens'] for a,b in zip(cold,warm)):
                    reasons.append('repeat prompt or input count differs')
                if any(r['cached_tokens'] is None for r in warm):
                    reasons.append('warm cache counters unavailable')
                elif all(r['cached_tokens'] == 0 for r in warm):
                    reasons.append('no warm cache hits observed')
                elif any(r['cached_tokens'] == 0 for r in warm):
                    reasons.append('warm cache state differs across variants')
                else:
                    fractions = [r['cached_tokens']/r['input_tokens'] for r in warm if r['input_tokens']]
                    if len(fractions) != len(warm) or max(fractions)-min(fractions) > .01:
                        reasons.append('warm cached fractions differ by more than one percentage point')
            pair_checks.append(dict(case=case['id'], repetition=repetition, comparable=not reasons, reasons=reasons))
    phases = {}
    for phase in ('cold', 'warm_attempt'):
        phases[phase] = []
        for variant in variants:
            chosen = [r for r in rows if r['cache_trial'] == phase and r['variant'] == variant]
            cached = sum(r['cached_tokens'] for r in chosen) if chosen and all(r['cached_tokens'] is not None for r in chosen) else None
            input_tokens = sum(r['input_tokens'] for r in chosen)
            passed = sum(r['passed'] for r in chosen)
            total = sum(r['total_tokens'] for r in chosen)
            phases[phase].append(dict(variant=variant, calls=len(chosen), automatic_passes=passed,
                input_tokens=input_tokens, output_tokens=sum(r['output_tokens'] for r in chosen),
                total_tokens=total, cached_tokens=cached,
                uncached_input_tokens=input_tokens-cached if cached is not None else None,
                cached_fraction=cached/input_tokens if cached is not None and input_tokens else None,
                tokens_per_automatic_pass=total/passed if passed else None,
                latency_ms=sum(r['latency_ms'] for r in chosen),
                median_latency_ms=statistics.median(r['latency_ms'] for r in chosen) if chosen else None,
                load_ms=(sum(r['provider_duration_ns']['load_duration']/1e6 for r in chosen)
                         if chosen and all(r.get('provider_duration_ns', {}).get('load_duration') is not None for r in chosen) else None)))
    return dict(complete=complete, comparable=complete and all(p['comparable'] for p in pair_checks),
                warm_fraction_tolerance=.01, pairs=pair_checks, by_phase=phases,
                cache_reset_latency_ms=sum((r.get('cache_reset') or {}).get('latency_ms',0) for r in rows),
                note='Both cold priming and warm attempts are included in run totals. Cached tokens are part of input tokens, not additional tokens. No quality or savings approval follows from cache matching.')
