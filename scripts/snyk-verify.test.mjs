// node --test scripts/snyk-verify.test.mjs — resolver + missing-CLI exit paths against fake PATH/nvm dirs in tmp.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, test } from 'node:test';
import { resolveSnyk } from './snyk-verify.mjs';

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
	const fail = spawnSync(process.execPath, [script], { encoding: 'utf8', env });
	assert.equal(fail.status, 1);
	assert.match(fail.stdout, /^Snyk: FAILED .*SNYK_OPTIONAL=1/m);
	const skip = spawnSync(process.execPath, [script], { encoding: 'utf8', env: { ...env, SNYK_OPTIONAL: '1' } });
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
