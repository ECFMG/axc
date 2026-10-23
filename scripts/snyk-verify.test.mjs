// node --test scripts/snyk-verify.test.mjs — resolver + missing-CLI exit paths against fake PATH/nvm dirs in tmp.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, test } from 'node:test';
import { depsUnchanged, resolveSnyk } from './snyk-verify.mjs';

const script = path.join(import.meta.dirname, 'snyk-verify.mjs');
let dir;
beforeEach(() => {
	dir = mkdtempSync(path.join(tmpdir(), 'mog-snyk-'));
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

const fakeSnyk = (bin) => {
	mkdirSync(bin, { recursive: true });
	const file = path.join(bin, 'snyk');
	writeFileSync(file, '#!/bin/sh\nexit 0\n');
	chmodSync(file, 0o755);
	return file;
};
const opts = (extra) => ({ home: path.join(dir, 'home'), platform: 'linux', ...extra });

test('PATH wins over nvm', () => {
	const onPath = fakeSnyk(path.join(dir, 'path-bin'));
	fakeSnyk(path.join(dir, 'nvm/versions/node/v24.1.0/bin'));
	assert.equal(resolveSnyk(opts({ env: { PATH: path.join(dir, 'path-bin'), NVM_DIR: path.join(dir, 'nvm') } })), onPath);
});

test('falls back to the newest nvm Node bin that has snyk', () => {
	const nvm = path.join(dir, 'nvm');
	fakeSnyk(path.join(nvm, 'versions/node/v9.0.0/bin'));
	const want = fakeSnyk(path.join(nvm, 'versions/node/v20.19.3/bin'));
	mkdirSync(path.join(nvm, 'versions/node/v24.10.0/bin'), { recursive: true }); // newest, but no snyk
	assert.equal(resolveSnyk(opts({ env: { PATH: path.join(dir, 'empty'), NVM_DIR: nvm } })), want);
});

test('uses ~/.nvm when NVM_DIR is unset', () => {
	const want = fakeSnyk(path.join(dir, 'home/.nvm/versions/node/v20.19.3/bin'));
	assert.equal(resolveSnyk(opts({ env: { PATH: '' } })), want);
});

test('non-executable file is ignored; nothing found → null', () => {
	const bin = path.join(dir, 'path-bin');
	mkdirSync(bin, { recursive: true });
	writeFileSync(path.join(bin, 'snyk'), '');
	chmodSync(path.join(bin, 'snyk'), 0o644);
	assert.equal(resolveSnyk(opts({ env: { PATH: bin, NVM_DIR: path.join(dir, 'nvm') } })), null);
});

test('missing CLI fails, SNYK_OPTIONAL=1 skips', { skip: process.platform === 'win32' }, () => {
	const env = { PATH: path.join(dir, 'empty'), HOME: path.join(dir, 'home'), NVM_DIR: path.join(dir, 'nvm') };
	const fail = spawnSync(process.execPath, [script], { cwd: dir, encoding: 'utf8', env });
	assert.equal(fail.status, 1);
	assert.match(fail.stdout, /^Snyk: FAILED .*SNYK_OPTIONAL=1/m);
	const skip = spawnSync(process.execPath, [script], { cwd: dir, encoding: 'utf8', env: { ...env, SNYK_OPTIONAL: '1' } });
	assert.equal(skip.status, 0);
	assert.match(skip.stdout, /^Snyk: SKIPPED \(SNYK_OPTIONAL=1\)/m);
});

test('SNYK_SKIP=1 skips without calling snyk, even when one is installed', { skip: process.platform === 'win32' }, () => {
	const bin = path.join(dir, 'path-bin');
	mkdirSync(bin, { recursive: true });
	const marker = path.join(dir, 'snyk-called');
	writeFileSync(path.join(bin, 'snyk'), `#!/bin/sh\ntouch '${marker}'\n`);
	chmodSync(path.join(bin, 'snyk'), 0o755);
	const r = spawnSync(process.execPath, [script], { encoding: 'utf8', env: { PATH: bin, HOME: path.join(dir, 'home'), NVM_DIR: path.join(dir, 'nvm'), SNYK_SKIP: '1' } });
	assert.equal(r.status, 0);
	assert.equal(r.stdout.trim(), 'Snyk: SKIPPED (SNYK_SKIP=1, Stop-hook commit)');
	assert.equal(existsSync(marker), false, 'snyk must not be spawned');
});

// Dependency gate: a throwaway repo (GIT_* stripped, no global/system config) + a fake snyk that counts its calls.
// SNYK_* stripped too: verify inside a Stop-hook commit runs these tests with SNYK_SKIP=1 set.
const gitEnv = () => ({ ...Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('GIT_') && !k.startsWith('SNYK_'))), GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1' });
const gateRepo = () => {
	const repo = path.join(dir, 'repo');
	mkdirSync(path.join(repo, 'pkg'), { recursive: true });
	const g = (...args) => spawnSync('git', args, { cwd: repo, env: gitEnv(), encoding: 'utf8' });
	g('init', '-q');
	writeFileSync(path.join(repo, 'pkg/package.json'), '{"name":"a"}\n');
	writeFileSync(path.join(repo, 'pnpm-lock.yaml'), 'lockfileVersion: 9\n');
	writeFileSync(path.join(repo, 'a.ts'), 'export {};\n');
	g('add', '-A');
	g('-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-qm', 'init');
	const bin = path.join(dir, 'bin');
	mkdirSync(bin, { recursive: true });
	writeFileSync(path.join(bin, 'snyk'), `#!/bin/sh\n[ "$1" = test ] && echo x >> '${path.join(dir, 'calls')}'\necho 'no vulnerable paths found'\n`);
	chmodSync(path.join(bin, 'snyk'), 0o755);
	const run = (extra = {}) =>
		spawnSync(process.execPath, [script], { cwd: repo, encoding: 'utf8', env: { ...gitEnv(), PATH: `${bin}${path.delimiter}${process.env.PATH}`, NVM_DIR: path.join(dir, 'nvm'), HOME: path.join(dir, 'home'), ...extra } });
	const calls = () => (existsSync(path.join(dir, 'calls')) ? readFileSync(path.join(dir, 'calls'), 'utf8').split('\n').filter(Boolean).length : 0);
	return { repo, g, run, calls };
};

test('dependency gate: unknown state runs Snyk and records it; no dependency change skips', { skip: process.platform === 'win32' }, () => {
	const { repo, run, calls } = gateRepo();
	const first = run();
	assert.equal(first.status, 0);
	assert.match(first.stdout, /^Snyk: ok/m);
	assert.equal(calls(), 1);
	assert.ok(existsSync(path.join(repo, '.git/mog-snyk-ok.json')), 'state lives in the git dir, untracked');
	writeFileSync(path.join(repo, 'a.ts'), 'export const x = 1;\n'); // non-dependency edit
	const second = run();
	assert.equal(second.stdout.trim(), 'snyk: skipped (no dependency change)');
	assert.equal(calls(), 1);
});

test('dependency gate: a changed or new package.json / lockfile re-runs Snyk', { skip: process.platform === 'win32' }, () => {
	const { repo, run, calls } = gateRepo();
	run();
	writeFileSync(path.join(repo, 'pkg/package.json'), '{"name":"a","version":"2.0.0"}\n');
	assert.match(run().stdout, /^Snyk: ok/m);
	assert.equal(calls(), 2);
	assert.equal(run().stdout.trim(), 'snyk: skipped (no dependency change)');
	mkdirSync(path.join(repo, 'new'));
	writeFileSync(path.join(repo, 'new/package.json'), '{"name":"b"}\n'); // untracked manifest counts
	assert.match(run().stdout, /^Snyk: ok/m);
	assert.equal(calls(), 3);
});

test('dependency gate: a staged dependency change always runs Snyk; a corrupt state file runs it too', { skip: process.platform === 'win32' }, () => {
	const { repo, g, run, calls } = gateRepo();
	run();
	g('add', 'pnpm-lock.yaml'); // staged but identical content: diff --cached is empty → still skipped
	assert.equal(run().stdout.trim(), 'snyk: skipped (no dependency change)');
	writeFileSync(path.join(repo, 'pnpm-lock.yaml'), 'lockfileVersion: 9\n# x\n');
	g('add', 'pnpm-lock.yaml');
	run();
	assert.equal(calls(), 2);
	writeFileSync(path.join(repo, '.git/mog-snyk-ok.json'), 'not json');
	g('commit', '-qm', 'lock', '--no-verify');
	assert.match(run().stdout, /^Snyk: ok/m);
	assert.equal(calls(), 3);
});

test('dependency gate keeps SNYK_SKIP=1 first and fails closed outside git', { skip: process.platform === 'win32' }, () => {
	const { run, calls } = gateRepo();
	assert.equal(run({ SNYK_SKIP: '1' }).stdout.trim(), 'Snyk: SKIPPED (SNYK_SKIP=1, Stop-hook commit)');
	assert.equal(calls(), 0);
	assert.equal(depsUnchanged(null), false);
	mkdirSync(path.join(dir, 'plain'));
	const outside = spawnSync(process.execPath, [script], { cwd: path.join(dir, 'plain'), encoding: 'utf8', env: { ...gitEnv(), PATH: `${path.join(dir, 'bin')}${path.delimiter}${process.env.PATH}`, GIT_CEILING_DIRECTORIES: dir } });
	assert.match(outside.stdout, /^Snyk: ok/m); // not a repo → no state → run
	assert.equal(calls(), 1);
});
