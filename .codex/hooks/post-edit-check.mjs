// Codex PostToolUse hook for apply_patch edits: run Biome on the files the
// patch touched and give any findings back to the agent as extra context, so
// lint and format problems are fixed while the file is still fresh.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { isAbsolute, relative, resolve } from 'node:path';

const PATCH_FILE_HEADER_PATTERN = /^\*\*\* (?:Add File|Update File|Move to): (.+)$/gm;
const BIOME_FILE_EXTENSION_PATTERN = /\.(?:[cm]?[jt]sx?|jsonc?|css)$/;
const ANSI_ESCAPE_PATTERN = /\u001b\[[0-9;]*[A-Za-z]/g;
const FINDINGS_TAIL_CHARACTERS = 4000;

function readHookInput() {
	const raw = readFileSync(0, 'utf8');
	if (raw.trim() === '') {
		return {};
	}
	return JSON.parse(raw);
}

function run(command, args, cwd) {
	return spawnSync(command, args, { cwd, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, env: { ...process.env, FORCE_COLOR: '0' } });
}

function findRepositoryRoot(cwd) {
	const result = run('git', ['rev-parse', '--show-toplevel'], cwd);
	if (result.status !== 0) {
		return undefined;
	}
	return result.stdout.trim();
}

function extractPatchText(toolInput) {
	if (typeof toolInput === 'string') {
		return toolInput;
	}
	if (toolInput !== undefined && toolInput !== null && typeof toolInput.command === 'string') {
		return toolInput.command;
	}
	return '';
}

function listEditedFiles(patchText, cwd, root) {
	const editedFiles = new Set();
	for (const match of patchText.matchAll(PATCH_FILE_HEADER_PATTERN)) {
		const patchPath = match[1].trim();
		const absolutePath = isAbsolute(patchPath) ? patchPath : resolve(cwd, patchPath);
		const insideRepository = !relative(root, absolutePath).startsWith('..');
		if (insideRepository && BIOME_FILE_EXTENSION_PATTERN.test(absolutePath) && existsSync(absolutePath)) {
			editedFiles.add(relative(root, absolutePath));
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

	const editedFiles = listEditedFiles(extractPatchText(input.tool_input), cwd, root);
	if (editedFiles.length === 0) {
		return;
	}

	const result = run('pnpm', ['exec', 'biome', 'check', '--no-errors-on-unmatched', ...editedFiles], root);
	if (result.status === 0) {
		return;
	}

	const findings = `${result.stdout ?? ''}\n${result.stderr ?? ''}`.replace(ANSI_ESCAPE_PATTERN, '').trim();
	const additionalContext = [
		`Biome reported problems in files you just edited (${editedFiles.join(', ')}).`,
		`Fix them now; \`pnpm exec biome check --write ${editedFiles.join(' ')}\` applies safe fixes.`,
		findings.slice(-FINDINGS_TAIL_CHARACTERS),
	].join('\n');
	process.stdout.write(`${JSON.stringify({ hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext } })}\n`);
}

main();
