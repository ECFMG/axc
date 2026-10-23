// node --test scripts/azurite-ignore.test.mjs — Azurite leftovers (worktree-suffixed storage dirs such as
// `__blobstorage__-<worktree>`, `__azurite_db_*__.json`, AzuriteConfig) are ignored by biome and git, so a local
// Azurite run never adds formatter errors to verify. knip needs no entry: its project globs are src/scripts .ts/.mjs
// only, and it honours .gitignore.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

const root = path.join(import.meta.dirname, '..');
const GLOBS = ['!**/__blobstorage__*', '!**/__queuestorage__*', '!**/__tablestorage__*', '!**/AzuriteConfig', '!**/__azurite_db_*'];
const LEFTOVERS = [
	'__blobstorage__-axc-mog-xai-1-g1/__azurite_db_blob__.json',
	'__queuestorage__-wt/__azurite_db_queue__.json',
	'__tablestorage__/__azurite_db_table__.json',
	'__blobstorage__-wt/AzuriteConfig',
	'__azurite_db_blob_extent__.json',
	'apps/api/__blobstorage__-wt/__azurite_db_blob__.json',
];
const gitEnv = () => ({ ...Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('GIT_'))), GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1' });

test('biome.json excludes the Azurite storage dirs with any suffix, AzuriteConfig and the Azurite db files', () => {
	const includes = JSON.parse(readFileSync(path.join(root, 'biome.json'), 'utf8')).files.includes;
	for (const g of GLOBS) assert.ok(includes.includes(g), `biome.json files.includes lacks ${g}`);
});

test('.gitignore ignores every Azurite leftover path', () => {
	const r = spawnSync('git', ['check-ignore', '--no-index', '--stdin', '-z'], { cwd: root, input: LEFTOVERS.join('\0'), encoding: 'utf8', env: gitEnv() });
	assert.deepEqual(r.stdout.split('\0').filter(Boolean).sort(), [...LEFTOVERS].sort());
});

const biome = path.join(root, 'node_modules/.bin/biome');
test('biome check skips badly formatted Azurite files but still reports a normal one', { skip: !existsSync(biome) && 'biome not installed' }, () => {
	const dir = mkdtempSync(path.join(tmpdir(), 'mog-azurite-'));
	try {
		copyFileSync(path.join(root, 'biome.json'), path.join(dir, 'biome.json'));
		const bad = '{"a":1,\n   "b":2}';
		for (const f of [...LEFTOVERS, 'control.json']) {
			mkdirSync(path.dirname(path.join(dir, f)), { recursive: true });
			writeFileSync(path.join(dir, f), bad);
		}
		const r = spawnSync(biome, ['check', '--no-errors-on-unmatched', '.'], { cwd: dir, encoding: 'utf8' });
		const out = `${r.stdout}${r.stderr}`;
		assert.match(out, /control\.json/, 'control file must be checked (config loaded)');
		for (const f of LEFTOVERS) assert.equal(out.includes(f), false, `biome checked ${f}`);
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
});
