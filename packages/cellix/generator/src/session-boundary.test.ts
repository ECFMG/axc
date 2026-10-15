import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { pathsOutsideSession, porcelainPaths } from '../../../../.cursor/hooks/cellix-evidence.mjs';
import { decidePath, decideShell, policyFromConfig } from '../../../../.cursor/hooks/cellix-write-policy.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');

describe('task session boundary', () => {
	const policy = policyFromConfig({ agentAccess: { '**': true, 'packages/cellix/**': false } }, { context: 'course', entity: 'course', action: 'search', files: ['packages/axc/rest/src/index.ts'] });

	it('allows a file from the generator list and rejects the rest', () => {
		expect(decidePath(path.join(repoRoot, 'packages/axc/rest/src/index.ts'), repoRoot, policy).ok).toBe(true);
		const denied = decidePath(path.join(repoRoot, 'AGENTS.md'), repoRoot, policy);
		expect(denied.ok).toBe(false);
		expect(denied.message).toContain('pnpm --filter @cellix/generator generate');
	});

	it('rejects a write command that does not name a task file', () => {
		const decision = decideShell('node -e "console.log(1)"', repoRoot, policy);
		expect(decision.ok).toBe(false);
		expect(decision.message).toContain('pnpm run verify');
		expect(decideShell('pnpm exec node -e "console.log(1)"', repoRoot, policy).ok).toBe(false);
	});

	it('allows the lockfile only when the task lists it', () => {
		expect(decideShell('touch pnpm-lock.yaml', repoRoot, policy).ok).toBe(false);
		const listed = policyFromConfig({ agentAccess: { '**': true, 'packages/cellix/**': false } }, { context: 'course', entity: 'course', action: 'search', files: ['pnpm-lock.yaml'] });
		expect(decideShell('touch pnpm-lock.yaml', repoRoot, listed).ok).toBe(true);
	});

	it('treats git restore as a write and leaves git status alone', () => {
		expect(decideShell('git status --short', repoRoot, policy).ok).toBe(true);
		expect(decideShell('git diff', repoRoot, policy).ok).toBe(true);
		const restored = decideShell('git restore --source=HEAD --worktree -- packages/axc/domain/package.json', repoRoot, policy);
		expect(restored.ok).toBe(false);
		expect(restored.message).toContain('pnpm --filter @cellix/generator generate');
	});

	it('lists each untracked file so a helper beside the slice stays outside the task', () => {
		const changed = porcelainPaths('?? packages/axc/domain/src/domain/\n?? packages/axc/domain/src/domain/contexts/course/course/helper.ts\n M .gitignore\nR  old.ts -> packages/axc/rest/src/index.ts\n');
		expect(changed).toEqual(['packages/axc/domain/src/domain/', 'packages/axc/domain/src/domain/contexts/course/course/helper.ts', '.gitignore', 'packages/axc/rest/src/index.ts']);
		const session = {
			files: ['packages/axc/rest/src/index.ts'],
			baseline: ['.gitignore'],
		};
		expect(pathsOutsideSession(changed, session)).toEqual(['packages/axc/domain/src/domain/', 'packages/axc/domain/src/domain/contexts/course/course/helper.ts']);
	});

	it('locks the control plane when no session is open and still allows an axc package.json', () => {
		const open = policyFromConfig({ agentAccess: { 'packages/cellix/**': false, 'apps/api/src/index.ts': true, 'apps/**': false }, writable: ['packages/axc/**/package.json'] }, null);
		expect(decidePath(path.join(repoRoot, 'packages/cellix/generator/src/generate.ts'), repoRoot, open).ok).toBe(false);
		expect(decidePath(path.join(repoRoot, 'packages/axc/data-sources-mongoose-models/package.json'), repoRoot, open).ok).toBe(true);
	});

	it('rejects an unnamed write and still allows existing product files', () => {
		const open = policyFromConfig(
			{
				agentAccess: { 'packages/cellix/**': false, '.cursor/**': false, 'apps/api/src/**': true, 'apps/docs/**': true, 'apps/**': false },
				writable: ['packages/axc/**', 'packages/axc-verification/**', 'package.json', 'pnpm-lock.yaml'],
			},
			null,
		);
		expect(decideShell('touch AGENTS.md', repoRoot, open).ok).toBe(false);
		expect(decideShell('node -e "console.log(1)"', repoRoot, open).ok).toBe(false);
		expect(decideShell('pnpm test 2>&1', repoRoot, open).ok).toBe(true);
		expect(decideShell('touch package.json', repoRoot, open).ok).toBe(true);
		expect(decidePath(path.join(repoRoot, 'packages/axc/rest/src/index.ts'), repoRoot, open).ok).toBe(true);
		expect(decidePath(path.join(repoRoot, 'apps/docs/docs/intro.md'), repoRoot, open).ok).toBe(true);
		expect(decidePath(path.join(repoRoot, 'apps/api/scripts/zip-deploy.mjs'), repoRoot, open).ok).toBe(false);
		expect(decidePath(path.join(repoRoot, '.cursor/hooks/cellix-write-policy.mjs'), repoRoot, open).ok).toBe(false);
	});
});
