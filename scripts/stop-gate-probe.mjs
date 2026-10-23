// Dry Stop-hook probe (manual; slow — runs the real install + husky verify twice). Never run inside a SCORE run.
//   node scripts/stop-gate-probe.mjs [--keep]
// In a fresh detached /tmp worktree of HEAD: plant a type error in a NEW untracked test file → stop must block
// (Grok/Claude {"decision":"block","reason"}) with HEAD unchanged and the file still untracked; fix only that file's
// contents → stopHookActive re-stop must verify, allow silently and auto-commit a commit that contains the file.
// Git runs with GIT_* stripped and global/system config ignored; the worktree is removed afterwards unless --keep.
import { execFileSync, spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, realpathSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const keep = process.argv.includes('--keep');
const env = {
	...Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('GIT_') && k !== 'HUSKY')),
	GIT_CONFIG_GLOBAL: '/dev/null',
	GIT_CONFIG_NOSYSTEM: '1',
	GIT_AUTHOR_NAME: 'mog probe',
	GIT_AUTHOR_EMAIL: 'probe@localhost',
	GIT_COMMITTER_NAME: 'mog probe',
	GIT_COMMITTER_EMAIL: 'probe@localhost',
};
const git = (cwd, ...args) => execFileSync('git', args, { cwd, env, encoding: 'utf8' }).trim();
const src = git(process.cwd(), 'rev-parse', '--show-toplevel');
if (git(src, 'rev-parse', '--is-bare-repository') !== 'false') throw new Error('core.bare is not false; refusing to probe');
const wt = path.join(realpathSync(mkdtempSync(path.join(tmpdir(), 'mog-stopprobe-'))), 'wt');
const rel = 'packages/axc/application-services/src/zz-stop-probe.test.ts';
const file = path.join(wt, rel);
const results = [];
const check = (name, ok, detail = '') => {
	results.push(ok);
	console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
};
const hook = (mode, input = {}) => {
	const t = Date.now();
	const r = spawnSync(process.execPath, [path.join(wt, 'scripts/stop-gate.mjs'), mode], { cwd: wt, env, input: JSON.stringify({ sessionId: 'mog-probe', ...input }), encoding: 'utf8', maxBuffer: 64 << 20 });
	return { out: r.stdout.trim(), secs: ((Date.now() - t) / 1000).toFixed(1) };
};

git(src, 'worktree', 'add', '--detach', '-q', wt, 'HEAD');
try {
	// `.husky/_` is generated (gitignored) and core.hooksPath is shared: a run worktree gets it at setup. Copy it like
	// setup does — never run `husky` here (it writes core.hooksPath to the shared config).
	if (!existsSync(path.join(src, '.husky/_/h'))) throw new Error(`${src}/.husky/_ missing; set up husky in the source worktree first`);
	cpSync(path.join(src, '.husky/_'), path.join(wt, '.husky/_'), { recursive: true });
	const base = git(wt, 'rev-parse', 'HEAD');
	hook('start');
	writeFileSync(file, "import { expect, it } from 'vitest';\n\nit('stop probe', () => {\n\tconst n: number = 'not a number';\n\texpect(n).toBe(1);\n});\n");
	const red = hook('stop');
	let blocked = null;
	try {
		blocked = JSON.parse(red.out);
	} catch {
		blocked = null; // no JSON: the hook allowed (or crashed and failed open)
	}
	check('1 planted type error blocks the stop', blocked?.decision === 'block' && typeof blocked.reason === 'string', `${red.secs}s`);
	if (blocked?.reason)
		console.log(
			blocked.reason
				.split('\n')
				.map((l) => `    ${l}`)
				.join('\n'),
		);
	check('  reason is short and names the file', (blocked?.reason ?? '').split('\n').length < 15 && (blocked?.reason ?? '').includes('zz-stop-probe'));
	check('  nothing committed, file still untracked', git(wt, 'rev-parse', 'HEAD') === base && git(wt, 'ls-files', '-o', '--exclude-standard').split('\n').includes(rel));

	writeFileSync(file, "import { expect, it } from 'vitest';\n\nit('stop probe', () => {\n\tconst n: number = 1;\n\texpect(n).toBe(1);\n});\n");
	const green = hook('stop', { stopHookActive: true });
	check('2 fixing only the untracked file re-verifies and allows silently', green.out === '', `${green.secs}s${green.out ? `; output: ${green.out.slice(0, 300)}` : ''}`);
	const head = git(wt, 'rev-parse', 'HEAD');
	check('  auto-commit landed and contains the file', head !== base && git(wt, 'show', '--name-only', '--format=', 'HEAD').split('\n').includes(rel), head.slice(0, 7));
	check('  tree clean afterwards', git(wt, 'status', '--porcelain') === '');
} finally {
	if (keep) console.log(`kept ${wt}`);
	else if (existsSync(wt)) git(src, 'worktree', 'remove', '--force', wt);
}
const failed = results.filter((ok) => !ok).length;
console.log(failed ? `stop-gate probe: ${failed} FAILED` : `stop-gate probe: all ${results.length} checks PASS`);
process.exit(failed ? 1 : 0);
