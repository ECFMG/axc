// Agent Stop gate (Grok Build / Claude / Codex / Cursor-compatible hook JSON; also a CLI for tools without a Stop hook).
// The agent only writes code; this hook installs, verifies and commits. Dependency-free; fails open.
//   start: record HEAD + tree fingerprint once per session (SessionStart; UserPromptSubmit fallback).
//   stop:  nothing changed since start → allow (pure Q&A). Changes → `pnpm install --frozen-lockfile`, auto-fix
//          (scripts/auto-fix.mjs: useAwait, knip exports/types, biome safe fixes; never tests), then `git add` the
//          write dirs + `git commit` with husky ON: its pre-commit runs the one full `pnpm run verify`.
//          Green (verify log ends with `verify ok`, tree clean) → silent allow. Red → block with a terse
//          one-line-per-problem report; nothing committed. The fingerprint covers untracked file contents. A plain
//          re-stop on the same tree state is allowed; a stopHookActive retry after a block always re-verifies.
//          At most 3 blocks per session; then allow with a one-line note.
//   run:   the same for tools without a Stop hook: report + exit 1 on failure, one `verify ok` line on success.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, realpathSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { autoFix, changedFiles, fixTargets } from './auto-fix.mjs';
import { report } from './check-summary.mjs';

const MAX_BLOCKS = 3;
const NVM = 'export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"; [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" >/dev/null 2>&1 && nvm use >/dev/null 2>&1; ';
const run = (cmd, args, env = process.env, input = undefined) => spawnSync(cmd, args, { encoding: 'utf8', env, input, maxBuffer: 64 << 20 });
const git = (...args) => {
	const r = run('git', args);
	if (r.status !== 0) throw new Error(`git ${args[0]} failed`);
	return r.stdout;
};

function readInput() {
	try {
		return JSON.parse(readFileSync(0, 'utf8') || '{}');
	} catch {
		return {};
	}
}

/** HEAD + tree fingerprint (status, tracked diff, untracked file contents). Read-only: hash-object without -w. */
export function snapshot() {
	const status = git('status', '--porcelain', '-uall');
	const untracked = git('ls-files', '-o', '--exclude-standard', '-z')
		.split('\0')
		.filter((f) => f && !f.endsWith('/') && !f.includes('\n')); // nested repos / odd names: status still covers the name
	const blobs = untracked.length ? (run('git', ['hash-object', '--stdin-paths'], process.env, untracked.join('\n')).stdout ?? '') : '';
	const fingerprint = createHash('sha1').update(status).update(git('diff', 'HEAD')).update(blobs).digest('hex');
	return { head: git('rev-parse', 'HEAD').trim(), dirty: status.trim() !== '', fingerprint };
}

const tmp = () => process.env.TMPDIR ?? tmpdir();
const verifyLog = (root) => path.join(tmp(), `axc-verify-${path.basename(root)}.log`);
const fresh = (file, since) => existsSync(file) && statSync(file).mtimeMs >= since;

/** True when the verify log was written since `since` and ends with husky's `verify ok` summary line. */
function verifyFinished(root, since) {
	const log = verifyLog(root);
	return fresh(log, since) && /^verify ok\b/.test(readFileSync(log, 'utf8').trimEnd().split('\n').at(-1) ?? '');
}

const CAP_NOTE = `Stop allowed — block cap (${MAX_BLOCKS}) reached; last failure left uncommitted.`;

/** What to do at Stop: 'allow' | 'commit' | { block } | { note } (allow with a one-line note). Pure, for tests. */
export function plan(start, now, { verified = true, active = false } = {}) {
	const retry = active && start.last === 'block'; // the agent is answering our block: re-verify whatever the fingerprint says
	if (start.blocks >= MAX_BLOCKS) return retry ? { note: CAP_NOTE } : 'allow';
	if (retry && now.dirty) return 'commit';
	if (start.lastBlocked === `${now.head}:${now.fingerprint}`) return 'allow';
	if (now.head === start.head && now.fingerprint === start.fingerprint) return 'allow';
	if (now.dirty) return 'commit';
	return verified ? 'allow' : { block: 'Committed, but no `verify ok` summary in the verify log: verify did not run or finish. Leave committing to the Stop hook.' };
}

/** path_deny patterns from the shared write boundary (protected files: never auto-fixed). */
function denyRules(root) {
	try {
		return JSON.parse(readFileSync(path.join(root, '.github/hooks/write-boundary.json'), 'utf8')).path_deny.map(([re]) => new RegExp(re));
	} catch {
		return [];
	}
}

/** Writable dirs from the shared write boundary (`dir/**` globs, minus dot-dirs); empty → whole tree. */
function writeDirs(root) {
	try {
		const rules = JSON.parse(readFileSync(path.join(root, '.github/hooks/write-boundary.json'), 'utf8'));
		return rules.allowed_write_globs
			.filter((g) => g.endsWith('/**') && !g.startsWith('.'))
			.map((g) => g.slice(0, -3))
			.filter((d) => existsSync(path.join(root, d)));
	} catch {
		return [];
	}
}

/** Generic message from `git diff --cached --name-status` lines: subject names the features and areas touched. */
export function commitMessage(nameStatus, pkgOf = (f) => f.split('/').slice(0, -1).at(-1) ?? f) {
	const files = nameStatus
		.split('\n')
		.filter(Boolean)
		.map((l) => {
			const [st, ...rest] = l.split('\t');
			return { st: st[0], file: rest.at(-1) };
		});
	const stem = (f) => path.basename(f).split('.')[0];
	const generic = new Set(['index', 'README', 'package', 'tsconfig', 'sidebars', 'questions', 'world']);
	const stems = (st) => [...new Set(files.filter((f) => st.includes(f.st)).map((f) => stem(f.file)))];
	const pick = (st) => stems(st).filter((n) => !generic.has(n));
	const added = pick('A');
	const names = (added.length ? added : pick('MRD').length ? pick('MRD') : stems('AMRD')).slice(0, 3);
	const areas = [...new Set(files.map((f) => pkgOf(f.file)))].slice(0, 5);
	const verb = added.length ? 'add' : files.every((f) => f.st === 'D') ? 'remove' : 'update';
	const subject = `${added.length ? 'feat' : 'chore'}: ${verb} ${names.join(', ') || `${files.length} file(s)`}${areas.length ? ` (${areas.join(', ')})` : ''}`;
	const list = files.slice(0, 20).map((f) => `${f.st} ${f.file}`);
	if (files.length > 20) list.push(`… +${files.length - 20} more`);
	return [subject, `Auto-committed by the Stop hook after a green husky verify.\n\n${list.join('\n')}`];
}

// husky 9.1 install, minus its `git config core.hooksPath` write: the hook list, stub and deprecation shim it generates.
const HUSKY_HOOKS = 'pre-commit pre-merge-commit prepare-commit-msg commit-msg post-commit applypatch-msg pre-applypatch post-applypatch pre-rebase post-rewrite post-checkout post-merge pre-push pre-auto-gc'.split(' ');
const HUSKY_SH = `echo "husky - DEPRECATED\n\nPlease remove the following two lines from $0:\n\n#!/usr/bin/env sh\n. \\"\\$(dirname -- \\"\\$0\\")/_/husky.sh\\"\n\nThey WILL FAIL in v10.0.0\n"`;

/** Repo uses husky (`.husky/pre-commit`): make sure `.husky/_` exists, generating it like husky's install would but
 * writing no git config (a fresh worktree has none: it is gitignored). Returns true when husky hooks are usable. */
export function ensureHuskyHooks(root) {
	if (!existsSync(path.join(root, '.husky/pre-commit'))) return false;
	const _ = (x = '') => path.join(root, '.husky/_', x);
	if (existsSync(_('h'))) return true;
	const runner = path.join(root, 'node_modules/husky/husky');
	if (!existsSync(runner)) return false;
	rmSync(_('husky.sh'), { force: true });
	mkdirSync(_(), { recursive: true });
	writeFileSync(_('.gitignore'), '*');
	copyFileSync(runner, _('h'));
	for (const h of HUSKY_HOOKS) writeFileSync(_(h), '#!/usr/bin/env sh\n. "$(dirname "$0")/h"', { mode: 0o755 });
	writeFileSync(_('husky.sh'), HUSKY_SH);
	return true;
}

const block = (lines) => `Stop blocked — nothing committed. Fix, then stop again (no verify/commit calls):\n${lines}`;

/** Env for the auto-commit: husky ON (its pre-commit IS the verify); SNYK_SKIP=1 keeps Snyk a developer-commit gate, off the Stop path. */
export function commitEnv(base = process.env) {
	const env = { ...base, SNYK_SKIP: '1' };
	delete env.HUSKY;
	return env;
}

/** install → add → commit (husky verify). Returns null on success, else the terse failure report. */
export function autoCommit(root) {
	const t0 = Date.now();
	const env = commitEnv();
	const out = path.join(tmp(), `axc-stop-${path.basename(root)}.log`);
	if (existsSync(path.join(root, 'pnpm-lock.yaml'))) {
		const i = run('sh', ['-c', `${NVM}pnpm install --frozen-lockfile`], { ...env, HUSKY: '0' }); // HUSKY=0: no hooksPath rewrite
		if (i.status !== 0) {
			writeFileSync(out, `${i.stdout}${i.stderr}`);
			return block(`pnpm install --frozen-lockfile failed (a package.json dependency change rewrites the lockfile; revert it):\n${report(out, root)}`);
		}
	}
	const dirs = writeDirs(root);
	const fixes = autoFix(root, fixTargets(changedFiles(root), { dirs, deny: denyRules(root) }), { prefix: NVM, env: { ...env, HUSKY: '0' } });
	git('add', '-A', '--', ...(dirs.length ? dirs : ['.']));
	const staged = git('diff', '--cached', '--name-status');
	if (!staged.trim()) return block(`changes outside the write dirs (${dirs.join(', ')}); revert them:\n${git('status', '--porcelain').trim().split('\n').slice(0, 10).join('\n')}`);
	const pkgOf = (f) => {
		for (let d = path.dirname(f); d !== '.' && d !== '/'; d = path.dirname(d)) if (existsSync(path.join(root, d, 'package.json'))) return path.basename(d);
		return f.split('/')[0];
	};
	const [subject, msg] = commitMessage(staged, pkgOf);
	const body = fixes.length ? `${msg}\n\nAuto-fix (Stop hook, before verify):\n${fixes.map((l) => `- ${l}`).join('\n')}` : msg;
	// Per-invocation hooksPath (not a config write), so the husky pre-commit runs even where core.hooksPath is unset.
	const hooks = ensureHuskyHooks(root) ? '-c core.hooksPath=.husky/_ ' : '';
	const c = run('sh', ['-c', `${NVM}git ${hooks}commit -q -m "$1" -m "$2"`, 'commit', subject, body], env);
	writeFileSync(out, `${c.stdout}${c.stderr}${fresh(verifyLog(root), t0) ? readFileSync(verifyLog(root), 'utf8') : ''}`);
	if (c.status !== 0) {
		run('git', ['reset', '-q']); // unstage only; the working tree stays as written
		return block(report(out, root));
	}
	if (!verifyFinished(root, t0)) return block('commit landed without a `verify ok` summary: husky verify did not run (core.hooksPath?).');
	const left = git('status', '--porcelain').trim();
	return left ? block(`committed, but changes outside the write dirs remain; revert them:\n${left.split('\n').slice(0, 10).join('\n')}`) : null;
}

function main() {
	const [mode] = process.argv.slice(2);
	const root = git('rev-parse', '--show-toplevel').trim();
	process.chdir(root);
	if (mode === 'run') {
		const reason = git('status', '--porcelain').trim() ? autoCommit(root) : null;
		if (reason) {
			console.log(reason);
			process.exit(1);
		}
		console.log(`${existsSync(verifyLog(root)) ? (readFileSync(verifyLog(root), 'utf8').trimEnd().split('\n').at(-1) ?? 'ok') : 'nothing to commit'} · ${git('rev-parse', '--short', 'HEAD').trim()}`);
		return;
	}
	const input = readInput();
	const id = String(input.sessionId ?? input.session_id ?? input.conversation_id ?? process.env.GROK_SESSION_ID ?? 'default').replace(/[^\w.-]/g, '_');
	const file = path.join(git('rev-parse', '--absolute-git-dir').trim(), 'stop-gate', `${id}.json`);
	if (mode === 'start') {
		if (existsSync(file)) return;
		mkdirSync(path.dirname(file), { recursive: true });
		writeFileSync(file, JSON.stringify({ ...snapshot(), at: Date.now(), blocks: 0 }));
		return;
	}
	if (mode !== 'stop' || !existsSync(file)) return;
	const start = JSON.parse(readFileSync(file, 'utf8'));
	const active = Boolean(input.stopHookActive ?? input.stop_hook_active);
	const step = plan(start, snapshot(), { verified: verifyFinished(root, start.at), active });
	if (typeof step === 'object' && step.note) {
		process.stdout.write(JSON.stringify({ systemMessage: step.note }));
		return;
	}
	const reason = step === 'commit' ? autoCommit(root) : typeof step === 'object' ? step.block : null;
	if (!reason) {
		if (start.last === 'block') writeFileSync(file, JSON.stringify({ ...start, last: 'allow' }));
		return;
	}
	const now = snapshot();
	writeFileSync(file, JSON.stringify({ ...start, blocks: start.blocks + 1, last: 'block', lastBlocked: `${now.head}:${now.fingerprint}` }));
	process.stdout.write(JSON.stringify({ decision: 'block', reason }));
}

// realpath + file URL: a symlinked (macOS /tmp, /var) or space-containing path must still run main, not no-op.
const isMain = () => Boolean(process.argv[1]) && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href;
if (isMain()) {
	try {
		main();
	} catch {
		// fail open
	}
}
