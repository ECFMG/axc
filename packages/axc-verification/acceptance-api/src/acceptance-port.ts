import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { getWorktreePortOffset } from '@cellix/local-dev';

const BASE_PORT = 7071;

function git(cwd: string, ...args: string[]): string | undefined {
	try {
		return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
	} catch {
		return undefined;
	}
}

/**
 * Worktree name for acceptance runs: `WORKTREE_NAME` (as `dev:worktree` sets it), else the
 * basename of a linked git worktree (husky/verify don't set the env). Main checkout → undefined.
 */
function resolveAcceptanceWorktreeName(cwd: string): string | undefined {
	if (process.env['WORKTREE_NAME']) return process.env['WORKTREE_NAME'];
	const gitDir = git(cwd, 'rev-parse', '--path-format=absolute', '--git-dir');
	const commonDir = git(cwd, 'rev-parse', '--path-format=absolute', '--git-common-dir');
	if (!gitDir || !commonDir || gitDir === commonDir) return undefined;
	const top = git(cwd, 'rev-parse', '--show-toplevel');
	return top ? path.basename(top) : undefined;
}

/** Functions host port for acceptance: 7071 in the main checkout, 7071 + Cellix worktree offset elsewhere. */
export function resolveAcceptancePort(cwd: string): number {
	return BASE_PORT + getWorktreePortOffset(resolveAcceptanceWorktreeName(cwd));
}
