// Run with: node --test .codex/hooks
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { shellWriteTargets, splitCommands, writeTargets } from './lib/tool-command.mjs';
import { listEditedFiles } from './post-edit-check.mjs';
import { evaluate } from './pre-tool-policy.mjs';

const hooksDir = dirname(fileURLToPath(import.meta.url));
const root = resolve(hooksDir, '../..');

const shell = (command) => ({ cwd: root, tool_input: { command } });
const patch = (header) => shell(`*** Begin Patch\n*** ${header}\n*** End Patch`);

describe('tool-command: shell write detection', () => {
	it('finds redirection targets including heredocs and appends', () => {
		assert.deepEqual(shellWriteTargets("cat > notes.md <<'EOF'\nhello\nEOF"), ['notes.md']);
		assert.deepEqual(shellWriteTargets('echo x >> packages/axc/domain/src/index.ts'), ['packages/axc/domain/src/index.ts']);
		assert.deepEqual(shellWriteTargets('pnpm run test > /dev/null 2>&1'), []);
	});

	it('finds writing utilities', () => {
		assert.deepEqual(shellWriteTargets('printf "x" | tee AGENTS.md'), ['AGENTS.md']);
		assert.deepEqual(shellWriteTargets("sed -i '' 's/a/b/' knip.json"), ['knip.json']);
		assert.deepEqual(shellWriteTargets('cp a.ts packages/cellix/x.ts'), ['a.ts', 'packages/cellix/x.ts']);
		assert.deepEqual(shellWriteTargets('rm -rf .husky'), ['.husky']);
	});

	it('looks inside bash -lc wrappers and splits chains', () => {
		assert.deepEqual(splitCommands('bash -lc "pnpm run lint && git commit -n -m x"'), ['pnpm run lint', 'git commit -n -m x']);
		assert.deepEqual(shellWriteTargets('bash -lc "cd packages && cat > plan.md <<EOF\nx\nEOF"'), ['plan.md']);
	});

	it('reads apply_patch headers', () => {
		assert.deepEqual(writeTargets({ command: '*** Begin Patch\n*** Add File: packages/axc/domain/src/a.ts\n+x\n*** Update File: AGENTS.md\n*** End Patch' }), ['packages/axc/domain/src/a.ts', 'AGENTS.md']);
	});
});

describe('pre-tool-policy', () => {
	it('allows ordinary work', () => {
		assert.deepEqual(evaluate(shell('pnpm run test --output-logs=errors-only'), root), []);
		assert.deepEqual(evaluate(shell('pnpm install --offline --frozen-lockfile'), root), []);
		assert.deepEqual(evaluate(shell('git commit -m "feat: courses endpoint"'), root), []);
		assert.deepEqual(evaluate(shell('git checkout -- packages/axc/rest/src/index.ts'), root), []);
		assert.deepEqual(evaluate(patch('Add File: packages/axc/domain/src/domain/contexts/training/course/course.aggregate.ts'), root), []);
		assert.deepEqual(evaluate(patch('Add File: docs/api/courses.md'), root), []);
		assert.deepEqual(evaluate(patch('Add File: docs/adr/0003-enrollment-storage.md'), root), []);
	});

	it('denies harness and dependency edits through apply_patch', () => {
		assert.match(evaluate(patch('Update File: AGENTS.md'), root).join(), /harness configuration/);
		assert.match(evaluate(patch('Update File: pnpm-lock.yaml'), root).join(), /pnpm install/);
		assert.match(evaluate(patch('Add File: .codex/hooks/x.mjs'), root).join(), /harness files/);
		assert.match(evaluate(patch('Update File: packages/cellix/domain-seedwork/src/index.ts'), root).join(), /vendored/);
		assert.match(evaluate(patch('Update File: knip.json'), root).join(), /tool configuration/);
	});

	it('denies the same edits through the shell', () => {
		assert.match(evaluate(shell("cat > AGENTS.md <<'EOF'\nx\nEOF"), root).join(), /harness configuration/);
		assert.match(evaluate(shell('echo "" | tee .husky/pre-commit'), root).join(), /harness files/);
		assert.match(evaluate(shell("sed -i '' 's/x/y/' pnpm-workspace.yaml"), root).join(), /catalog/);
		assert.match(evaluate({ cwd: join(root, 'packages/axc'), tool_input: { command: 'rm -f ../../biome.json' } }, root).join(), /tool configuration/);
	});

	it('denies dependency changes and hook bypasses', () => {
		assert.match(evaluate(shell('pnpm add zod'), root).join(), /dependencies are fixed/);
		assert.match(evaluate(shell('pnpm install lodash'), root).join(), /dependencies are fixed/);
		assert.match(evaluate(shell('pnpm -w update hono'), root).join(), /dependencies are fixed/);
		assert.match(evaluate(shell('git commit --no-verify -m x'), root).join(), /pre-commit/);
		assert.match(evaluate(shell('git commit -n -m x'), root).join(), /pre-commit/);
		assert.match(evaluate(shell('pnpm run lint && git commit -nm x'), root).join(), /pre-commit/);
		assert.match(evaluate(shell('git push origin HEAD'), root).join(), /task branch/);
	});

	it('denies planning notes outside docs/', () => {
		assert.match(evaluate(patch('Add File: PLAN.md'), root).join(), /plans and notes/);
		assert.match(evaluate(patch('Add File: packages/axc/rest/NOTES.md'), root).join(), /plans and notes/);
		assert.match(evaluate(shell("cat > requirements-map.md <<'EOF'\nx\nEOF"), root).join(), /plans and notes/);
		assert.deepEqual(evaluate(patch('Add File: docs/plan.md'), root), []);
	});

	it('ignores paths outside the repository', () => {
		assert.deepEqual(evaluate(shell('cat > /tmp/AGENTS.md <<EOF\nx\nEOF'), root), []);
	});

	it('runs end to end over stdin and emits a deny decision', () => {
		const result = spawnSync(process.execPath, [join(hooksDir, 'pre-tool-policy.mjs')], { input: JSON.stringify(shell('pnpm add zod')), encoding: 'utf8' });
		assert.equal(result.status, 0);
		const output = JSON.parse(result.stdout);
		assert.equal(output.hookSpecificOutput.permissionDecision, 'deny');
		const ok = spawnSync(process.execPath, [join(hooksDir, 'pre-tool-policy.mjs')], { input: JSON.stringify(shell('pnpm run test')), encoding: 'utf8' });
		assert.equal(ok.stdout, '');
	});
});

describe('post-edit-check', () => {
	it('lists existing biome-checkable files written by patch or shell', () => {
		const directory = mkdtempSync(join(tmpdir(), 'post-edit-'));
		try {
			writeFileSync(join(directory, 'a.ts'), 'export const a = 1;\n');
			writeFileSync(join(directory, 'b.md'), '# b\n');
			assert.deepEqual(listEditedFiles({ command: `*** Begin Patch\n*** Update File: a.ts\n*** Add File: b.md\n*** Add File: missing.ts\n*** End Patch` }, directory, directory), ['a.ts']);
			assert.deepEqual(listEditedFiles({ command: `cat > a.ts <<'EOF'\nx\nEOF` }, directory, directory), ['a.ts']);
			assert.deepEqual(listEditedFiles({ command: 'pnpm run test' }, directory, directory), []);
		} finally {
			rmSync(directory, { recursive: true, force: true });
		}
	});
});
