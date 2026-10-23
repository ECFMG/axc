// node --test scripts/auto-fix.test.mjs — pure fixer logic + autoFix against fake biome/knip bins in a throwaway repo.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, test } from 'node:test';
import { autoFix, changedFiles, dropAsync, fixTargets } from './auto-fix.mjs';

test('fixTargets: write dirs only; never tests, steps, features or path_deny files', () => {
	const files = [
		'packages/axc/rest/src/a.ts',
		'packages/axc/rest/src/a.test.ts',
		'packages/x/src/b.spec.ts',
		'acc/src/step-definitions/h.steps.ts',
		'acc/src/features/h.feature',
		'packages/axc/rest/src/c.json',
		'packages/axc/rest/.env',
		'scripts/s.mjs',
		'pnpm-lock.yaml',
	];
	const t = fixTargets(files, { dirs: ['packages/axc', 'acc'], deny: [/(^|\/)\.env(\.|$)/, /(^|\/)pnpm-lock\.yaml$/] });
	assert.deepEqual(t, { biome: ['packages/axc/rest/src/a.ts', 'packages/axc/rest/src/c.json'], code: ['packages/axc/rest/src/a.ts'] });
});

test('dropAsync: arrow, function and method; skips Promise-typed signatures, generators and non-async spots', () => {
	const src = [
		'export const f = async (x: number) => {', // 1:18
		'\treturn x + 1;',
		'};',
		'export async function g() {', // 4:8
		'\treturn 1;',
		'}',
		'const o = { async m() { return 2; } };', // 7:13
		'export async function p(): Promise<number> {', // 8:8 skipped
		'\treturn 1;',
		'}',
		'export const q = 1;', // 11:1 not async
	].join('\n');
	const { src: out, n } = dropAsync(src, [
		{ line: 1, col: 18 },
		{ line: 4, col: 8 },
		{ line: 7, col: 13 },
		{ line: 8, col: 8 },
		{ line: 11, col: 1 },
	]);
	assert.equal(n, 3);
	assert.match(out, /^export const f = \(x: number\) => \{/);
	assert.match(out, /\nexport function g\(\) \{/);
	assert.match(out, /\{ m\(\) \{ return 2; \} \}/);
	assert.match(out, /\nexport async function p\(\): Promise<number> \{/);
	assert.equal(dropAsync('async function* g() {}', [{ line: 1, col: 1 }]).n, 0);
});

let repo;
const git = (...args) =>
	execFileSync('git', args, { cwd: repo, env: { ...Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('GIT_'))), GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1' }, encoding: 'utf8' });
const write = (f, v) => {
	mkdirSync(path.dirname(path.join(repo, f)), { recursive: true });
	writeFileSync(path.join(repo, f), v);
};
const read = (f) => readFileSync(path.join(repo, f), 'utf8');
const fakeBin = (name, body) => {
	write(`node_modules/.bin/${name}`, `#!/bin/sh\n${body}\n`);
	chmodSync(path.join(repo, `node_modules/.bin/${name}`), 0o755);
};
beforeEach(() => {
	repo = mkdtempSync(path.join(tmpdir(), 'mog-autofix-'));
	git('init', '-q');
	write('.gitignore', 'node_modules/\n');
	write('src/keep.ts', 'export const keep = 1;\n');
	write('src/a.ts', 'export const a = 1;\n');
	git('add', '-A');
	git('-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-qm', 'init');
});
afterEach(() => rmSync(repo, { recursive: true, force: true }));

test('autoFix: useAwait spots from biome, knip limited to changed files, biome --write; tests untouched; log names fixer + files', () => {
	// fake biome: `lint` reports useAwait at src/a.ts:1:18 (github reporter); `check --write` appends a marker to each file
	fakeBin(
		'biome',
		'if [ "$1" = lint ]; then echo "::error title=lint/suspicious/useAwait,file=src/a.ts,line=1,endLine=1,col=18,endColumn=40::lacks await"; exit 1; fi\nshift; for f; do case "$f" in --*) ;; *) echo "// fmt" >> "$f";; esac; done',
	);
	// fake knip: rewrites src/a.ts (changed → allowed) and src/keep.ts (unchanged → must be restored)
	fakeBin('knip', "sed -i.bak 's/^export interface/interface/' src/a.ts && rm -f src/a.ts.bak; echo '// knip' >> src/keep.ts");
	write('src/a.ts', 'export const a = async () => {\n\treturn 1;\n};\nexport interface T { x: number }\n');
	write('src/a.test.ts', 'export const t = async () => 1;\n');
	const t = fixTargets(changedFiles(repo));
	assert.deepEqual(t.code, ['src/a.ts']);
	const log = autoFix(repo, t);
	assert.deepEqual(log, ['useAwait (drop async): src/a.ts', 'knip --fix exports,types: src/a.ts', 'biome check --write: src/a.ts']);
	assert.equal(read('src/a.ts'), 'export const a = () => {\n\treturn 1;\n};\ninterface T { x: number }\n// fmt\n');
	assert.equal(read('src/keep.ts'), 'export const keep = 1;\n', 'knip edit outside the changed files restored');
	assert.equal(read('src/a.test.ts'), 'export const t = async () => 1;\n', 'test files never fixed');
});

test('autoFix: no fixer bins → no-op, empty log', () => {
	write('src/a.ts', 'export const a = async () => 1;\n');
	assert.deepEqual(autoFix(repo, fixTargets(changedFiles(repo))), []);
	assert.equal(read('src/a.ts'), 'export const a = async () => 1;\n');
});
