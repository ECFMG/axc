import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
	agentIdForRecord,
	agentIdFromSession,
	checkFlag,
	clearSession,
	decidePath,
	decideRead,
	decideShell,
	ensureStartupSession,
	loadSession,
	noteActiveAgent,
	policyFromConfig,
	recordSession,
	sessionAllows,
	sessionAllowsRead,
} from './index.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');

const open = policyFromConfig({
	agentAccess: {
		'packages/cellix/**': false,
		'packages/axc/**': true,
		'packages/axc-verification/**': true,
		'package.json': true,
		'pnpm-lock.yaml': true,
		'pnpm-workspace.yaml': true,
		'.cursor/**': false,
		'.snyk': true,
		'apps/api/src/**': true,
		'apps/docs/**': true,
		'apps/**': false,
	},
});

describe('guardrails', () => {
	it('allows a true entry and rejects a path with no entry', () => {
		expect(decidePath(path.join(repoRoot, 'packages/axc/rest/src/index.ts'), repoRoot, open).ok).toBe(true);
		expect(decidePath(path.join(repoRoot, 'pnpm-workspace.yaml'), repoRoot, open).ok).toBe(true);
		const denied = decidePath(path.join(repoRoot, 'AGENTS.md'), repoRoot, open);
		expect(denied.ok).toBe(false);
		expect(denied.message).toContain('not writable');
	});

	it('rejects a shell assignment of the agent id', () => {
		const assigned = decideShell('export CELLIX_AGENT_ID=task-a; pnpm --filter @cellix/generator generate -- --context course', repoRoot, open);
		expect(assigned.ok).toBe(false);
		expect(assigned.message).toContain('sessionStart sets CELLIX_AGENT_ID');
		expect(decideShell('echo CELLIX_AGENT_ID=$CELLIX_AGENT_ID', repoRoot, open).ok).toBe(true);
	});

	it('keeps an existing agent id and otherwise uses the conversation', () => {
		expect(agentIdFromSession({ conversation_id: 'conv-1' }, { CELLIX_AGENT_ID: 'task-a' })).toBe('task-a');
		expect(agentIdFromSession({ conversation_id: '550e8400-e29b-41d4-a716-446655440000' }, {})).toBe('550e8400-e29b-41d4-a716-446655440000');
		expect(agentIdFromSession({}, {})).toMatch(/^agent/);
	});

	it('records against the active session when the shell has no id', async () => {
		const root = await mkdtemp(path.join(tmpdir(), 'cellix-active-'));
		try {
			ensureStartupSession(root, 'task-a');
			expect(agentIdForRecord(root, {})).toBe('task-a');
			ensureStartupSession(root, 'task-b');
			expect(() => agentIdForRecord(root, {})).toThrow(/shell has no agent id/);
			noteActiveAgent(root, 'task-a');
			expect(agentIdForRecord(root, {})).toBe('task-a');
			expect(agentIdForRecord(root, { CELLIX_AGENT_ID: 'task-b' })).toBe('task-b');
			clearSession(root, 'task-a');
			expect(agentIdForRecord(root, {})).toBe('task-b');
		} finally {
			await rm(root, { recursive: true, force: true });
		}
	});

	it('treats a directory listing as a read, including one that hides a missing path', () => {
		expect(decidePath(path.join(repoRoot, 'packages/axc'), repoRoot, open).ok).toBe(true);
		expect(decideShell('ls packages/axc 2>/dev/null', repoRoot, open).ok).toBe(true);
		expect(decideShell('rm packages/axc/rest/src/index.ts 2>/dev/null', repoRoot, open).ok).toBe(true);
	});

	it('rejects a write command that does not name a file', () => {
		expect(decideShell('node -e "console.log(1)"', repoRoot, open).ok).toBe(false);
		expect(decideShell('pnpm exec node -e "console.log(1)"', repoRoot, open).ok).toBe(false);
		expect(decideShell('pnpm test 2>&1', repoRoot, open).ok).toBe(true);
	});

	it('allows the lockfile and the workspace file when their entries are true', () => {
		expect(decideShell('touch pnpm-lock.yaml', repoRoot, open).ok).toBe(true);
		expect(decideShell('touch pnpm-workspace.yaml', repoRoot, open).ok).toBe(true);
	});

	it('treats git restore as a write and leaves git status alone', () => {
		expect(decideShell('git status --short', repoRoot, open).ok).toBe(true);
		expect(decideShell('git diff', repoRoot, open).ok).toBe(true);
		expect(decideShell('git restore --source=HEAD --worktree -- packages/axc/domain/package.json', repoRoot, open).ok).toBe(true);
		const restored = decideShell('git restore --source=HEAD --worktree -- .cursor/hooks/cellix-write-allow.mjs', repoRoot, open);
		expect(restored.ok).toBe(false);
		expect(restored.message).toContain('locked');
	});

	it('locks a false entry even when a broader pattern could match', () => {
		expect(decidePath(path.join(repoRoot, 'packages/cellix/generator/src/generate.ts'), repoRoot, open).ok).toBe(false);
		expect(decidePath(path.join(repoRoot, 'apps/docs/docs/intro.md'), repoRoot, open).ok).toBe(true);
		expect(decidePath(path.join(repoRoot, 'apps/api/src/index.ts'), repoRoot, open).ok).toBe(true);
		expect(decidePath(path.join(repoRoot, 'apps/api/scripts/zip-deploy.mjs'), repoRoot, open).ok).toBe(false);
		expect(decidePath(path.join(repoRoot, '.cursor/hooks/cellix-write-allow.mjs'), repoRoot, open).ok).toBe(false);
		expect(decideShell('touch package.json', repoRoot, open).ok).toBe(true);
		expect(decideShell('touch AGENTS.md', repoRoot, open).ok).toBe(false);
	});

	it('narrows one agent without unlocking a locked path or closing an exact true path', async () => {
		const root = await mkdtemp(path.join(tmpdir(), 'cellix-session-'));
		try {
			recordSession(root, 'task-a', ['packages/axc/domain/src/domain/contexts/course/']);
			recordSession(root, 'task-a', ['packages/axc/rest/src/course-query.ts']);
			const session = loadSession(root, 'task-a');
			const narrowed = policyFromConfig({ agentAccess: open.agentAccess }, session);
			const repairOnly = { agentId: 'task-a', files: ['packages/axc/rest/src/course-query.ts'] };
			expect(sessionAllows('packages/axc/domain/src/domain/contexts/course/course.aggregate.ts', session)).toBe(true);
			expect(sessionAllows('packages/axc/rest/src/course-query.ts', session)).toBe(true);
			expect(sessionAllows('.snyk', repairOnly)).toBe(false);
			expect(sessionAllows('pnpm-workspace.yaml', repairOnly)).toBe(false);
			expect(sessionAllows('apps/docs/docs/intro.md', session)).toBe(false);
			expect(decidePath(path.join(repoRoot, 'packages/axc/domain/src/domain/contexts/course/course.aggregate.ts'), repoRoot, narrowed).ok).toBe(true);
			expect(decidePath(path.join(repoRoot, '.snyk'), repoRoot, narrowed).ok).toBe(true);
			expect(decidePath(path.join(repoRoot, 'pnpm-workspace.yaml'), repoRoot, narrowed).ok).toBe(true);
			expect(decidePath(path.join(repoRoot, 'apps/docs/docs/intro.md'), repoRoot, narrowed).ok).toBe(false);
			expect(decidePath(path.join(repoRoot, 'packages/cellix/generator/src/generate.ts'), repoRoot, narrowed).ok).toBe(false);
			expect(loadSession(root, 'task-b')).toBeNull();
		} finally {
			await rm(root, { recursive: true, force: true });
		}
	});

	it('keeps an empty session closed and rejects a sibling prefix', async () => {
		const root = await mkdtemp(path.join(tmpdir(), 'cellix-session-'));
		try {
			const directory = path.join(root, '.cellix', 'sessions');
			await mkdir(directory, { recursive: true });
			await writeFile(path.join(directory, 'task-a.json'), `${JSON.stringify({ agentId: 'task-a', files: [] })}\n`);
			const session = loadSession(root, 'task-a');
			expect(sessionAllows('packages/axc/rest/src/index.ts', session)).toBe(false);
			expect(sessionAllows('.snyk', session)).toBe(false);
			expect(decidePath(path.join(repoRoot, '.snyk'), repoRoot, policyFromConfig({ agentAccess: open.agentAccess }, session)).ok).toBe(true);
			const course = { agentId: 'task-a', files: ['packages/axc/domain/src/domain/contexts/course/'] };
			expect(sessionAllows('packages/axc/domain/src/domain/contexts/course-catalog/course.aggregate.ts', course)).toBe(false);
			expect(decidePath(path.join(repoRoot, 'packages/axc/domain/src/domain/contexts/course/../passport.ts'), repoRoot, policyFromConfig({ agentAccess: open.agentAccess }, course)).ok).toBe(false);
			expect(decidePath(path.join(repoRoot, '.cellix/verify.json'), repoRoot, open).ok).toBe(false);
			expect(decidePath(path.join(repoRoot, '.cellix/verify.json'), repoRoot, policyFromConfig({ agentAccess: { '**': true } })).ok).toBe(false);
			expect(decideShell('touch .cellix/verify.json', repoRoot, open).ok).toBe(false);
			await writeFile(path.join(directory, 'task-a.json'), '{');
			expect(() => loadSession(root, 'task-a')).toThrow('not valid JSON');
		} finally {
			await rm(root, { recursive: true, force: true });
		}
	});

	it('enforces the session inside the write hook and leaves the other agent open', async () => {
		const root = await mkdtemp(path.join(tmpdir(), 'cellix-hook-'));
		try {
			await writeFile(path.join(root, 'ocom-write.config.json'), `${JSON.stringify({ agentAccess: { 'packages/axc/**': true, 'packages/cellix/**': false, '.snyk': true } })}\n`);
			recordSession(root, 'task-a', ['packages/axc/rest/src/']);
			const hook = path.join(repoRoot, '.cursor/hooks/cellix-write-allow.mjs');
			const run = (agentId: string, file: string) => {
				const result = spawnSync(process.execPath, [hook], {
					input: JSON.stringify({ cwd: root, tool_name: 'Write', tool_input: { path: file } }),
					encoding: 'utf8',
					env: { ...process.env, CELLIX_AGENT_ID: agentId },
				});
				return JSON.parse(result.stdout) as { permission: string };
			};
			expect(run('task-a', 'packages/axc/rest/src/index.ts').permission).toBe('allow');
			expect(run('task-a', 'packages/axc/domain/src/index.ts').permission).toBe('deny');
			expect(run('task-a', '.snyk').permission).toBe('allow');
			expect(run('task-b', 'packages/axc/domain/src/index.ts').permission).toBe('allow');
			expect(run('task-a', 'packages/cellix/generator/src/generate.ts').permission).toBe('deny');
		} finally {
			await rm(root, { recursive: true, force: true });
		}
	});

	it('binds the verify flag to the working tree', async () => {
		const root = await mkdtemp(path.join(tmpdir(), 'cellix-flag-'));
		try {
			const git = (args: string[]) => {
				const result = spawnSync('git', args, {
					cwd: root,
					encoding: 'utf8',
					env: { ...process.env, GIT_AUTHOR_NAME: 'Test', GIT_AUTHOR_EMAIL: 'test@example.com', GIT_COMMITTER_NAME: 'Test', GIT_COMMITTER_EMAIL: 'test@example.com' },
				});
				expect(result.status, result.stderr).toBe(0);
			};
			git(['init']);
			await writeFile(path.join(root, 'readme.md'), 'one\n');
			git(['add', 'readme.md']);
			git(['commit', '-m', 'start']);
			const stamp = spawnSync(process.execPath, [path.join(repoRoot, '.cursor/hooks/cellix-stamp-verify.mjs')], {
				cwd: root,
				encoding: 'utf8',
				env: { ...process.env, npm_lifecycle_event: 'verify' },
			});
			expect(stamp.status, stamp.stderr).toBe(0);
			expect(stamp.stdout).toContain('CELLIX_VERIFY=pass');
			expect(checkFlag(root)).toBe(true);
			await writeFile(path.join(root, 'readme.md'), 'two\n');
			expect(checkFlag(root)).toBe(false);
			const forged = JSON.parse(await readFile(path.join(root, '.cellix/verify.json'), 'utf8')) as { head: string };
			expect(forged.head).toMatch(/^[0-9a-f]{40}$/);
		} finally {
			await rm(root, { recursive: true, force: true });
		}
	});

	it('sends an agent back until the verify flag matches, then removes that session', async () => {
		const root = await mkdtemp(path.join(tmpdir(), 'cellix-stop-'));
		const stop = path.join(repoRoot, '.cursor/hooks/cellix-verify-stop.mjs');
		const end = path.join(repoRoot, '.cursor/hooks/cellix-session-end.mjs');
		const run = (script: string, agentId: string, payload: Record<string, unknown>) => {
			const result = spawnSync(process.execPath, [script], {
				input: JSON.stringify({ workspace_roots: [root], ...payload }),
				encoding: 'utf8',
				env: { ...process.env, CELLIX_AGENT_ID: agentId, CURSOR_PROJECT_DIR: root },
			});
			return JSON.parse(result.stdout) as { followup_message?: string };
		};
		try {
			expect(run(stop, '', { status: 'completed' })).toEqual({});
			expect(run(stop, 'task-a', { status: 'completed' }).followup_message).toContain('pnpm run verify');
			expect(run(stop, 'task-a', { status: 'aborted' })).toEqual({});
			recordSession(root, 'task-a', ['packages/axc/rest/src/']);
			run(end, 'task-a', { hook_event_name: 'sessionEnd' });
			expect(loadSession(root, 'task-a')?.agentId).toBe('task-a');
			const git = (args: string[]) => {
				const result = spawnSync('git', args, {
					cwd: root,
					encoding: 'utf8',
					env: { ...process.env, GIT_AUTHOR_NAME: 'Test', GIT_AUTHOR_EMAIL: 'test@example.com', GIT_COMMITTER_NAME: 'Test', GIT_COMMITTER_EMAIL: 'test@example.com' },
				});
				expect(result.status, result.stderr).toBe(0);
			};
			git(['init']);
			await writeFile(path.join(root, 'readme.md'), 'one\n');
			git(['add', 'readme.md']);
			git(['commit', '-m', 'start']);
			const stamp = spawnSync(process.execPath, [path.join(repoRoot, '.cursor/hooks/cellix-stamp-verify.mjs')], {
				cwd: root,
				encoding: 'utf8',
				env: { ...process.env, npm_lifecycle_event: 'verify' },
			});
			expect(stamp.status, stamp.stderr).toBe(0);
			run(end, 'task-a', { hook_event_name: 'sessionEnd' });
			expect(loadSession(root, 'task-a')).toBeNull();
			recordSession(root, 'task-a', ['packages/axc/rest/src/']);
			expect(run(stop, 'task-a', { status: 'completed' })).toEqual({});
			expect(loadSession(root, 'task-a')).toBeNull();
			expect(checkFlag(root)).toBe(true);
			recordSession(root, 'task-a', ['packages/axc/rest/src/']);
			recordSession(root, 'task-b', ['packages/axc/domain/src/']);
			clearSession(root, 'task-b');
			expect(loadSession(root, 'task-a')?.agentId).toBe('task-a');
			expect(loadSession(root, 'task-b')).toBeNull();
		} finally {
			await rm(root, { recursive: true, force: true });
		}
	});

	it('narrows read and write separately', async () => {
		const root = await mkdtemp(path.join(tmpdir(), 'cellix-session-'));
		try {
			recordSession(root, 'task-a', { write: ['packages/axc/rest/src/index.ts'], read: ['packages/axc/domain/src/'] });
			const session = loadSession(root, 'task-a');
			const policy = policyFromConfig(
				{
					read: { 'packages/cellix/**': false, '**': true },
					write: { 'packages/axc/**': true, 'packages/cellix/**': false },
				},
				session,
			);
			const domain = 'packages/axc/domain/src/domain/contexts/course/course.aggregate.ts';
			expect(sessionAllows('packages/axc/rest/src/index.ts', session)).toBe(true);
			expect(sessionAllows(domain, session)).toBe(false);
			expect(sessionAllowsRead(domain, session)).toBe(true);
			expect(sessionAllowsRead('packages/axc/rest/src/index.ts', session)).toBe(false);
			expect(decidePath(path.join(repoRoot, 'packages/axc/rest/src/index.ts'), repoRoot, policy).ok).toBe(true);
			expect(decidePath(path.join(repoRoot, domain), repoRoot, policy).ok).toBe(false);
			expect(decideRead(path.join(repoRoot, domain), repoRoot, policy).ok).toBe(true);
			expect(decideRead(path.join(repoRoot, 'packages/axc/rest/src/index.ts'), repoRoot, policy).ok).toBe(false);
			expect(decideRead(path.join(repoRoot, 'packages/cellix/generator/src/generate.ts'), repoRoot, policy).ok).toBe(false);
			expect(decidePath(path.join(repoRoot, 'packages/cellix/generator/src/generate.ts'), repoRoot, policy).ok).toBe(false);
			const writeOnly = { agentId: 'task-a', files: ['packages/axc/rest/src/index.ts'] };
			expect(sessionAllowsRead(domain, writeOnly)).toBe(true);
		} finally {
			await rm(root, { recursive: true, force: true });
		}
	});

	it('opens the product tree at startup', async () => {
		const root = await mkdtemp(path.join(tmpdir(), 'cellix-session-'));
		try {
			const started = ensureStartupSession(root, 'task-a');
			expect(started?.files).toBeUndefined();
			expect(started?.read).toBeUndefined();
			expect(started?.write).toBeUndefined();
			expect(sessionAllows('packages/axc/rest/src/index.ts', started)).toBe(true);
			expect(sessionAllowsRead('packages/axc/rest/src/index.ts', started)).toBe(true);
			expect(sessionAllowsRead('AGENTS.md', started)).toBe(true);
			expect(ensureStartupSession(root, 'task-a')?.files).toBeUndefined();
			recordSession(root, 'task-a', ['packages/axc/rest/src/']);
			const after = loadSession(root, 'task-a');
			expect(sessionAllows('packages/axc/rest/src/index.ts', after)).toBe(true);
			expect(sessionAllowsRead('packages/axc/rest/src/index.ts', after)).toBe(true);
			expect(sessionAllowsRead('AGENTS.md', after)).toBe(true);
			const locked = policyFromConfig({ read: { '.cellix/**': false, '**': true }, write: {} }, after);
			expect(decideRead(path.join(root, '.cellix/sessions/task-a.json'), root, locked).ok).toBe(true);
			expect(decideRead(path.join(root, '.cellix/verify.json'), root, locked).ok).toBe(false);
		} finally {
			await rm(root, { recursive: true, force: true });
		}
	});
});
