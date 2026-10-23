// node --test scripts/check-summary.test.mjs — check-log fixtures in the real tools' output formats.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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
		'knip   Unused exports: helper packages/axc/rest/src/a.ts:9:14 — drop `export`; keep it local',
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
test('TS2883 (real tsgo output): line names the function + add explicit return type', () => {
	const lines = summarize(readFileSync(path.join(import.meta.dirname, 'fixtures/ts2883.log'), 'utf8'), root);
	assert.match(lines[0], /^ts {5}packages\/axc\/rest\/src\/zzprobe\.ts:3:14 TS2883 — add explicit return type to exported 'sendProbe' \(e\.g\. `: Response`\); The inferred type/);
	assert.match(lines[1], /'failProbe'/);
});
test('knip unused exports/types (real output): rows say drop export, keep local', () => {
	assert.deepEqual(summarize(readFileSync(path.join(import.meta.dirname, 'fixtures/knip-unused.log'), 'utf8'), root), [
		'knip   Unused exports: zzProbeUnused packages/axc/rest/src/zzprobe.ts:2:14 — drop `export`; keep it local',
		'knip   Unused exported types: ZzProbeLocal type packages/axc/rest/src/zzprobe.ts:1:13 — drop `export`; keep the type local',
	]);
});

test('useImportType and TS18048 lines carry a one-clause fix', () => {
	const hints = [
		'packages/axc/rest/src/a.ts:1:1 lint/style/useImportType  FIXABLE  ━━━━━━━━━━',
		'',
		'  × All these imports are only used as types.',
		"@axc/rest:typecheck: src/a.ts(4,7): error TS18048: 'x' is possibly 'undefined'.",
	].join('\n');
	assert.deepEqual(summarize(hints, root), [
		'biome  packages/axc/rest/src/a.ts:1:1 lint/style/useImportType — use `import type` for type-only imports; All these imports are only used as types.',
		"ts     packages/axc/rest/src/a.ts:4:7 TS18048 — narrow before use (if / `?.` / `??`); 'x' is possibly 'undefined'.",
	]);
});
