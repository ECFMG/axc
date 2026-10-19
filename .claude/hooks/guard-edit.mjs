import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { block, boundaryHint, readHookInput, repoRoot, toRepoPath, writeViolation } from './lib/harness.mjs';

// PreToolUse (Edit|Write|MultiEdit|NotebookEdit): enforces the write boundary and rejects
// edits that silence the quality gates instead of fixing the code.

const input = await readHookInput();
const toolInput = input.tool_input ?? {};
const filePath = toolInput.file_path ?? toolInput.notebook_path;
if (!filePath) {
	process.exit(0);
}

const relPath = toRepoPath(filePath, input.cwd);
const violation = writeViolation(relPath);
if (violation) {
	block(`Blocked: ${violation} ${boundaryHint}`);
}

const suppressions = [
	{ pattern: /@ts-(ignore|expect-error|nocheck)\b/g, label: 'TypeScript suppression comment' },
	{ pattern: /biome-ignore/g, label: 'biome-ignore comment' },
	{ pattern: /eslint-disable/g, label: 'eslint-disable comment' },
	{ pattern: /\b(it|test|describe|suite)\.(skip|only|todo)\b/g, label: 'skipped/focused test' },
	{ pattern: /\bx(it|describe|test)\(/g, label: 'skipped test' },
	{ pattern: /^\s*@(skip|ignore|wip|only)\b/gm, label: 'skipped Cucumber tag' },
];

if (relPath !== undefined && /\.(ts|tsx|js|jsx|mjs|cjs|feature)$/.test(relPath)) {
	const absolute = path.resolve(input.cwd ?? repoRoot, filePath);
	const existing = toolInput.content !== undefined && existsSync(absolute) ? readFileSync(absolute, 'utf8') : '';
	const edits = toolInput.edits ?? [{ old_string: toolInput.old_string ?? existing, new_string: toolInput.new_string ?? toolInput.content ?? '' }];
	const before = edits.map((e) => e.old_string ?? '').join('\n');
	const after = edits.map((e) => e.new_string ?? '').join('\n');
	for (const { pattern, label } of suppressions) {
		const added = (after.match(pattern) ?? []).length - (before.match(pattern) ?? []).length;
		if (added > 0) {
			block(`Blocked: this edit adds a ${label} to ${relPath}. Fix the underlying lint, type, or test failure instead of suppressing it. If suppression is truly unavoidable, stop and ask the user.`);
		}
	}
}
