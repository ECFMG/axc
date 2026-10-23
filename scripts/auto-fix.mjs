// Stop-hook auto-fix (stop-gate runs it before the commit's verify). Only the agent's changed files inside the write
// dirs; never write-boundary path_deny files; never test/spec/feature/step files (no fixer may touch assertions).
//   1. useAwait: drop `async` where biome reports no `await` (skipped when the signature names `Promise<`).
//   2. knip --fix (exports + types; repeated --fix-type: knip 5.88 ignores the comma form): drop unused `export`s;
//      any other file knip touches is restored. knip errors (e.g. an unbuilt worktree: vitest configs import workspace
//      `dist/`) → `pnpm run build` once (turbo-cached; verify's build then hits the cache) and retry.
//   3. biome check --write: safe fixes + format only (no --unsafe).
// Dependency-free; every fixer is optional (missing node_modules/.bin → skipped) and fails open. Returns log lines.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

// Repo-locating vars (set inside git hooks) would point these git calls at another repo: always use `root`.
const gitEnv = () => Object.fromEntries(Object.entries(process.env).filter(([k]) => !/^GIT_(DIR|WORK_TREE|INDEX_FILE|COMMON_DIR|OBJECT_DIRECTORY|PREFIX)$/.test(k)));
const TEST = /(^|\/)(step-definitions|__tests__|features)\/|\.(test|spec)\.[cm]?[jt]sx?$|\.steps\.[cm]?[jt]sx?$|\.feature$/;
const CODE = /\.[cm]?[jt]sx?$/;
const BIOME = /\.([cm]?[jt]sx?|jsonc?|css)$/;

/** Changed paths (tracked edits + untracked files, existing only) from `git status --porcelain -z -uall`. */
export function changedFiles(root) {
	const r = spawnSync('git', ['status', '--porcelain', '-z', '-uall'], { cwd: root, env: gitEnv(), encoding: 'utf8', maxBuffer: 64 << 20 });
	if (r.status !== 0) return [];
	const parts = r.stdout.split('\0');
	const files = [];
	for (let i = 0; i < parts.length; i++) {
		const e = parts[i];
		if (!e) continue;
		if (e[0] === 'R' || e[0] === 'C') i++; // next entry is the rename source
		const f = e.slice(3);
		if (existsSync(path.join(root, f))) files.push(f);
	}
	return files;
}

/** Which changed files each fixer may touch. Pure. */
export function fixTargets(files, { dirs = [], deny = [] } = {}) {
	const ok = files.filter((f) => (!dirs.length || dirs.some((d) => f.startsWith(`${d}/`))) && !deny.some((re) => re.test(f)) && !TEST.test(f));
	return { biome: ok.filter((f) => BIOME.test(f)), code: ok.filter((f) => CODE.test(f)) };
}

/** Drop `async` at 1-based {line, col} spots (biome useAwait starts). Skips spots that are not `async`, async generators
 * and signatures naming `Promise<` (dropping async there breaks the declared type). Pure; returns { src, n }. */
export function dropAsync(src, spots) {
	const starts = [0];
	for (let i = 0; i < src.length; i++) if (src[i] === '\n') starts.push(i + 1);
	const offsets = spots.map(({ line, col }) => (starts[line - 1] ?? Number.NaN) + col - 1).filter((o) => Number.isInteger(o) && o >= 0);
	let n = 0;
	for (const o of [...new Set(offsets)].sort((a, b) => b - a)) {
		const rest = src.slice(o);
		const m = /^async\s+/.exec(rest);
		if (!m || /^async\s*(function\s*)?\*/.test(rest)) continue;
		const ends = [rest.indexOf('=>'), rest.search(/\)\s*\{/)].filter((i) => i >= 0);
		if (!ends.length || /\bPromise\s*</.test(rest.slice(0, Math.min(...ends) + 2))) continue;
		src = src.slice(0, o) + rest.slice(m[0].length);
		n++;
	}
	return { src, n };
}

const hasBuild = (root) => {
	try {
		return Boolean(JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8')).scripts?.build);
	} catch {
		return false;
	}
};

/** Run the fixers. `prefix` is a shell snippet run first (e.g. `nvm use`). Returns log lines, e.g. `knip: a.ts`. */
export function autoFix(root, targets, { prefix = '', env = process.env } = {}) {
	const bin = (n) => path.join(root, 'node_modules/.bin', n);
	const sh = (cmd, args) => spawnSync('sh', ['-c', `${prefix}"$0" "$@"`, cmd, ...args], { cwd: root, env, encoding: 'utf8', maxBuffer: 64 << 20 });
	const read = (f) => {
		try {
			return readFileSync(path.join(root, f));
		} catch {
			return null;
		}
	};
	const digest = (f) => {
		const b = read(f);
		return b ? createHash('sha1').update(b).digest('hex') : '';
	};
	const touched = (files, fn) => {
		const before = files.map(digest);
		fn();
		return files.filter((f, i) => digest(f) !== before[i]);
	};
	const log = [];
	try {
		if (targets.code.length && existsSync(bin('biome'))) {
			const r = sh(bin('biome'), ['lint', '--only=suspicious/useAwait', '--reporter=github', '--no-errors-on-unmatched', ...targets.code]);
			const byFile = new Map();
			for (const m of `${r.stdout}`.matchAll(/^::\w+ title=lint\/suspicious\/useAwait,file=([^,]+),line=(\d+),(?:[^:]*?,)?col=(\d+)/gm)) {
				const f = path.relative(root, path.resolve(root, m[1]));
				if (targets.code.includes(f)) byFile.set(f, [...(byFile.get(f) ?? []), { line: Number(m[2]), col: Number(m[3]) }]);
			}
			const fixed = [];
			for (const [f, spots] of byFile) {
				const { src, n } = dropAsync(read(f).toString('utf8'), spots);
				if (n) {
					writeFileSync(path.join(root, f), src);
					fixed.push(f);
				}
			}
			if (fixed.length) log.push(`useAwait (drop async): ${fixed.join(', ')}`);
		}
		if (targets.code.length && existsSync(bin('knip'))) {
			const saved = new Map(
				changedFiles(root)
					.filter((f) => !targets.code.includes(f))
					.map((f) => [f, read(f)]),
			);
			const knip = () => sh(bin('knip'), ['--fix', '--fix-type', 'exports', '--fix-type', 'types', '--no-exit-code', '--no-progress', '--no-config-hints']);
			let built = false;
			const t = touched(targets.code, () => {
				if (knip().status === 0 || !hasBuild(root)) return;
				built = sh('pnpm', ['run', 'build']).status === 0;
				if (built) knip();
			});
			if (built) log.push('build (knip could not load its config before it)');
			for (const f of changedFiles(root)) {
				if (targets.code.includes(f)) continue;
				if (!saved.has(f)) spawnSync('git', ['checkout', '-q', '--', f], { cwd: root, env: gitEnv() });
				else if (saved.get(f) && !saved.get(f).equals(read(f) ?? Buffer.alloc(0))) writeFileSync(path.join(root, f), saved.get(f));
			}
			if (t.length) log.push(`knip --fix exports,types: ${t.join(', ')}`);
		}
		if (targets.biome.length && existsSync(bin('biome'))) {
			const t = touched(targets.biome, () => sh(bin('biome'), ['check', '--write', '--no-errors-on-unmatched', ...targets.biome]));
			if (t.length) log.push(`biome check --write: ${t.join(', ')}`);
		}
	} catch {
		// fail open: verify reports whatever is left
	}
	return log;
}
