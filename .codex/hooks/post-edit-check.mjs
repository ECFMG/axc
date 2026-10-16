// Codex PostToolUse hook: run Biome on the files a tool call just wrote,
// whether through apply_patch or the shell, and hand findings back to the
// agent while the file is still fresh.
import { existsSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { findRepositoryRoot, readHookInput, respond, run, stripAnsi } from './lib/hook-io.mjs';
import { toRepositoryPath, writeTargets } from './lib/tool-command.mjs';

const BIOME_FILE_EXTENSION_PATTERN = /\.(?:[cm]?[jt]sx?|jsonc?|css)$/;
const FINDINGS_TAIL_CHARACTERS = 4000;

export function listEditedFiles(toolInput, cwd, root) {
	const editedFiles = new Set();
	for (const target of writeTargets(toolInput)) {
		const repositoryPath = toRepositoryPath(target, cwd, root);
		if (repositoryPath !== undefined && BIOME_FILE_EXTENSION_PATTERN.test(repositoryPath) && existsSync(resolve(root, repositoryPath))) {
			editedFiles.add(repositoryPath);
		}
	}
	return [...editedFiles];
}

function main() {
	const input = readHookInput();
	const cwd = input.cwd ?? process.cwd();
	const root = findRepositoryRoot(cwd);
	if (root === undefined) {
		return;
	}

	const editedFiles = listEditedFiles(input.tool_input, cwd, root);
	if (editedFiles.length === 0) {
		return;
	}

	const result = run('pnpm', ['exec', 'biome', 'check', '--no-errors-on-unmatched', ...editedFiles], root);
	if (result.status === 0) {
		return;
	}

	const findings = stripAnsi(`${result.stdout ?? ''}\n${result.stderr ?? ''}`).trim();
	const additionalContext = [
		`Biome reported problems in files you just wrote (${editedFiles.join(', ')}).`,
		`Fix them now; \`pnpm exec biome check --write ${editedFiles.join(' ')}\` applies safe fixes.`,
		findings.slice(-FINDINGS_TAIL_CHARACTERS),
	].join('\n');
	respond({ hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext } });
}

if (process.argv[1] && import.meta.url.endsWith(basename(process.argv[1]))) {
	main();
}
