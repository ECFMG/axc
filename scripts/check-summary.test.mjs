// node --test scripts/check-summary.test.mjs — check-log fixtures in the real tools' output formats.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { summarize } from './check-summary.mjs';

const root = path.resolve(import.meta.dirname, '..');
const log = [
	'packages/axc/rest/src/a.ts:1:8 lint/correctness/noUnusedImports  FIXABLE  ━━━━━━━━━━',
	'',
	'  ! This import is unused.',
	'packages/axc/rest/src/a.ts:2:8 lint/suspicious/useAwait ━━━━━━━━━━',
	'',
	'  × This async function lacks an await expression.',
	'Found 1 error.',
	"@axc/rest:typecheck: src/a.ts(3,10): error TS6133: 'x' is declared but its value is never read.",
	'@axc/rest:typecheck: [ELIFECYCLE] Command failed with exit code 2.',
	'@axc/application-services:test:  FAIL  src/b.test.ts > suite > adds up',
	'@axc/application-services:test: AssertionError: expected 1 to be 2 // Object.is equality',
	'$ knip --no-config-hints',
	'Unused exports (1)',
	'helper  packages/axc/rest/src/a.ts:9:14',
	'AC coverage failed: each AC id needs its own scenario. Missing:',
	'  X-AC2',
].join('\n');

test('one line per problem: file + rule/error id', () => {
	assert.deepEqual(summarize(log, root), [
		'biome (warn)  packages/axc/rest/src/a.ts:1:8 lint/correctness/noUnusedImports — This import is unused.',
		'biome  packages/axc/rest/src/a.ts:2:8 lint/suspicious/useAwait — This async function lacks an await expression.',
		"ts     packages/axc/rest/src/a.ts:3:10 TS6133 — 'x' is declared but its value is never read.",
		'test   packages/axc/application-services/src/b.test.ts > suite > adds up — AssertionError: expected 1 to be 2 // Object.is equality',
		'knip   Unused exports: helper packages/axc/rest/src/a.ts:9:14',
		'ac     missing X-AC2',
	]);
});
test('cli: header + summary; unrecognised failure falls back to the excerpt/tail', () => {
	const dir = mkdtempSync(path.join(tmpdir(), 'check-summary-'));
	try {
		const run = (text) => {
			const file = path.join(dir, 'check.log');
			writeFileSync(file, text);
			return execFileSync(process.execPath, [path.join(import.meta.dirname, 'check-summary.mjs'), file], { cwd: root, encoding: 'utf8' });
		};
		assert.match(run(log), /^check FAILED: 6 problem\(s\) — full log: .*check\.log\n/);
		assert.match(run('step one\nsomething odd happened\nlast line\n'), /last line/);
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
});
