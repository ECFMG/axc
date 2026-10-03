// PreToolUse guard for the `unit-tester` sub-agent (.agents/instructions/02-unit-test-agent.md).
// Claude Code passes `agent_type` (the sub-agent's frontmatter `name`) on tool calls made inside a sub-agent, so this
// guard only acts when agent_type is `unit-tester`. Every other caller (main thread, manager, other sub-agents) passes
// through untouched; manager-guard.mjs handles the main thread.
// Escape hatch for maintenance sessions: start Claude Code with AXC_UNIT_TEST_GUARD=off.
//
// Paths are judged relative to the git toplevel of the target's nearest existing ancestor directory, so a unit tester
// working in a linked git worktree of this repository (which may live outside the project dir) gets the same rules as in
// the main checkout. A worktree only counts when it shares this repository's git common dir; any other repository is
// denied. When git is unavailable the project dir is used as the root.

import { existsSync, readFileSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve } from 'node:path';

// Dependency-free prelude: decide scope from the raw input before loading the shared lib, so a broken lib never blocks
// out-of-scope callers. Anything that goes wrong in scope exits 2, which blocks the tool call (exit 1 would not).
function block(message) {
	process.stderr.write(`Unit tester guard: ${message} Blocking this call (fail closed).\n`);
	process.exit(2);
}

if (process.env.AXC_UNIT_TEST_GUARD === 'off') process.exit(0);
let input;
try {
	input = JSON.parse(readFileSync(0, 'utf8'));
} catch (error) {
	block(`could not parse the hook input (${error.message}).`);
}
if (typeof input !== 'object' || input === null) block('the hook input is not a JSON object.');
if (input.agent_type !== 'unit-tester') process.exit(0);
let lib;
try {
	lib = await import('./lib/guard-utils.mjs');
} catch (error) {
	block(`could not load lib/guard-utils.mjs (${error.message}).`);
}
const {
	checkGitReadOnly,
	createRepoRoot,
	isNotesOrTempPath,
	isUnitTesterTestPath,
	checkInPlaceEditors,
	checkMiseReadOnly,
	FILE_WRITERS,
	INTERPRETERS,
	isVersionCheck,
	PNPM_READ_ONLY,
	redirectTargets,
	resolveExisting,
	runGuard,
	simpleCommands,
	stripQuotes,
	TOOLCHAIN,
} = lib;

const RULES = '.agents/instructions/02-unit-test-agent.md';
const ESCALATE = 'Do not work around this; report the needed change to the manager in your final report instead.';

const PNPM_SCRIPTS = new Set(['test', 'test:arch', 'test:acceptance', 'build', 'typecheck']);
const PNPM_FLAGS_WITH_VALUE = new Set(['--filter', '-F', '--filter-prod', '-C', '--dir', '--workspace-dir', '--reporter', '--loglevel', '--test-pattern', '--changed-files-ignore-pattern']);
const PNPM_BOOLEAN_FLAGS = new Set([
	'-r',
	'--recursive',
	'-w',
	'--workspace-root',
	'-s',
	'--silent',
	'--parallel',
	'--stream',
	'--no-bail',
	'--bail',
	'--if-present',
	'--aggregate-output',
	'--sequential',
	'--fail-if-no-match',
	'--color',
	'--no-color',
]);
const BIOME_SUBCOMMANDS = new Set(['check', 'lint', 'format', 'ci', 'explain', 'version']);
const BIOME_WRITE_FLAGS = /^--(write|fix|apply|apply-unsafe|unsafe|staged|changed)(=|$)/;

function check(tool, args) {
	if (tool === 'Write' || tool === 'Edit' || tool === 'NotebookEdit') {
		const target = args.file_path ?? args.notebook_path;
		return target ? checkWrite(target) : null;
	}
	if (tool === 'Bash') return checkShell(String(args.command ?? ''));
	return null;
}

// --- file writes -------------------------------------------------------------------------------------------------

function resolveWrite(path) {
	return resolveExisting(resolve(input.cwd || projectDir, path));
}

// Rationale notes (.agents-work/ of the project or of the worktree) and the system temp dir.
function isNotesOrTemp(path) {
	return isNotesOrTempPath(resolveWrite(path), projectDir, repoRoot);
}

// Null when the unit tester may write `path`, otherwise a reason.
function checkWrite(path) {
	const { full, existing } = resolveWrite(path);
	if (isNotesOrTemp(path)) return null;
	if (!existsSync(dirname(full))) return `the unit tester must not create new directories (${dirname(full)} does not exist; tried ${path}).`;
	const root = repoRoot(existing);
	if (!root) return `the unit tester may only write inside this repository or one of its git worktrees (tried ${path}).`;
	const rel = relative(root, full);
	if (rel.startsWith('..') || isAbsolute(rel)) return `the unit tester may only write inside this repository or one of its git worktrees (tried ${path}).`;
	if (isUnitTesterTestPath(rel)) return null;
	return (
		`the unit tester may only write colocated *.test.ts files and features/*.feature files under packages/axc/*/src/ or apps/*/src/, ` +
		`*.test.ts files under packages/axc-verification/archunit-tests/src/, packages/axc/*/tests/integration/, or apps/*/tests/integration/, ` +
		`*.feature files under packages/axc-verification/acceptance-api/src/features/ and *.ts files under its src/step-definitions/, ` +
		`plus notes under .agents-work/ and the temp dir; not source code, test config or harness (world.ts, serenity.ts, infrastructure.ts, ` +
		`cucumber.yaml), package.json, lockfiles, or packages/cellix/ (tried ${rel}).`
	);
}

// --- shell -------------------------------------------------------------------------------------------------------

function checkShell(command) {
	const bare = stripQuotes(command);
	for (const target of redirectTargets(bare)) {
		if (!isNotesOrTemp(target)) return `shell redirection may only write under .agents-work/ or the temp dir (tried ${target}).`;
	}
	for (const [name, args] of simpleCommands(bare)) {
		const reason = checkCommand(name, args);
		if (reason) return reason;
	}
	return null;
}

function checkCommand(name, args) {
	if (isVersionCheck(name, args)) return null;
	if (name === 'git') {
		const reason = checkGitReadOnly(args);
		return reason && `the unit tester may only run read-only git commands; ${reason}`;
	}
	if (name === 'mise') return checkMise(args);
	if (name === 'pnpm') return checkPnpm(args);
	if (name === 'vitest') return checkVitest(args);
	if (name === 'tsc' || name === 'tsgo') return args.includes('--init') ? `\`${name} --init\` writes a tsconfig.` : null;
	if (name === 'biome') return checkBiome(args);
	if (TOOLCHAIN.has(name)) return `\`${name}\` is not one of the unit tester's commands (pnpm test/test:arch/test:acceptance/build/typecheck, vitest, tsc, tsgo, biome check).`;
	if (INTERPRETERS.has(name)) return `\`${name}\` can run arbitrary code or write files; only bare version checks are allowed.`;
	if (FILE_WRITERS.has(name)) {
		const paths = args.filter((arg) => !arg.startsWith('-'));
		return name === 'mkdir' && paths.length && paths.every(isNotesOrTemp) ? null : `\`${name}\` changes files; use Write/Edit on allowed test files instead.`;
	}
	return checkInPlaceEditors(name, args);
}

// `mise exec|x [tools] -- <command>` is checked as <command>; everything else must be read-only.
function checkMise(args) {
	if (args[0] === 'exec' || args[0] === 'x') {
		const inner = args.slice(args.indexOf('--') + 1);
		if (!args.includes('--') || !inner.length) return '`mise exec` must use the form `mise exec -- <command>`.';
		return checkCommand(inner[0].slice(inner[0].lastIndexOf('/') + 1), inner.slice(1));
	}
	return checkMiseReadOnly(args);
}

function checkPnpm(args) {
	let i = 0;
	while (i < args.length && args[i].startsWith('-')) {
		const flag = args[i];
		if (PNPM_FLAGS_WITH_VALUE.has(flag)) i += 2;
		else if (PNPM_BOOLEAN_FLAGS.has(flag) || [...PNPM_FLAGS_WITH_VALUE].some((f) => f.startsWith('--') && flag.startsWith(`${f}=`))) i += 1;
		else if ((flag === '--version' || flag === '-v') && args.length === 1) return null;
		else return `\`pnpm ${args.join(' ')}\` uses an option the unit tester guard does not recognise (${flag}).`;
	}
	const sub = args[i];
	const rest = args.slice(i + 1);
	if (sub && PNPM_READ_ONLY.has(sub)) return null;
	if (sub === 'exec') {
		const inner = rest[0] === '--' ? rest.slice(1) : rest;
		if (!inner.length || inner[0].startsWith('-')) return '`pnpm exec` must be followed directly by the command to run (no shell mode).';
		return checkCommand(inner[0].slice(inner[0].lastIndexOf('/') + 1), inner.slice(1));
	}
	const script = sub === 'run' || sub === 'run-script' ? rest[0] : sub;
	const extra = sub === 'run' || sub === 'run-script' ? rest.slice(1) : rest;
	if (PNPM_SCRIPTS.has(script)) return ['test', 'test:arch', 'test:acceptance'].includes(script) ? checkVitestFlags(extra) : null;
	return `\`pnpm ${args.join(' ')}\` is not allowed: the unit tester may run only test, test:arch, test:acceptance, build, and typecheck (root or with --filter) and may not change dependencies or run verify, format, snyk, or audit.`;
}

function checkVitestFlags(args) {
	const bad = args.find((arg) => /^(-u|--update|--outputFile)(=|$)/.test(arg) || arg.startsWith('--outputFile.'));
	return bad ? `\`vitest ${bad}\` writes snapshot or report files outside the allowed test files.` : null;
}

function checkVitest(args) {
	if (args.find((arg) => !arg.startsWith('-')) === 'init') return '`vitest init` writes config files.';
	return checkVitestFlags(args);
}

// `biome check|lint|format|ci` is fine read-only. With --write/--fix it may only touch explicitly listed allowed test files.
function checkBiome(args) {
	const positional = args.filter((arg) => !arg.startsWith('-'));
	const sub = positional[0];
	if (!sub || !BIOME_SUBCOMMANDS.has(sub)) return `\`biome ${args.join(' ')}\` is not allowed; use \`biome check\`, \`lint\`, \`format\`, or \`ci\`.`;
	if (!args.some((arg) => BIOME_WRITE_FLAGS.test(arg))) return null;
	const paths = positional.slice(1);
	if (!paths.length) return '`biome --write/--fix` needs explicit paths, and every path must be an allowed test file.';
	const bad = paths.find((path) => checkWrite(path) !== null || isNotesOrTemp(path));
	return bad ? `\`biome --write/--fix\` may only rewrite allowed test files (tried ${bad}).` : null;
}

// --- entry point -------------------------------------------------------------------------------------------------

const projectDir = process.env.CLAUDE_PROJECT_DIR || input.cwd;
const repoRoot = createRepoRoot(projectDir);

runGuard(
	() => check(input.tool_name, input.tool_input ?? {}),
	(reason) => `Unit tester guard: ${reason} ${ESCALATE} See ${RULES}.`,
);
