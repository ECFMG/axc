// Dry Stop-hook probe (manual; slow — runs the real install + husky verify twice). Never run inside a SCORE run.
//   node scripts/stop-gate-probe.mjs [--keep]
// In a fresh detached /tmp worktree of HEAD: plant a type error in a NEW untracked test file → stop must block
// (Grok/Claude {"decision":"block","reason"}) with HEAD unchanged and the file still untracked; fix only that file's
// contents → stopHookActive re-stop must verify, allow silently and auto-commit a commit that contains the file.
// Case 1 also adds an async-without-await source file (block body: biome useAwait skips `async () => expr`); its
// auto-fix line must survive the failed first stop and appear in case 2's commit body.
// Then an auto-fixable-only change (useAwait + an exported type used only locally) must commit on the first stop;
// case 4 repeats it in a second fresh, never-built worktree (knip cannot load its config there until auto-fix builds).
// Git runs with GIT_* stripped and global/system config ignored; the worktree is removed afterwards unless --keep.
import { execFileSync, spawnSync } from 'node:child_process';
import { appendFileSync, existsSync, mkdtempSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
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
const wt2 = path.join(path.dirname(wt), 'wt-unbuilt');
const hook = (mode, input = {}, cwd = wt) => {
	const t = Date.now();
	const r = spawnSync(process.execPath, [path.join(cwd, 'scripts/stop-gate.mjs'), mode], { cwd, env, input: JSON.stringify({ sessionId: 'mog-probe', ...input }), encoding: 'utf8', maxBuffer: 64 << 20 });
	return { out: r.stdout.trim(), secs: ((Date.now() - t) / 1000).toFixed(1) };
};

git(src, 'worktree', 'add', '--detach', '-q', wt, 'HEAD');
try {
	// No `.husky/_` here (gitignored, so a fresh worktree lacks it): this also probes stop-gate's husky self-heal.
	const base = git(wt, 'rev-parse', 'HEAD');
	const asyncRel = 'packages/axc/application-services/src/zz-stop-probe-async.ts';
	const indexRel = 'packages/axc/application-services/src/index.ts';
	hook('start');
	writeFileSync(path.join(wt, asyncRel), 'export const zzProbeAsync = async () => {\n\treturn 1;\n};\n');
	appendFileSync(path.join(wt, indexRel), "export { zzProbeAsync } from './zz-stop-probe-async.ts';\n");
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
	const fixLogFile = path.join(git(wt, 'rev-parse', '--absolute-git-dir'), 'stop-gate', 'auto-fix-log.json');
	const kept = existsSync(fixLogFile) ? readFileSync(fixLogFile, 'utf8') : '';
	check('  auto-fix log kept through the block', kept.includes('useAwait') && kept.includes('zz-stop-probe-async.ts'), kept.slice(0, 200));

	writeFileSync(file, "import { expect, it } from 'vitest';\n\nit('stop probe', () => {\n\tconst n: number = 1;\n\texpect(n).toBe(1);\n});\n");
	const green = hook('stop', { stopHookActive: true });
	check('2 fixing only the untracked file re-verifies and allows silently', green.out === '', `${green.secs}s${green.out ? `; output: ${green.out.slice(0, 300)}` : ''}`);
	const head = git(wt, 'rev-parse', 'HEAD');
	check('  auto-commit landed and contains the file', head !== base && git(wt, 'show', '--name-only', '--format=', 'HEAD').split('\n').includes(rel), head.slice(0, 7));
	check('  tree clean afterwards', git(wt, 'status', '--porcelain') === '');
	const body2 = git(wt, 'log', '-1', '--format=%b');
	check(
		'  commit body lists the auto-fix from the failed stop; log cleared',
		/Auto-fix \(Stop hook, before verify\):/.test(body2) && /- useAwait \(drop async\):.*zz-stop-probe-async\.ts/.test(body2) && !existsSync(fixLogFile),
		body2
			.split('\n')
			.filter((l) => l.startsWith('- '))
			.join(' | '),
	);
	check('  self-heal generated .husky/_ (no git config write)', existsSync(path.join(wt, '.husky/_/h')));

	// 3: auto-fixable only (useAwait + an exported type used just locally) → the first stop commits, 0 blocks.
	const fixRel = 'packages/axc/application-services/src/zz-stop-probe-fix.ts';
	hook('start', { sessionId: 'mog-probe-fix' });
	const head2 = git(wt, 'rev-parse', 'HEAD');
	writeFileSync(path.join(wt, fixRel), 'export interface ZzProbeResult {\n\tok: boolean;\n}\n\nexport const zzProbe = async () => {\n\tconst r: ZzProbeResult = { ok: true };\n\treturn r;\n};\n');
	appendFileSync(path.join(wt, indexRel), "export { zzProbe } from './zz-stop-probe-fix.ts';\n");
	const fix = hook('stop', { sessionId: 'mog-probe-fix' });
	const stateFile = path.join(git(wt, 'rev-parse', '--absolute-git-dir'), 'stop-gate', 'mog-probe-fix.json');
	const blocks = existsSync(stateFile) ? (JSON.parse(readFileSync(stateFile, 'utf8')).blocks ?? 0) : -1;
	check('3 useAwait + unused exported type: first stop allowed silently, 0 blocks', fix.out === '' && blocks === 0, `${fix.secs}s, blocks=${blocks}${fix.out ? `; output: ${fix.out.slice(0, 300)}` : ''}`);
	const body = git(wt, 'log', '-1', '--format=%b');
	const fixLog = body.split('\n').filter((l) => l.startsWith('- ') && /useAwait|knip|biome/.test(l));
	check(
		'  committed with the auto-fix log',
		git(wt, 'rev-parse', 'HEAD') !== head2 && /Auto-fix \(Stop hook, before verify\):/.test(body) && fixLog.some((l) => l.includes('useAwait')) && fixLog.some((l) => l.includes('knip')),
		fixLog.join(' | '),
	);
	const fixed = readFileSync(path.join(wt, fixRel), 'utf8');
	check('  fixes applied (no async, type no longer exported)', !/async/.test(fixed) && /^interface ZzProbeResult/m.test(fixed));

	// 4: same auto-fixable change in a fresh worktree that was never built → still 0 blocks; log shows build + knip.
	git(src, 'worktree', 'add', '--detach', '-q', wt2, 'HEAD');
	const unbuilt = !existsSync(path.join(wt2, 'packages/cellix/config-vitest/dist'));
	hook('start', { sessionId: 'mog-probe-unbuilt' }, wt2);
	const head4 = git(wt2, 'rev-parse', 'HEAD');
	writeFileSync(path.join(wt2, fixRel), readFileSync(path.join(wt, fixRel), 'utf8').replace('interface ZzProbeResult', 'export interface ZzProbeResult').replace('export const zzProbe = (', 'export const zzProbe = async ('));
	appendFileSync(path.join(wt2, indexRel), "export { zzProbe } from './zz-stop-probe-fix.ts';\n");
	const u = hook('stop', { sessionId: 'mog-probe-unbuilt' }, wt2);
	const state4 = path.join(git(wt2, 'rev-parse', '--absolute-git-dir'), 'stop-gate', 'mog-probe-unbuilt.json');
	const blocks4 = existsSync(state4) ? (JSON.parse(readFileSync(state4, 'utf8')).blocks ?? 0) : -1;
	check('4 unbuilt worktree, same change: first stop allowed silently, 0 blocks', unbuilt && u.out === '' && blocks4 === 0, `${u.secs}s, unbuilt=${unbuilt}, blocks=${blocks4}${u.out ? `; output: ${u.out.slice(0, 300)}` : ''}`);
	const body4 = git(wt2, 'log', '-1', '--format=%b');
	const log4 = body4.split('\n').filter((l) => l.startsWith('- '));
	check('  committed; log shows build + knip lines', git(wt2, 'rev-parse', 'HEAD') !== head4 && log4.some((l) => l.startsWith('- build')) && log4.some((l) => l.startsWith('- knip')), log4.join(' | '));
} finally {
	if (keep) console.log(`kept ${wt} ${wt2}`);
	else for (const w of [wt, wt2]) if (existsSync(w)) git(src, 'worktree', 'remove', '--force', w);
}
const failed = results.filter((ok) => !ok).length;
console.log(failed ? `stop-gate probe: ${failed} FAILED` : `stop-gate probe: all ${results.length} checks PASS`);
process.exit(failed ? 1 : 0);
