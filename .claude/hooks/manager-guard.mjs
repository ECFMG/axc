// PreToolUse guard for the managerial agent (.agents/instructions/01-managerial-agent.md).
// Claude Code sets `agent_id` only on tool calls made inside a sub-agent, so calls without it come from the
// top-level (managerial) agent. Sub-agent calls pass through untouched.
// Escape hatch for maintenance sessions: start Claude Code with AXC_MANAGER_GUARD=off.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Dependency-free prelude: decide scope from the raw input before loading the shared lib, so a broken lib never blocks
// out-of-scope callers. Anything that goes wrong in scope exits 2, which blocks the tool call (exit 1 would not).
function block(message) {
	process.stderr.write(`Managerial agent guard: ${message} Blocking this call (fail closed).\n`);
	process.exit(2);
}

if (process.env.AXC_MANAGER_GUARD === 'off') process.exit(0);
let input;
try {
	input = JSON.parse(readFileSync(0, 'utf8'));
} catch (error) {
	block(`could not parse the hook input (${error.message}).`);
}
if (typeof input !== 'object' || input === null) block('the hook input is not a JSON object.');
if (input.agent_id) process.exit(0);
let lib;
try {
	lib = await import('./lib/guard-utils.mjs');
} catch (error) {
	block(`could not load lib/guard-utils.mjs (${error.message}).`);
}
const { checkGitReadOnly, checkInPlaceEditors, checkMiseReadOnly, FILE_WRITERS, INTERPRETERS, isTempPath, isVersionCheck, PNPM_READ_ONLY, redirectTargets, resolveTarget, runGuard, simpleCommands, stripQuotes, TOOLCHAIN, within } =
	lib;

const RULES = '.agents/instructions/01-managerial-agent.md';
const DELEGATE = 'Delegate this to a sub-agent with a [SUB-AGENT BRIEF].';

function check(tool, args) {
	if (tool === 'Write' || tool === 'Edit' || tool === 'NotebookEdit') {
		const target = args.file_path ?? args.notebook_path;
		return target && !isWritable(target) ? `the managerial agent may only write planning notes under .agents-work/ (tried ${target}).` : null;
	}
	if (tool === 'Bash') return checkShell(String(args.command ?? ''));
	return null;
}

function isWritable(path) {
	const full = resolveTarget(path, input.cwd || projectDir);
	return within(full, resolve(projectDir, '.agents-work')) || isTempPath(full);
}

function checkShell(command) {
	const bare = stripQuotes(command);
	for (const target of redirectTargets(bare)) {
		if (!isWritable(target)) return `shell redirection writes to ${target}.`;
	}
	for (const [name, args] of simpleCommands(bare)) {
		const reason = checkCommand(name, args);
		if (reason) return reason;
	}
	return null;
}

function checkCommand(name, args) {
	if (isVersionCheck(name, args)) return null;
	if (name === 'pnpm') {
		const sub = args.find((arg) => !arg.startsWith('-') || arg === '--version' || arg === '-v');
		return sub && PNPM_READ_ONLY.has(sub) ? null : `\`pnpm ${args.join(' ')}\` runs builds, tests, verification, or dependency changes.`;
	}
	if (TOOLCHAIN.has(name)) return `\`${name}\` runs the build, test, or verification toolchain.`;
	if (INTERPRETERS.has(name)) return `\`${name}\` can run arbitrary code or write files.`;
	if (FILE_WRITERS.has(name)) {
		const paths = args.filter((arg) => !arg.startsWith('-'));
		return name === 'mkdir' && paths.length && paths.every(isWritable) ? null : `\`${name}\` changes files.`;
	}
	const inPlace = checkInPlaceEditors(name, args);
	if (inPlace) return inPlace;
	if (name === 'git') return checkGitReadOnly(args);
	if (name === 'mise') return checkMiseReadOnly(args);
	return null;
}

const projectDir = process.env.CLAUDE_PROJECT_DIR || input.cwd;

runGuard(
	() => check(input.tool_name, input.tool_input ?? {}),
	(reason) => `Managerial agent guard: ${reason} ${DELEGATE} See ${RULES}.`,
);
