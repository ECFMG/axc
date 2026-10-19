import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { block, readHookInput, repoRoot, toRepoPath } from './lib/harness.mjs';

// PostToolUse (Edit|Write|MultiEdit): formats the edited file with Biome and applies safe fixes.
// Silent on success; reports only the lint errors that remain.

const input = await readHookInput();
const filePath = input.tool_input?.file_path;
const relPath = filePath ? toRepoPath(filePath, input.cwd) : undefined;
if (relPath === undefined || !/\.(ts|tsx|js|jsx|mjs|cjs|json|jsonc)$/.test(relPath) || /(^|\/)(dist|build|target|deploy|node_modules)\//.test(relPath)) {
	process.exit(0);
}

const biome = path.join(repoRoot, 'node_modules', '.bin', 'biome');
const result = spawnSync(biome, ['check', '--write', '--no-errors-on-unmatched', '--colors=off', '--max-diagnostics=10', relPath], { cwd: repoRoot, encoding: 'utf8' });
if (result.status !== 0) {
	const output = `${result.stdout}${result.stderr}`.trim().split('\n').slice(0, 60).join('\n');
	block(`Biome still reports problems in ${relPath} after auto-fix (the file may have been reformatted, re-read it before editing):\n${output}`);
}
