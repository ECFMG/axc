// node --test scripts/verify-excerpt.test.mjs — fake verify logs on stdin.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { test } from 'node:test';

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
