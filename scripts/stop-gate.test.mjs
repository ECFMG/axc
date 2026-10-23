// node --test scripts/stop-gate.test.mjs — drives stop-gate.mjs with fake hook inputs in a throwaway repo
// whose pre-commit hook stands in for husky verify (writes the verify log; fails when FAKE_VERIFY_FAIL names a log).
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { chmodSync, copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, test } from 'node:test';
import { commitEnv, commitMessage, plan } from './stop-gate.mjs';

const gate = path.join(import.meta.dirname, 'stop-gate.mjs');
const failLog = path.join(import.meta.dirname, 'fixtures/acceptance-fail.log');
let repo;
// Hooks export GIT_DIR/GIT_INDEX_FILE: inherited, `git init` would rewrite the real repo's config (core.bare=true).
// Drop every GIT_* var and ignore global/system config so probes only touch the temp repo.
const cleanEnv = (extra = {}) => ({ ...Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('GIT_') && k !== 'HUSKY')), GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1', TMPDIR: repo, ...extra });
const sh = (...args) => execFileSync('git', args, { cwd: repo, env: cleanEnv(), encoding: 'utf8' });
const hook = (mode, input = {}, env = {}) => spawnSync(process.execPath, [gate, mode], { cwd: repo, env: cleanEnv(env), input: JSON.stringify({ sessionId: 's1', ...input }), encoding: 'utf8' });
const stopOut = (input, env) => {
	const out = hook('stop', input, env).stdout;
	return out ? JSON.parse(out) : null;
};
const stop = (input, env) => stopOut(input, env)?.reason ?? null;
const state = () => JSON.parse(readFileSync(path.join(repo, '.git/stop-gate/s1.json'), 'utf8'));
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
	// a stopHookActive retry after the block re-verifies (still red → block); a plain re-stop on that state → allow
	assert.match(stop({ stopHookActive: true }, { FAKE_VERIFY_FAIL: failLog }), /^Stop blocked/);
	assert.equal(stop({}, { FAKE_VERIFY_FAIL: failLog }), null);
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

test('auto-commit env: husky on and SNYK_SKIP=1 (Snyk stays off the Stop path); developer env untouched', () => {
	const base = { HUSKY: '0', PATH: '/bin' };
	assert.deepEqual(commitEnv(base), { PATH: '/bin', SNYK_SKIP: '1' });
	assert.deepEqual(base, { HUSKY: '0', PATH: '/bin' });
	const src = readFileSync(gate, 'utf8');
	assert.match(src, /const env = commitEnv\(\);[\s\S]*git \$\{hooks\}commit -q[^\n]*\], env\);/, 'the git commit spawn must use commitEnv()');
});

test('untracked file: editing only its contents changes the fingerprint, so the next stop re-verifies and commits it', () => {
	const before = head();
	write('new.md', 'broken\n');
	assert.match(stop({}, { FAKE_VERIFY_FAIL: failLog }), /^Stop blocked/);
	assert.equal(sh('ls-files', '-o', '--exclude-standard').trim(), 'new.md'); // reset left it untracked
	const blocked = state().lastBlocked;
	write('new.md', 'still broken\n'); // same name/status, new contents
	assert.match(stop({}, { FAKE_VERIFY_FAIL: failLog }), /^Stop blocked/, 'same-status untracked edit must not be allowed unverified');
	assert.notEqual(state().lastBlocked, blocked, 'fingerprint must cover untracked contents');
	write('new.md', 'fixed\n');
	assert.equal(stop(), null);
	assert.notEqual(head(), before);
	assert.match(sh('show', '--name-only', '--format=', 'HEAD'), /^new\.md$/m);
});
test('stopHookActive after a block re-verifies even with no change; after the cap it allows with a one-line note', () => {
	const before = head();
	write('a.md', 'b\n');
	assert.match(stop({}, { FAKE_VERIFY_FAIL: failLog }), /^Stop blocked/);
	assert.match(stop({ stopHookActive: true }, { FAKE_VERIFY_FAIL: failLog }), /^Stop blocked/);
	assert.match(stop({ stop_hook_active: true }, { FAKE_VERIFY_FAIL: failLog }), /^Stop blocked/);
	assert.equal(state().blocks, 3);
	const capped = stopOut({ stopHookActive: true }, { FAKE_VERIFY_FAIL: failLog });
	assert.deepEqual(Object.keys(capped), ['systemMessage']);
	assert.match(capped.systemMessage, /^Stop allowed — block cap \(3\) reached/);
	assert.equal(head(), before);
	// pure: a retry re-verifies a dirty tree whatever the fingerprint; without the block it stays an allow
	const s = { head: 'h', fingerprint: 'f', blocks: 1, last: 'block', lastBlocked: 'h:f' };
	assert.equal(plan(s, { head: 'h', fingerprint: 'f', dirty: true }, { active: true }), 'commit');
	assert.equal(plan(s, { head: 'h', fingerprint: 'f', dirty: true }), 'allow');
	assert.equal(plan({ ...s, last: 'allow' }, { head: 'h', fingerprint: 'f', dirty: true }, { active: true }), 'allow');
});
test('stopHookActive retry that fixes nothing new but now passes → commits', () => {
	write('a.md', 'b\n');
	assert.match(stop({}, { FAKE_VERIFY_FAIL: failLog }), /^Stop blocked/);
	const before = head();
	assert.equal(stop({ stopHookActive: true }), null); // e.g. the failure was outside the tree (stale dist, flaky host)
	assert.notEqual(head(), before);
	assert.equal(state().last, 'allow');
});

test('runs when invoked through a symlinked path (macOS /tmp → /private/tmp)', () => {
	const link = path.join(repo, 'linked-scripts');
	symlinkSync(import.meta.dirname, link);
	write('a.md', 'b\n');
	const r = spawnSync(process.execPath, [path.join(link, 'stop-gate.mjs'), 'stop'], { cwd: repo, env: cleanEnv({ FAKE_VERIFY_FAIL: failLog }), input: JSON.stringify({ sessionId: 's1' }), encoding: 'utf8' });
	rmSync(link);
	assert.match(JSON.parse(r.stdout).reason, /^Stop blocked/);
});

test('missing .husky/_: self-heal generates it, the commit runs .husky/pre-commit, git config is untouched', () => {
	rmSync(path.join(repo, '.git/hooks/pre-commit')); // only husky's hook may run
	mkdirSync(path.join(repo, '.husky'));
	mkdirSync(path.join(repo, 'node_modules/husky'), { recursive: true });
	copyFileSync(path.join(import.meta.dirname, '../node_modules/husky/husky'), path.join(repo, 'node_modules/husky/husky'));
	write('.gitignore', '*.log\nnode_modules/\nmarker\n');
	write('.husky/pre-commit', 'touch "$PWD/marker"\nprintf \'$ pnpm run verify\\nverify ok · acceptance 1/1\\n\' > "$TMPDIR/axc-verify-$(basename "$PWD").log"\n');
	sh('add', '-A');
	sh('commit', '-qm', 'husky dir', '--no-verify');
	hook('start', { sessionId: 'heal' });
	const config = sh('config', '--list', '--local');
	const before = head();
	write('widget.md', 'w\n');
	assert.equal(stop({ sessionId: 'heal' }), null);
	assert.ok(existsSync(path.join(repo, '.husky/_/h')) && existsSync(path.join(repo, '.husky/_/pre-commit')), '.husky/_ generated');
	assert.equal(readFileSync(path.join(repo, '.husky/_/pre-commit'), 'utf8'), '#!/usr/bin/env sh\n. "$(dirname "$0")/h"');
	assert.ok(existsSync(path.join(repo, 'marker')), '.husky/pre-commit ran');
	assert.notEqual(head(), before);
	assert.equal(sh('config', '--list', '--local'), config, 'no git config write');
	assert.equal(sh('status', '--porcelain'), '');
});
test('auto-fix runs before verify on changed files and is logged in the auto-commit body', () => {
	write('.gitignore', '*.log\nnode_modules/\n');
	sh('add', '-A');
	sh('commit', '-qm', 'ignore', '--no-verify');
	mkdirSync(path.join(repo, 'node_modules/.bin'), { recursive: true });
	const biome = path.join(repo, 'node_modules/.bin/biome');
	writeFileSync(biome, '#!/bin/sh\n[ "$1" = check ] || exit 0\nshift; for f; do case "$f" in --*) ;; *) echo "// fixed" >> "$f";; esac; done\n');
	chmodSync(biome, 0o755);
	write('widget.ts', 'export const w = 1;\n');
	write('widget.test.ts', 'export const t = 1;\n');
	assert.equal(stop(), null);
	assert.equal(readFileSync(path.join(repo, 'widget.ts'), 'utf8'), 'export const w = 1;\n// fixed\n');
	assert.equal(readFileSync(path.join(repo, 'widget.test.ts'), 'utf8'), 'export const t = 1;\n');
	assert.match(sh('log', '-1', '--format=%b'), /Auto-fix \(Stop hook, before verify\):\n- biome check --write: widget\.ts/);
	assert.equal(sh('status', '--porcelain'), '');
});
