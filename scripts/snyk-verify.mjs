// Snyk step of `pnpm run verify` (husky pre-commit; the Stop hook's auto-commit runs the same verify).
// Resolves snyk: PATH first, then every installed nvm Node's global bin (newest first), so a CLI installed
// under another Node still runs after `nvm use`. Missing → FAIL; SNYK_OPTIONAL=1 → print SKIPPED and continue.
// SNYK_SKIP=1 (set only by stop-gate's auto-commit) skips before resolving, even when snyk is installed.
// Dependency gate: Snyk runs only when the dependency manifests (every package.json, pnpm-lock.yaml,
// pnpm-workspace.yaml; staged content when staged) hash to no fresh Snyk-ok entry. Entries are shared by every
// worktree: `<git-common-dir>/mog-snyk-ok.json` = { depHash: { sha, at, snykVersion } } (untracked, never committed;
// newest SNYK_OK_MAX_ENTRIES kept, older than SNYK_OK_MAX_AGE_DAYS ignored; written via tmp file + rename). The old
// per-worktree `<git-dir>/mog-snyk-ok.json` ({ hash, commit, at }) is read as a fallback. Miss, expired or corrupt → run.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { accessSync, constants, existsSync, readdirSync, readFileSync, realpathSync, renameSync, writeFileSync } from 'node:fs';
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

const DEP_FILES = new Set(['package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml']);
const isDep = (f) => DEP_FILES.has(path.posix.basename(f));
const gitOut = (args, cwd, input = undefined) => {
	const r = spawnSync('git', args, { cwd, input, encoding: 'utf8', maxBuffer: 64 << 20 });
	return r.status === 0 ? r.stdout : null;
};

export const SNYK_OK_MAX_AGE_DAYS = 7;
export const SNYK_OK_MAX_ENTRIES = 20;
const STATE_NAME = 'mog-snyk-ok.json';

/**
 * Dependency-gate state for `cwd`: { stateFile, legacyFile, hash, mixed } or null outside git (→ always run).
 * A staged dependency file is hashed from its index blob; `mixed` = a dependency file is staged and also differs in
 * the worktree (Snyk would scan other content than the commit), which never skips and is never recorded.
 */
export function depState(cwd = process.cwd()) {
	const gitDir = gitOut(['rev-parse', '--absolute-git-dir'], cwd)?.trim();
	const commonDir = gitOut(['rev-parse', '--git-common-dir'], cwd)?.trim();
	const files = gitOut(['ls-files', '-co', '--exclude-standard', '-z'], cwd);
	const staged = gitOut(['diff', '--cached', '--name-only', '-z'], cwd);
	const unstaged = gitOut(['diff', '--name-only', '-z'], cwd);
	if (!gitDir || !commonDir || files === null || staged === null || unstaged === null) return null;
	const stagedDeps = new Set(staged.split('\0').filter((f) => f && isDep(f)));
	const deps = [...new Set(files.split('\0').filter((f) => f && isDep(f) && existsSync(path.join(cwd, f))))].sort();
	const fromIndex = deps.filter((f) => stagedDeps.has(f));
	const fromTree = deps.filter((f) => !stagedDeps.has(f));
	const treeBlobs = fromTree.length ? gitOut(['hash-object', '--stdin-paths'], cwd, fromTree.join('\n'))?.split('\n') : [];
	const indexBlobs = fromIndex.length ? gitOut(['rev-parse', ...fromIndex.map((f) => `:${f}`)], cwd)?.split('\n') : [];
	if (!treeBlobs || !indexBlobs) return null;
	const blob = new Map([...fromTree.map((f, i) => [f, treeBlobs[i]]), ...fromIndex.map((f, i) => [f, indexBlobs[i]])]);
	const hash = createHash('sha1')
		.update(deps.join('\n'))
		.update('\0')
		.update(deps.map((f) => `${blob.get(f)}\n`).join(''))
		.digest('hex');
	const mixed = unstaged.split('\0').some((f) => f && stagedDeps.has(f));
	return { stateFile: path.join(path.resolve(cwd, commonDir), STATE_NAME), legacyFile: path.join(gitDir, STATE_NAME), hash, mixed };
}

const readJson = (file) => {
	try {
		const v = JSON.parse(readFileSync(file, 'utf8'));
		return v && typeof v === 'object' && !Array.isArray(v) ? v : null;
	} catch {
		return null;
	}
};
const fresh = (at, now) => {
	const t = Date.parse(at);
	return Number.isFinite(t) && t <= now + 60_000 && now - t <= SNYK_OK_MAX_AGE_DAYS * 86_400_000;
};

/** True when Snyk may be skipped: a fresh Snyk-ok entry for this dependency hash (shared file, then legacy file). */
export function depsUnchanged(state, now = Date.now()) {
	if (!state || state.mixed) return false;
	const entry = readJson(state.stateFile)?.[state.hash];
	if (entry && typeof entry === 'object' && fresh(entry.at, now)) return true;
	const legacy = readJson(state.legacyFile);
	return legacy?.hash === state.hash && fresh(legacy.at, now);
}

/** Records a Snyk-ok run for state.hash in the shared file: newest SNYK_OK_MAX_ENTRIES kept, tmp file + rename. */
export function recordSnykOk(state, { sha = null, snykVersion = null, now = Date.now() } = {}) {
	if (!state || state.mixed) return;
	const entries = Object.entries(readJson(state.stateFile) ?? {}).filter(([k, v]) => k !== state.hash && v && typeof v === 'object' && Number.isFinite(Date.parse(v.at)));
	entries.push([state.hash, { sha, at: new Date(now).toISOString(), snykVersion }]);
	entries.sort((a, b) => Date.parse(b[1].at) - Date.parse(a[1].at));
	const tmp = `${state.stateFile}.${process.pid}.${Date.now()}.tmp`;
	writeFileSync(tmp, `${JSON.stringify(Object.fromEntries(entries.slice(0, SNYK_OK_MAX_ENTRIES)), null, '\t')}\n`);
	renameSync(tmp, state.stateFile);
}

function main() {
	if (process.env.SNYK_SKIP === '1') {
		console.log('Snyk: SKIPPED (SNYK_SKIP=1, Stop-hook commit)');
		process.exit(0);
	}
	const state = depState();
	if (depsUnchanged(state)) {
		console.log('snyk: skipped (no dependency change)');
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
		const version = spawnSync(snyk, ['--version'], { encoding: 'utf8' });
		recordSnykOk(state, { sha: gitOut(['rev-parse', 'HEAD'])?.trim() ?? null, snykVersion: version.status === 0 ? version.stdout.trim() : null });
		console.log(`Snyk: ok (${projects} projects, ${snyk} test --all-projects --policy-path=.snyk)`);
		process.exit(0);
	}
	process.stdout.write(output);
	console.log(`Snyk: FAILED (exit ${test.status ?? 'signal'})`);
	process.exit(test.status ?? 1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) main();
