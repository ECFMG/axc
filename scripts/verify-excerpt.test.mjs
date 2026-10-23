// node --test scripts/verify-excerpt.test.mjs — fake verify logs on stdin.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { acceptanceFailures } from './acceptance-failures.mjs';

const run = (input) => spawnSync(process.execPath, [path.join(import.meta.dirname, 'verify-excerpt.mjs')], { input, encoding: 'utf8' });

test('clean log prints nothing', () => {
	const r = run('$ pnpm run build\nall good\n');
	assert.equal(r.status, 0);
	assert.equal(r.stdout, '');
});
test('missing cross-package export: keeps TS lines and adds one re-export hint', () => {
	const log = [
		'$ pnpm run typecheck',
		`@axc/rest:typecheck: src/a.ts(1,10): error TS2305: Module '"@axc/lib"' has no exported member 'Foo'.`,
		`@axc/rest:typecheck: src/b.ts(2,10): error TS2459: Module '"@axc/lib"' declares 'Bar' locally, but it is not exported.`,
		`@axc/rest:typecheck: src/c.ts(3,10): error TS2724: '"@axc/other"' has no exported member named 'Bazz'. Did you mean 'Baz'?`,
		'@axc/rest:typecheck: [ELIFECYCLE] Command failed with exit code 2.',
	].join('\n');
	const r = run(log);
	assert.equal(r.status, 1);
	for (const code of ['TS2305', 'TS2459', 'TS2724']) assert.match(r.stdout, new RegExp(`error ${code}`));
	const hints = r.stdout.split('\n').filter((l) => l.startsWith('hint: '));
	assert.deepEqual(hints, ['hint: re-export every cross-package type from <pkg>/src/index.ts (missing: Foo, Bar from @axc/lib; Bazz from @axc/other)']);
});
test('other type errors get no re-export hint', () => {
	const r = run(`$ tsc\nsrc/a.ts(1,1): error TS2345: Argument of type 'x' is not assignable.\n`);
	assert.equal(r.status, 1);
	assert.doesNotMatch(r.stdout, /hint:/);
});
test('acceptance: names each failing scenario, feature:line, step and first error (real Serenity output)', () => {
	const log = readFileSync(path.join(import.meta.dirname, 'fixtures/acceptance-fail.log'), 'utf8');
	assert.deepEqual(acceptanceFailures(log, '/repo'), [
		'scenario  packages/axc-verification/acceptance-api/src/features/zzprobe.feature:4 "PRB-AC1 health reports a wrong status" — step "Then the probe status is 418" — AssertionError: Expected the status of the last response to equal 418 (expected 418, received 200) @ packages/axc-verification/acceptance-api/src/step-definitions/zzprobe.steps.ts:7',
		'scenario  packages/axc-verification/acceptance-api/src/features/zzprobe.feature:9 "PRB-AC2 uses a step nobody defined" — step "Then the probe step that does not exist passes" — undefined step — add it to src/step-definitions/<feature>.steps.ts (or reuse an existing pattern)',
		'scenario  packages/axc-verification/acceptance-api/src/features/zzprobe.feature:14 "PRB-AC3 a step throws" — step "Then the probe step throws" — TypeError: Cannot read properties of undefined (reading \'id\') @ packages/axc-verification/acceptance-api/src/step-definitions/zzprobe.steps.ts:9',
	]);
	const r = run(log);
	assert.equal(r.status, 1);
	const top = r.stdout.split('\n').slice(0, 6).join('\n');
	assert.match(top, /scenario {2}\/repo\/.*zzprobe\.feature:4 "PRB-AC1/);
	assert.match(top, /zzprobe\.feature:14 "PRB-AC3 a step throws" — step "Then the probe step throws" — TypeError/);
	assert.doesNotMatch(r.stdout, /node_modules/);
});
test('acceptance: plain cucumber failure summary', () => {
	const log = [
		'Failures:',
		'',
		'1) Scenario: X-AC1 lists things # src/features/x.feature:7',
		'   ✔ When the client requests "/api/x"',
		'   ✖ Then the response status is 200',
		'       AssertionError: expected 404 to equal 200',
	].join('\n');
	assert.deepEqual(acceptanceFailures(log, '/repo'), ['scenario  src/features/x.feature:7 "X-AC1 lists things" — Then the response status is 200']);
});
test('passing test lines are noise even when their names say error/failed', () => {
	const r = run('$ node --test\n✔ failed verify since start → block reason is the excerpt (5ms)\n✖ broken thing (3ms)\n  AssertionError: nope\n[ELIFECYCLE] Command failed with exit code 1.\n');
	assert.doesNotMatch(r.stdout, /✔/);
	assert.match(r.stdout, /AssertionError: nope/);
});
