import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { decidePath, decideShell, policyFromConfig } from '../../../../.cursor/hooks/cellix-write-policy.mjs';

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
		'apps/api/src/**': true,
		'apps/docs/**': true,
		'apps/**': false,
	},
});

describe('agent access', () => {
	it('allows a true entry and rejects a path with no entry', () => {
		expect(decidePath(path.join(repoRoot, 'packages/axc/rest/src/index.ts'), repoRoot, open).ok).toBe(true);
		expect(decidePath(path.join(repoRoot, 'pnpm-workspace.yaml'), repoRoot, open).ok).toBe(true);
		const denied = decidePath(path.join(repoRoot, 'AGENTS.md'), repoRoot, open);
		expect(denied.ok).toBe(false);
		expect(denied.message).toContain('agentAccess');
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
		const restored = decideShell('git restore --source=HEAD --worktree -- .cursor/hooks/cellix-write-policy.mjs', repoRoot, open);
		expect(restored.ok).toBe(false);
		expect(restored.message).toContain('locked');
	});

	it('locks a false entry even when a broader pattern could match', () => {
		expect(decidePath(path.join(repoRoot, 'packages/cellix/generator/src/generate.ts'), repoRoot, open).ok).toBe(false);
		expect(decidePath(path.join(repoRoot, 'apps/docs/docs/intro.md'), repoRoot, open).ok).toBe(true);
		expect(decidePath(path.join(repoRoot, 'apps/api/src/index.ts'), repoRoot, open).ok).toBe(true);
		expect(decidePath(path.join(repoRoot, 'apps/api/scripts/zip-deploy.mjs'), repoRoot, open).ok).toBe(false);
		expect(decidePath(path.join(repoRoot, '.cursor/hooks/cellix-write-policy.mjs'), repoRoot, open).ok).toBe(false);
		expect(decideShell('touch package.json', repoRoot, open).ok).toBe(true);
		expect(decideShell('touch AGENTS.md', repoRoot, open).ok).toBe(false);
	});
});
