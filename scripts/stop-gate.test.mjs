// node --test scripts/stop-gate.test.mjs — drives stop-gate.mjs with fake hook inputs in a throwaway repo.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, test } from 'node:test';

const gate = path.join(import.meta.dirname, 'stop-gate.mjs');
let repo;
// Hooks export GIT_DIR/GIT_INDEX_FILE: inherited, `git init` would rewrite the real repo's config (core.bare=true).
// Drop every GIT_* var and ignore global/system config so probes only touch the temp repo.
const cleanEnv = () => ({ ...Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('GIT_'))), GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1', TMPDIR: repo });
const sh = (...args) => execFileSync('git', args, { cwd: repo, env: cleanEnv(), stdio: 'ignore' });
const hook = (mode, input = {}) => execFileSync(process.execPath, [gate, mode], { cwd: repo, env: cleanEnv(), input: JSON.stringify({ sessionId: 's1', ...input }), encoding: 'utf8' });
const blocked = (input) => {
	const out = hook('stop', input);
	return out ? JSON.parse(out).decision === 'block' : false;
};
const commit = (msg) => {
	sh('add', '-A');
	sh('-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-qm', msg);
};

beforeEach(() => {
	repo = mkdtempSync(path.join(tmpdir(), 'stop-gate-'));
	sh('init', '-q');
	writeFileSync(path.join(repo, 'a.md'), 'a\n');
	commit('init');
	hook('start');
});
afterEach(() => rmSync(repo, { recursive: true, force: true }));

test('no edits (pure Q&A) → allow', () => assert.equal(blocked(), false));
test('dirty, HEAD unchanged → block', () => {
	writeFileSync(path.join(repo, 'a.md'), 'b\n');
	assert.equal(blocked(), true);
});
test('new commit + clean tree → allow', () => {
	writeFileSync(path.join(repo, 'a.md'), 'b\n');
	commit('work');
	assert.equal(blocked(), false);
});
test('new commit + dirty tree → block', () => {
	writeFileSync(path.join(repo, 'a.md'), 'b\n');
	commit('work');
	writeFileSync(path.join(repo, 'b.md'), 'x\n');
	assert.equal(blocked(), true);
});
test('stopHookActive → allow', () => {
	writeFileSync(path.join(repo, 'a.md'), 'b\n');
	assert.equal(blocked({ stopHookActive: true }), false);
	assert.equal(blocked({ stop_hook_active: true }), false);
});
test('same state never blocks twice; cap 3 per session; start is idempotent', () => {
	hook('start');
	const edit = (v) => {
		writeFileSync(path.join(repo, 'a.md'), `${v}\n`);
		return blocked();
	};
	assert.deepEqual([edit('b'), blocked(), edit('c'), edit('d'), edit('e')], [true, false, true, true, false]);
	assert.equal(blocked({ sessionId: 'other' }), false);
});
test('failed verify since start → block reason is the excerpt', () => {
	writeFileSync(path.join(repo, 'a.md'), 'b\n');
	writeFileSync(path.join(repo, `axc-verify-${path.basename(repo)}.log`), '$ biome check .\nx.ts:1:1 lint/suspicious/noExplicitAny\n  × Unexpected any.\n[ELIFECYCLE] Command failed with exit code 1.\n');
	assert.match(JSON.parse(hook('stop')).reason, /noExplicitAny/);
});
