// Agent Stop gate (Grok Build / Codex / Claude hook JSON). Dependency-free; fails open.
//   start: record HEAD + tree fingerprint once per session (SessionStart; UserPromptSubmit fallback).
//   stop:  allow if nothing changed (pure Q&A) or the work is committed with a clean tree;
//          otherwise block with the failed-verify excerpt or a one-line reason.
//          Never blocks when stopHookActive is set, twice for the same tree state, or more than 3 times per session.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const MAX_BLOCKS = 3;
const git = (...args) => execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 64 << 20 });

function readInput() {
	try {
		return JSON.parse(readFileSync(0, 'utf8') || '{}');
	} catch {
		return {};
	}
}

function snapshot() {
	const status = git('status', '--porcelain', '-uall');
	const fingerprint = createHash('sha1').update(status).update(git('diff', 'HEAD')).digest('hex');
	return { head: git('rev-parse', 'HEAD').trim(), dirty: status.trim() !== '', fingerprint };
}

function verifyExcerpt(root, since) {
	const log = path.join(process.env.TMPDIR ?? tmpdir(), `axc-verify-${path.basename(root)}.log`);
	if (!existsSync(log) || statSync(log).mtimeMs < since || !/ELIFECYCLE|verify FAILED/.test(readFileSync(log, 'utf8'))) return '';
	try {
		execFileSync(process.execPath, [path.join(import.meta.dirname, 'verify-excerpt.mjs'), log], { encoding: 'utf8' });
		return '';
	} catch (error) {
		return String(error.stdout ?? '').trim();
	}
}

export function decide(start, now, { stopHookActive = false, excerpt = '' } = {}) {
	if (stopHookActive || start.blocks >= MAX_BLOCKS || start.lastBlocked === `${now.head}:${now.fingerprint}`) return null;
	if (now.head === start.head && now.fingerprint === start.fingerprint) return null;
	if (now.head === start.head) return excerpt || 'Edits are not committed: run the first check, then the commit chain (husky verify is the gate).';
	if (now.dirty && now.fingerprint !== start.fingerprint) return 'Committed, but the tree is dirty: commit or revert the leftover changes.';
	return null;
}

function main() {
	const [mode] = process.argv.slice(2);
	const input = readInput();
	const root = git('rev-parse', '--show-toplevel').trim();
	const id = String(input.sessionId ?? input.session_id ?? process.env.GROK_SESSION_ID ?? 'default').replace(/[^\w.-]/g, '_');
	const file = path.join(git('rev-parse', '--absolute-git-dir').trim(), 'stop-gate', `${id}.json`);
	if (mode === 'start') {
		if (existsSync(file)) return;
		mkdirSync(path.dirname(file), { recursive: true });
		writeFileSync(file, JSON.stringify({ ...snapshot(), at: Date.now(), blocks: 0 }));
		return;
	}
	if (mode !== 'stop' || !existsSync(file)) return;
	const start = JSON.parse(readFileSync(file, 'utf8'));
	const now = snapshot();
	const reason = decide(start, now, { stopHookActive: Boolean(input.stopHookActive ?? input.stop_hook_active), excerpt: verifyExcerpt(root, start.at) });
	if (!reason) return;
	writeFileSync(file, JSON.stringify({ ...start, blocks: start.blocks + 1, lastBlocked: `${now.head}:${now.fingerprint}` }));
	process.stdout.write(JSON.stringify({ decision: 'block', reason }));
}

if (import.meta.url === `file://${process.argv[1]}`) {
	try {
		main();
	} catch {
		// fail open
	}
}
