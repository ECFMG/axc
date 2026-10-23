// node --test scripts/stop-gate.test.mjs — drives stop-gate.mjs with fake hook inputs in a throwaway repo
// whose pre-commit hook stands in for husky verify (writes the verify log; fails when FAKE_VERIFY_FAIL names a log).
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, test } from 'node:test';
import { commitMessage, plan } from './stop-gate.mjs';

const gate = path.join(import.meta.dirname, 'stop-gate.mjs');
const failLog = path.join(import.meta.dirname, 'fixtures/acceptance-fail.log');
let repo;
// Hooks export GIT_DIR/GIT_INDEX_FILE: inherited, `git init` would rewrite the real repo's config (core.bare=true).
// Drop every GIT_* var and ignore global/system config so probes only touch the temp repo.
const cleanEnv = (extra = {}) => ({ ...Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('GIT_') && k !== 'HUSKY')), GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1', TMPDIR: repo, ...extra });
const sh = (...args) => execFileSync('git', args, { cwd: repo, env: cleanEnv(), encoding: 'utf8' });
const hook = (mode, input = {}, env = {}) => spawnSync(process.execPath, [gate, mode], { cwd: repo, env: cleanEnv(env), input: JSON.stringify({ sessionId: 's1', ...input }), encoding: 'utf8' });
const stop = (input, env) => {
	const out = hook('stop', input, env).stdout;
	return out ? JSON.parse(out).reason : null;
};
const head = () => sh('rev-parse', 'HEAD').trim();
const write = (f, v) => writeFileSync(path.join(repo, f), v);

beforeEach(() => {
	repo = mkdtempSync(path.join(tmpdir(), 'stop-gate-'));
	sh('init', '-q');
	sh('config', 'user.name', 't');
	sh('config', 'user.email', 't@t');
	const pre = path.join(repo, '.git/hooks/pre-commit');
	writeFileSync(
		pre,
		'#!/bin/sh\nLOG="$TMPDIR/axc-verify-$(basename "$PWD").log"\nif [ -n "$FAKE_VERIFY_FAIL" ]; then cat "$FAKE_VERIFY_FAIL" > "$LOG"; exit 1; fi\nprintf \'$ pnpm run verify\\nverify ok · acceptance 1/1\\n\' > "$LOG"\n',
	);
	chmodSync(pre, 0o755);
	write('a.md', 'a\n');
	write('.gitignore', '*.log\n'); // TMPDIR = repo: logs are not work
	sh('add', '-A');
	sh('commit', '-qm', 'init', '--no-verify');
	hook('start');
});
afterEach(() => rmSync(repo, { recursive: true, force: true }));

test('no edits (pure Q&A) → allow, no commit', () => {
	const before = head();
	assert.equal(stop(), null);
	assert.equal(head(), before);
});
test('edits + green verify → auto-commit, silent, clean tree, generic message', () => {
	const before = head();
	write('widget.md', 'w\n');
	assert.equal(stop(), null);
	assert.notEqual(head(), before);
	assert.equal(sh('status', '--porcelain'), '');
	assert.match(sh('log', '-1', '--format=%s%n%b'), /^feat: add widget[\s\S]*Auto-committed by the Stop hook[\s\S]*A widget\.md/);
	assert.equal(stop(), null); // later stop with nothing new
});
test('edits + red verify → block with the terse scenario report, nothing committed or left staged', () => {
	const before = head();
	write('a.md', 'b\n');
	const reason = stop({}, { FAKE_VERIFY_FAIL: failLog });
	assert.match(reason, /^Stop blocked — nothing committed/);
	assert.match(reason, /zzprobe\.feature:4 "PRB-AC1 health reports a wrong status" — step "Then the probe status is 418" — AssertionError/);
	assert.ok(reason.split('\n').length < 15);
	assert.equal(head(), before);
	assert.equal(sh('diff', '--cached', '--name-only'), '');
	assert.equal(readFileSync(path.join(repo, 'a.md'), 'utf8'), 'b\n');
	// stopHookActive retry without changes → allow (never block twice for the same tree state)
	assert.equal(stop({ stopHookActive: true }, { FAKE_VERIFY_FAIL: failLog }), null);
	// fixed (tree changed) → commits
	write('a.md', 'c\n');
	assert.equal(stop({ stop_hook_active: true }), null);
	assert.notEqual(head(), before);
});
test('block cap: at most 3 per session', () => {
	const results = ['b', 'c', 'd', 'e'].map((v) => {
		write('a.md', `${v}\n`);
		return stop({}, { FAKE_VERIFY_FAIL: failLog }) !== null;
	});
	assert.deepEqual(results, [true, true, true, false]);
});
test('agent committed itself without a finished verify → block; with one → allow', () => {
	write('a.md', 'b\n');
	sh('commit', '-qam', 'manual', '--no-verify');
	assert.match(stop(), /no `verify ok` summary/);
	write('a.md', 'c\n');
	sh('commit', '-qam', 'manual 2'); // fake husky writes the summary
	assert.equal(stop(), null);
});
test('run (no Stop hook): one ok line on success, report + exit 1 on failure', () => {
	write('a.md', 'b\n');
	const bad = spawnSync(process.execPath, [gate, 'run'], { cwd: repo, env: cleanEnv({ FAKE_VERIFY_FAIL: failLog }), encoding: 'utf8' });
	assert.equal(bad.status, 1);
	assert.match(bad.stdout, /PRB-AC1/);
	const ok = spawnSync(process.execPath, [gate, 'run'], { cwd: repo, env: cleanEnv(), encoding: 'utf8' });
	assert.equal(ok.status, 0);
	assert.match(ok.stdout, /^verify ok · acceptance 1\/1 · [0-9a-f]{7}/);
});
test('plan + commitMessage (pure)', () => {
	const s = { head: 'h', fingerprint: 'f', blocks: 0 };
	assert.equal(plan(s, { head: 'h', fingerprint: 'f', dirty: true }), 'allow');
	assert.equal(plan(s, { head: 'h', fingerprint: 'g', dirty: true }), 'commit');
	assert.equal(plan({ ...s, lastBlocked: 'h:g' }, { head: 'h', fingerprint: 'g', dirty: true }), 'allow');
	assert.deepEqual(Object.keys(plan(s, { head: 'i', fingerprint: 'g', dirty: false }, { verified: false })), ['block']);
	assert.equal(commitMessage('M\tapps/docs/docs/x.md\nM\tapps/docs/sidebars.ts\n', () => 'docs')[0], 'chore: update x (docs)');
	assert.equal(commitMessage('D\tsrc/old.ts\n', () => 'core')[0], 'chore: remove old (core)');
	assert.equal(commitMessage('M\tpackages/axc/rest/src/index.ts\n', () => 'rest')[0], 'chore: update index (rest)');
});

test('verify typechecks through turbo after building workspace deps, so a stale dist cannot cause false TS2305', () => {
	const root = path.resolve(import.meta.dirname, '..');
	const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
	const turbo = JSON.parse(readFileSync(path.join(root, 'turbo.json'), 'utf8'));
	assert.match(pkg.scripts.verify, /pnpm run typecheck/);
	assert.equal(pkg.scripts.typecheck, 'turbo run typecheck');
	for (const task of ['typecheck', 'test', 'test:arch']) assert.ok(turbo.tasks[task].dependsOn.includes('^build'), `${task} must depend on ^build`);
});
