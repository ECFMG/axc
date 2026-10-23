// Snyk step of `pnpm run verify` (husky pre-commit; the Stop hook's auto-commit runs the same verify).
// Resolves snyk: PATH first, then every installed nvm Node's global bin (newest first), so a CLI installed
// under another Node still runs after `nvm use`. Missing → FAIL; SNYK_OPTIONAL=1 → print SKIPPED and continue.
// SNYK_SKIP=1 (set only by stop-gate's auto-commit) skips before resolving, even when snyk is installed.
import { spawnSync } from 'node:child_process';
import { accessSync, constants, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const isExe = (file, platform) => {
	try {
		accessSync(file, platform === 'win32' ? constants.F_OK : constants.X_OK);
		return true;
	} catch {
		return false;
	}
};

const versionKey = (dir) => (dir.match(/\d+/g) ?? []).map(Number);
const newestFirst = (a, b) => {
	const [x, y] = [versionKey(a), versionKey(b)];
	for (let i = 0; i < Math.max(x.length, y.length); i++) if ((x[i] ?? 0) !== (y[i] ?? 0)) return (y[i] ?? 0) - (x[i] ?? 0);
	return 0;
};

/** Absolute path of the snyk CLI, or null. Pure apart from fs reads; env/home/platform injectable for tests. */
export function resolveSnyk({ env = process.env, home = homedir(), platform = process.platform } = {}) {
	const names = platform === 'win32' ? ['snyk.exe', 'snyk.cmd', 'snyk'] : ['snyk'];
	const dirs = (env.PATH ?? env.Path ?? '').split(path.delimiter).filter(Boolean);
	const nvmRoots = [...new Set([env.NVM_DIR, path.join(home, '.nvm')].filter(Boolean))];
	for (const root of nvmRoots) {
		const versions = path.join(root, 'versions', 'node');
		let entries = [];
		try {
			entries = readdirSync(versions);
		} catch {
			continue;
		}
		for (const v of entries.sort(newestFirst)) dirs.push(path.join(versions, v, 'bin'));
	}
	for (const dir of dirs) for (const name of names) if (isExe(path.join(dir, name), platform)) return path.join(dir, name);
	return null;
}

function main() {
	if (process.env.SNYK_SKIP === '1') {
		console.log('Snyk: SKIPPED (SNYK_SKIP=1, Stop-hook commit)');
		process.exit(0);
	}
	const snyk = resolveSnyk();
	if (!snyk) {
		if (process.env.SNYK_OPTIONAL === '1') {
			console.log('Snyk: SKIPPED (SNYK_OPTIONAL=1) — snyk CLI not found on PATH or in any nvm Node bin.');
			process.exit(0);
		}
		console.log('Snyk: FAILED — snyk CLI not found on PATH or in any nvm Node bin; install it, or set SNYK_OPTIONAL=1 to skip.');
		process.exit(1);
	}
	// Local CLI only (no monitor, no --remote-repo-url). One line on success; full output on failure.
	const test = spawnSync(snyk, ['test', '--all-projects', '--policy-path=.snyk'], { encoding: 'utf8' });
	const output = `${test.stdout ?? ''}${test.stderr ?? ''}`;
	if (test.status === 0) {
		const projects = (output.match(/no vulnerable paths found/g) ?? []).length;
		console.log(`Snyk: ok (${projects} projects, ${snyk} test --all-projects --policy-path=.snyk)`);
		process.exit(0);
	}
	process.stdout.write(output);
	console.log(`Snyk: FAILED (exit ${test.status ?? 'signal'})`);
	process.exit(test.status ?? 1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main();
