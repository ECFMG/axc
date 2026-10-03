// PreToolUse guard for the `developer` sub-agent (.agents/instructions/03-developer-agent.md).
// Claude Code passes `agent_type` (the sub-agent's frontmatter `name`) on tool calls made inside a sub-agent, so this
// guard only acts when agent_type is `developer`. Every other caller (main thread, manager, other sub-agents) passes
// through untouched.
// Escape hatch for maintenance sessions: start Claude Code with AXC_DEVELOPER_GUARD=off.
//
// The developer may write code anywhere. This guard only stops it from changing unit tests, the test harness, and the
// agent guardrails (the protected paths below), in this repository or any of its git worktrees. Write/Edit/NotebookEdit
// are checked exactly. Shell commands are checked best effort: redirects, known file-writing commands, in-place
// editors, inline-code interpreters, snapshot updates, write-mode formatters, and git commands that rewrite or discard
// tracked files. A script file the developer writes and then runs is not inspected.

import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';

// Dependency-free prelude: decide scope from the raw input before loading the shared lib, so a broken lib never blocks
// out-of-scope callers. Anything that goes wrong in scope exits 2, which blocks the tool call (exit 1 would not).
function block(message) {
	process.stderr.write(`Developer guard: ${message} Blocking this call (fail closed).\n`);
	process.exit(2);
}

if (process.env.AXC_DEVELOPER_GUARD === 'off') process.exit(0);
let input;
try {
	input = JSON.parse(readFileSync(0, 'utf8'));
} catch (error) {
	block(`could not parse the hook input (${error.message}).`);
}
if (typeof input !== 'object' || input === null) block('the hook input is not a JSON object.');
if (input.agent_type !== 'developer') process.exit(0);
let lib;
try {
	lib = await import('./lib/guard-utils.mjs');
} catch (error) {
	block(`could not load lib/guard-utils.mjs (${error.message}).`);
}
const { commandWords, createRepoRoot, expandHome, FILE_WRITERS, gitCheckoutTouchesFiles, isAcceptanceTestPath, isVersionCheck, parseShell, resolveExisting, runGuard, SHELL_GLOB: GLOB, trackCd } = lib;

const RULES = '.agents/instructions/03-developer-agent.md';
const ESCALATE = 'Unit tests belong to the unit-tester; to dispute a test, send a challenge to the manager. Do not work around this guard; report the blocked change to the manager instead.';

function check(tool, args) {
	if (tool === 'Write' || tool === 'Edit' || tool === 'NotebookEdit') {
		const target = args.file_path ?? args.notebook_path;
		if (!target) return null;
		const hit = classify(resolveExisting(resolve(input.cwd || projectDir, target)));
		return hit && `protected path rule: ${hit.rel} is ${hit.kind}, which the developer may not modify (tried ${target}).`;
	}
	if (tool === 'Bash') return checkShell(String(args.command ?? ''));
	return null;
}

// --- protected paths ---------------------------------------------------------------------------------------------

const TEST_FILE = /\.(test|spec)\.[cm]?[jt]sx?$/;
const UNPROTECTED_DIRS = new Set(['node_modules', 'dist']);
const WALK_LIMIT = 20000;

// What kind of protected path `rel` (relative to a repository root) is, or null. Matching ignores case, as the default
// macOS file system does. Third-party and build output (node_modules/, dist/) never holds the project's unit tests.
function protectedKind(rel) {
	const parts = rel.toLowerCase().split(sep);
	const name = parts.at(-1);
	if (parts[0] === '.claude' || parts[0] === '.agents' || rel.toLowerCase() === 'agents.md' || rel.toLowerCase() === 'claude.md' || parts.join('/') === '.github/copilot-instructions.md') {
		return 'an agent guardrail file';
	}
	if (parts[0] === 'packages' && parts[1] === 'cellix' && parts[2] === 'config-vitest') return 'test configuration (packages/cellix/config-vitest)';
	if (parts.some((part) => UNPROTECTED_DIRS.has(part))) return null;
	if (/^vitest\.(config|workspace)(\.|$)/.test(name)) return 'test configuration (a vitest config)';
	if (TEST_FILE.test(name)) return 'a test file (owned by the unit-tester)';
	if (parts.includes('__snapshots__') || name.endsWith('.snap')) return 'a test snapshot';
	if (isAcceptanceTestPath(parts)) return 'a test file (owned by the unit-tester)';
	const acceptance = parts[0] === 'packages' && parts[1] === 'axc-verification' && parts[2] === 'acceptance-api';
	if (name.endsWith('.feature') && parts.at(-2) === 'features' && parts.slice(0, -2).includes('src') && !acceptance) return 'a unit-test feature file';
	return null;
}

// { rel, kind } when the resolved path is protected in this repository or one of its worktrees, otherwise null.
function classify({ full, existing }) {
	const root = repoRoot(existing);
	if (!root) return null;
	const rel = relative(root, full);
	if (rel.startsWith('..') || isAbsolute(rel)) return null;
	const kind = protectedKind(rel);
	return kind ? { rel, kind } : null;
}

// First protected path inside directory `dir` (not following symlinks), or { tooLarge } past WALK_LIMIT entries.
function findProtectedIn(dir) {
	const root = repoRoot(dir);
	if (!root) return null;
	const stack = [dir];
	let seen = 0;
	while (stack.length) {
		const current = stack.pop();
		for (const entry of readdirSync(current, { withFileTypes: true })) {
			if (++seen > WALK_LIMIT) return { tooLarge: true };
			const path = join(current, entry.name);
			const rel = relative(root, path);
			const kind = protectedKind(rel);
			if (kind) return { rel, kind };
			if (entry.isDirectory() && entry.name !== '.git' && !UNPROTECTED_DIRS.has(entry.name.toLowerCase())) stack.push(path);
		}
	}
	return null;
}

// Null when a shell path argument is safe to write, otherwise a reason. `cwds` holds every working directory the command
// line may be in (after `cd`); a relative path is checked against each. With `walk`, an existing directory argument is
// searched for protected files.
function checkPathArg(arg, cwds, walk) {
	if (arg === '') return null;
	if (arg.includes('$')) return `cannot verify ${arg}: it uses a variable or command substitution.`;
	if (GLOB.test(arg)) return `cannot verify ${arg}: it contains glob or brace-expansion characters.`;
	const path = expandHome(arg);
	if (cwds.unknown && !isAbsolute(path)) return `cannot verify ${arg}: ${cwds.unknown}`;
	for (const cwd of cwds.list) {
		const resolved = resolveExisting(resolve(cwd, path));
		const hit = classify(resolved);
		if (hit) return `${hit.rel} is ${hit.kind}.`;
		if (walk && resolved.existing === resolved.full && statSync(resolved.full).isDirectory()) {
			const inner = findProtectedIn(resolved.full);
			if (inner?.tooLarge) return `cannot verify ${arg}: the directory has more than ${WALK_LIMIT} entries to search for protected files.`;
			if (inner) return `${arg} is a directory containing ${inner.kind} (${inner.rel}).`;
		}
	}
	return null;
}

function checkPaths(label, paths, cwds, walk = true) {
	for (const path of paths) {
		const reason = checkPathArg(path, cwds, walk);
		if (reason) return `\`${label}\` would change a protected path or one it cannot verify: ${reason}`;
	}
	return null;
}

const positional = (args) => args.filter((arg) => !arg.startsWith('-') || arg === '-');

// --- shell -------------------------------------------------------------------------------------------------------

function checkShell(command) {
	// `unknown` is false, or the reason relative paths cannot be resolved.
	const cwds = { list: [input.cwd || projectDir], unknown: false };
	for (const { words, redirects } of parseShell(command)) {
		for (const { target, write } of redirects) {
			const reason = write && checkPathArg(target, cwds, false);
			if (reason) return `shell redirection rule: ${reason}`;
		}
		const parsed = commandWords(words);
		const reason = parsed && checkCommand(parsed[0], parsed[1], cwds);
		if (reason) return reason;
	}
	return null;
}

const INLINE = 'inline code can write any file, so it is not allowed; put the code in a script file and run that, or use Write/Edit.';
const SHELLS = new Set(['sh', 'bash', 'zsh', 'dash', 'ksh']);
const AWKS = new Set(['awk', 'gawk', 'nawk', 'mawk']);

function checkCommand(name, args, cwds) {
	if (isVersionCheck(name, args)) return null;
	if (name === 'cd' || name === 'pushd') return trackCd(args, cwds) ?? null;
	if (name === 'git') return checkGit(args, cwds, 0);
	if (name === 'mise') return checkMise(args, cwds);
	if (name === 'pnpm') return checkPnpm(args, cwds);
	if (name === 'npx') return checkInner('npx', args, cwds);
	if (name === 'npm') return checkNpm(args, cwds);
	if (name === 'turbo') return checkTurbo(args);
	if (name === 'vitest') return checkVitest(args, cwds);
	if (name === 'biome') return checkBiome(args, cwds, true);
	if (name === 'prettier' || name === 'eslint') return checkBiome(args, cwds, false);
	if (name === 'xargs') return checkXargs(args, cwds);
	if (name === 'sed') return checkSed(args, cwds);
	if (name === 'find') return checkFind(args, cwds);
	if (AWKS.has(name)) return checkAwk(name, args);
	const interpreter = checkInterpreter(name, args, cwds);
	if (interpreter !== undefined) return interpreter;
	if (name === 'dd')
		return checkPaths(
			'dd',
			args.filter((arg) => arg.startsWith('of=')).map((arg) => arg.slice(3)),
			cwds,
			false,
		);
	if (name === 'tar') return checkTar(args, cwds);
	if (name === 'unzip') return checkUnzip(args, cwds);
	if (name === 'patch') {
		const paths = positional(args);
		return paths.length ? checkPaths('patch', paths, cwds) : '`patch` without an explicit target file can change any file the diff names, including protected ones.';
	}
	if (name === 'mkdir') return checkPaths('mkdir', positional(args), cwds, false);
	if (FILE_WRITERS.has(name)) {
		const target = args.filter((arg) => arg.startsWith('--target-directory=')).map((arg) => arg.slice(19));
		return checkPaths(name, [...positional(args), ...target], cwds);
	}
	return null;
}

// --- git ---------------------------------------------------------------------------------------------------------

const GIT_DISCARDS = new Set(['restore', 'reset', 'clean', 'rm', 'mv', 'apply', 'am', 'cherry-pick', 'revert', 'merge', 'rebase', 'pull', 'checkout-index', 'read-tree', 'sparse-checkout', 'filter-branch', 'bisect']);
const GIT_DELEGATED = new Set(['commit', 'push']);
const GIT_BUILTINS = new Set([
	...GIT_DISCARDS,
	...GIT_DELEGATED,
	'add',
	'status',
	'log',
	'diff',
	'show',
	'branch',
	'checkout',
	'switch',
	'fetch',
	'tag',
	'worktree',
	'remote',
	'config',
	'stash',
	'blame',
	'grep',
	'ls-files',
	'ls-tree',
	'rev-parse',
	'describe',
	'shortlog',
	'reflog',
	'cat-file',
	'merge-base',
	'rev-list',
	'help',
	'version',
	'init',
	'clone',
]);
const GIT_RULE = 'git rule: this git command can rewrite or discard tracked files, including unit tests.';

function checkGit(args, cwds, depth) {
	let i = 0;
	let dirs = cwds.list;
	while (i < args.length && args[i].startsWith('-')) {
		if (args[i] === '-c' && /^alias\./i.test(args[i + 1] ?? '')) return '`git -c alias.…` defines an alias the guard cannot verify.';
		if (args[i] === '-C' && args[i + 1]) dirs = dirs.map((dir) => resolve(dir, args[i + 1]));
		i += ['-C', '-c', '--git-dir', '--work-tree', '--namespace'].includes(args[i]) ? 2 : 1;
	}
	const sub = args[i];
	const rest = args.slice(i + 1);
	if (!sub) return null;
	if (GIT_DELEGATED.has(sub)) return `git rule: the developer does not run \`git ${sub}\`; commits and pushes are delegated separately when the user asks for them.`;
	if (GIT_DISCARDS.has(sub)) return `\`git ${sub}\`: ${GIT_RULE}`;
	if (sub === 'stash') return ['list', 'show'].includes(rest[0]) ? null : `\`git stash\`: ${GIT_RULE}`;
	if (sub === 'checkout') {
		const touches = gitCheckoutTouchesFiles(rest, { ...cwds, list: dirs });
		return touches ? `\`git checkout ${rest.join(' ')}\`: ${GIT_RULE} Only branch switches and -b/-B branch creation are allowed.` : null;
	}
	if (sub === 'switch') return rest.some((arg) => /^(-f|--force|--discard-changes|-m|--merge)$/.test(arg)) ? `\`git switch ${rest.join(' ')}\`: ${GIT_RULE}` : null;
	if (sub === 'worktree' && rest[0] === 'remove') return `\`git worktree remove\`: ${GIT_RULE}`;
	if (GIT_BUILTINS.has(sub)) return null;
	const alias = gitAlias(sub, dirs[0]);
	if (alias === null) return null;
	if (alias.startsWith('!') || depth >= 5) return `\`git ${sub}\` is a git alias the guard cannot verify.`;
	const expanded = parseShell(alias)[0]?.words ?? [];
	return checkGit([...args.slice(0, i), ...expanded, ...rest], cwds, depth + 1);
}

function exists(path) {
	try {
		statSync(path);
		return true;
	} catch {
		return false;
	}
}

function gitAlias(sub, cwd) {
	const out = spawnGit(['-C', cwd, 'config', '--get', `alias.${sub}`]);
	return out === null ? null : out.trim();
}

function spawnGit(args) {
	try {
		return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
	} catch {
		return null;
	}
}

// --- package managers, launchers, and the toolchain --------------------------------------------------------------

const UPDATE_FLAG = /^(-u|--update)(=|$)/;
const WRITE_FLAG = /^--(write|fix|apply|apply-unsafe)(=|$)/;
const WRITE_SCRIPT = /^format$|(^|[:-])(fix|write)$/;
const PNPM_FLAGS_WITH_VALUE = new Set(['--filter', '-F', '--filter-prod', '-C', '--dir', '--workspace-dir', '--reporter', '--loglevel', '--test-pattern', '--changed-files-ignore-pattern', '--package', '-p']);
const PNPM_BUILTINS = new Set([
	'add',
	'install',
	'i',
	'ci',
	'install-test',
	'it',
	'remove',
	'rm',
	'uninstall',
	'un',
	'update',
	'up',
	'upgrade',
	'link',
	'ln',
	'unlink',
	'import',
	'rebuild',
	'rb',
	'prune',
	'fetch',
	'dedupe',
	'patch',
	'patch-commit',
	'patch-remove',
	'approve-builds',
	'store',
	'publish',
	'pack',
	'outdated',
	'ls',
	'list',
	'll',
	'why',
	'audit',
	'licenses',
	'config',
	'get',
	'set',
	'env',
	'setup',
	'init',
	'create',
	'root',
	'bin',
	'help',
	'deploy',
	'server',
	'self-update',
	'cat-file',
	'cat-index',
	'find-hash',
]);

// Skips leading options (with their values where known). Denies shell mode, whose command string is not checked.
function skipOptions(label, args) {
	let i = 0;
	while (i < args.length && args[i].startsWith('-') && args[i] !== '--') {
		if (['-c', '--shell-mode', '--call'].includes(args[i])) return { reason: `inline-code rule: \`${label} ${args[i]}\` runs a shell string the guard cannot check; ${INLINE}` };
		i += PNPM_FLAGS_WITH_VALUE.has(args[i]) ? 2 : 1;
	}
	if (args[i] === '--') i++;
	return { rest: args.slice(i) };
}

function checkInner(label, args, cwds) {
	const { reason, rest } = skipOptions(label, args);
	if (reason) return reason;
	const inner = commandWords(rest);
	return inner && checkCommand(inner[0], inner[1], cwds);
}

function checkScript(label, script, extra) {
	if (script && WRITE_SCRIPT.test(script))
		return `formatter rule: \`${label}\` runs a write-mode formatter or fixer over the whole package, which would rewrite tests; run \`biome check --write <paths>\` on your own files instead.`;
	const bad = extra.find((arg) => UPDATE_FLAG.test(arg) || WRITE_FLAG.test(arg));
	return bad ? `\`${label}\`: ${bad.match(UPDATE_FLAG) ? 'snapshot rule: updating snapshots rewrites test files' : 'formatter rule: write-mode flags would rewrite files the guard cannot see'} (${bad}).` : null;
}

const FAN_OUT = 'with --filter/-r, pnpm runs the command in each matched package directory, which the guard cannot verify; use repo-root-relative paths without --filter, or `pnpm -C <dir>`.';

// Working directories a pnpm command runs in: -C/--dir moves it, -w/--workspace-root uses the workspace root, and
// --filter/-r run in package directories the guard does not resolve, so relative paths there cannot be verified.
function pnpmCwds(args, cwds) {
	const dirIndex = args.findIndex((arg) => arg === '-C' || arg === '--dir');
	const inline = args.find((arg) => arg.startsWith('--dir='));
	const dir = dirIndex !== -1 ? args[dirIndex + 1] : inline?.slice(6);
	if (args.some((arg) => /^(--filter|-F|--filter-prod|-r|--recursive)(=|$)/.test(arg))) return { list: cwds.list, unknown: FAN_OUT };
	if (dir === undefined && dirIndex !== -1) return { list: cwds.list, unknown: '`pnpm -C/--dir` has no directory.' };
	const moved = dir === undefined ? cwds : { list: cwds.list.map((cwd) => resolve(cwd, dir)), unknown: cwds.unknown };
	if (!args.some((arg) => arg === '-w' || arg === '--workspace-root')) return moved;
	return { ...moved, list: moved.list.map((cwd) => findUp(cwd, 'pnpm-workspace.yaml') ?? cwd) };
}

// Nearest directory at or above `dir` that contains `file`, or null.
function findUp(dir, file) {
	for (let current = resolve(dir); ; current = resolve(current, '..')) {
		if (exists(join(current, file))) return current;
		if (current === resolve(current, '..')) return null;
	}
}

// Whether `pnpm <name>` runs a package script: true when the nearest package.json (from each candidate working
// directory) defines a script called `name`, false when none does, null when the working directory is unknown.
function isPnpmScript(name, cwds) {
	if (cwds.unknown) return null;
	return cwds.list.some((cwd) => {
		const dir = findUp(cwd, 'package.json');
		if (!dir) return false;
		const scripts = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')).scripts ?? {};
		return Object.hasOwn(scripts, name);
	});
}

function checkPnpm(args, outer) {
	const { reason, rest } = skipOptions('pnpm', args);
	if (reason) return reason;
	const [sub, ...more] = rest;
	if (!sub) return null;
	const cwds = pnpmCwds(args, outer);
	if (sub === 'exec' || sub === 'dlx') return checkInner(`pnpm ${sub}`, more, pnpmCwds(more, cwds));
	if (PNPM_BUILTINS.has(sub)) return null;
	if (sub === 'run' || sub === 'run-script') {
		const script = skipOptions('pnpm run', more);
		if (script.reason) return script.reason;
		return checkScript(`pnpm ${args.join(' ')}`, script.rest[0], script.rest.slice(1));
	}
	// `pnpm <name>` runs the package script `name` if package.json defines one, and otherwise the binary `name`, exactly
	// like `pnpm exec <name>`. When the package is unknown (--filter/-r), both checks apply.
	const script = isPnpmScript(sub, cwds);
	const label = `pnpm ${args.join(' ')}`;
	if (script === true) return checkScript(label, sub, more);
	if (script === false) return checkCommand(sub, more, cwds);
	return checkScript(label, sub, more) ?? checkCommand(sub, more, cwds);
}

function checkNpm(args, cwds) {
	const [sub, ...more] = args;
	if (sub === 'exec' || sub === 'x') return checkInner(`npm ${sub}`, more, cwds);
	if (sub === 'run' || sub === 'run-script') return checkScript(`npm ${args.join(' ')}`, positional(more)[0], more.slice(1));
	if (['test', 't', 'start'].includes(sub)) return checkScript(`npm ${args.join(' ')}`, sub, more);
	return null;
}

function checkTurbo(args) {
	const split = args.indexOf('--');
	const tasks = positional(split === -1 ? args : args.slice(0, split)).filter((arg) => arg !== 'run');
	const label = `turbo ${args.join(' ')}`;
	for (const task of tasks) {
		const reason = checkScript(label, task, []);
		if (reason) return reason;
	}
	return checkScript(label, null, split === -1 ? [] : args.slice(split + 1));
}

function checkVitest(args, cwds) {
	if (positional(args)[0] === 'init') return 'test configuration rule: `vitest init` writes vitest config files.';
	const bad = args.find((arg) => UPDATE_FLAG.test(arg));
	if (bad) return `snapshot rule: \`vitest ${bad}\` rewrites snapshot files, which belong to the unit tester.`;
	const outputs = args.flatMap((arg, i) => (/^--outputFile(\.\w+)?=/.test(arg) ? [arg.slice(arg.indexOf('=') + 1)] : /^--outputFile(\.\w+)?$/.test(arg) ? [args[i + 1] ?? ''] : []));
	return checkPaths('vitest --outputFile', outputs, cwds, false);
}

// Write-mode formatters (biome, and prettier/eslint if ever used) may only touch explicitly listed, non-protected paths.
function checkBiome(args, cwds, subcommand) {
	if (!args.some((arg) => WRITE_FLAG.test(arg))) return null;
	if (args.some((arg) => /^--(staged|changed)(=|$)/.test(arg))) return 'formatter rule: `--write/--fix` with --staged/--changed picks files the guard cannot see; list your files explicitly.';
	const paths = positional(args).slice(subcommand ? 1 : 0);
	if (!paths.length) return 'formatter rule: `--write/--fix` without explicit paths rewrites the whole tree, including tests; list the files or directories you changed.';
	return checkPaths(`${subcommand ? 'biome' : 'formatter'} --write/--fix`, paths, cwds);
}

// --- shell utilities -------------------------------------------------------------------------------------------

const XARGS_FLAGS_WITH_VALUE = new Set(['-I', '-L', '-n', '-P', '-s', '-d', '-E', '-a', '-J', '-R', '-S']);
const PATH_WRITERS = new Set([...FILE_WRITERS, 'dd', 'tar', 'unzip', 'patch', 'sed', 'perl', 'ruby', 'find', 'biome']);

function checkXargs(args, cwds) {
	let i = 0;
	while (i < args.length && args[i].startsWith('-')) i += XARGS_FLAGS_WITH_VALUE.has(args[i]) ? 2 : 1;
	const inner = commandWords(args.slice(i));
	if (!inner) return null;
	if (PATH_WRITERS.has(inner[0])) return `\`xargs ${inner[0]}\` passes paths from its input, which the guard cannot see; name the paths explicitly.`;
	return checkCommand(inner[0], inner[1], cwds);
}

function checkSed(args, cwds) {
	if (!args.some((arg) => /^-[a-zA-Z]*i/.test(arg) || arg.startsWith('--in-place'))) return null;
	const files = [];
	let script = false;
	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		if (['-e', '--expression', '-f', '--file'].includes(arg)) {
			script = true;
			i++;
		} else if (arg.startsWith('--expression=') || arg.startsWith('--file=')) script = true;
		else if (arg === '-i' && (args[i + 1] === '' || /^\.[\w.~-]*$/.test(args[i + 1] ?? '')))
			i++; // BSD backup suffix
		else if (!arg.startsWith('-') || arg === '-') files.push(arg);
	}
	return checkPaths('sed -i', script ? files : files.slice(1), cwds);
}

const FIND_ACTIONS = new Set(['-delete', '-exec', '-execdir', '-ok', '-okdir', '-fprint', '-fprint0', '-fprintf', '-fls']);

function checkFind(args, cwds) {
	if (!args.some((arg) => FIND_ACTIONS.has(arg))) return null;
	let i = 0;
	while (i < args.length && /^-[HLPEXdsx]$/.test(args[i])) i++;
	const roots = [];
	while (i < args.length && !args[i].startsWith('-') && args[i] !== '(' && args[i] !== '!') roots.push(args[i++]);
	const reason = checkPaths('find -delete/-exec', roots.length ? roots : ['.'], cwds);
	if (reason) return reason;
	for (let j = i; j < args.length; j++) {
		if (['-fprint', '-fprint0', '-fprintf', '-fls'].includes(args[j])) {
			const out = checkPaths(`find ${args[j]}`, [args[j + 1] ?? ''], cwds, false);
			if (out) return out;
		}
		if (['-exec', '-execdir', '-ok', '-okdir'].includes(args[j])) {
			const end = args.findIndex((arg, k) => k > j && (arg === ';' || arg === '+'));
			const inner = commandWords(args.slice(j + 1, end === -1 ? args.length : end));
			const innerReason =
				inner &&
				checkCommand(
					inner[0],
					inner[1].filter((arg) => arg !== '{}'),
					cwds,
				);
			if (innerReason) return innerReason;
		}
	}
	return null;
}

function checkAwk(name, args) {
	if (args.some((arg) => arg === '-i' || arg.startsWith('--include') || /^-i\s*inplace/.test(arg))) return `\`${name} -i inplace\` edits files in place.`;
	let i = 0;
	while (i < args.length && args[i].startsWith('-')) {
		if (args[i] === '-f' || args[i].startsWith('--file')) return null;
		i += ['-F', '-v'].includes(args[i]) ? 2 : 1;
	}
	const program = args[i] ?? '';
	return /\bsystem\s*\(|\bprintf?\b[^;}]*[>|]|\|\s*getline/.test(program) ? `inline-code rule: this ${name} program writes files or runs commands; ${INLINE}` : null;
}

// Undefined when `name` is not an interpreter; otherwise null (running a script file) or a reason.
function checkInterpreter(name, args, cwds) {
	const stdin = `inline-code rule: \`${name}\` without a script file reads code from stdin; ${INLINE}`;
	const inline = `inline-code rule: \`${name} ${args.join(' ')}\`: ${INLINE}`;
	if (name === 'eval') return `inline-code rule: \`eval\`: ${INLINE}`;
	if (['node', 'tsx', 'ts-node'].includes(name)) {
		const valued = ['-r', '--require', '--import', '--loader', '--experimental-loader', '-C', '--conditions', '--env-file', '--input-type', '--title'];
		for (let i = 0; i < args.length; i++) {
			const arg = args[i];
			if (/^--(eval|print)(=|$)/.test(arg) || /^-[a-zA-Z]*[ep][a-zA-Z]*$/.test(arg)) return inline;
			if (arg === '-') return stdin;
			if (!arg.startsWith('-')) return null;
			if (valued.includes(arg)) i++;
		}
		return args.some((arg) => ['-h', '--help', '-v', '--version'].includes(arg)) ? null : stdin;
	}
	if (name === 'bun') return args.some((arg) => /^(-e|-p|--eval|--print)(=|$)/.test(arg)) ? inline : null;
	if (name === 'deno') {
		const sub = positional(args)[0];
		if (!sub || sub === 'eval' || sub === 'repl') return sub ? inline : stdin;
		return sub === 'run' && positional(args)[1] === '-' ? stdin : null;
	}
	if (name === 'python' || name === 'python3') {
		for (let i = 0; i < args.length; i++) {
			const arg = args[i];
			if (/^-[bBdEhiIOPqsSuvVx]*c/.test(arg)) return inline;
			if (arg === '-') return stdin;
			if (arg === '-m' || !arg.startsWith('-')) return null;
			if (['-W', '-X'].includes(arg)) i++;
		}
		return args.some((arg) => ['-h', '--help', '-V', '--version'].includes(arg)) ? null : stdin;
	}
	if (SHELLS.has(name)) {
		for (let i = 0; i < args.length; i++) {
			const arg = args[i];
			if (/^-[a-zA-Z]*c/.test(arg)) return inline;
			if (/^-[a-zA-Z]*s/.test(arg) || arg === '-') return stdin;
			if (!arg.startsWith('-') && !arg.startsWith('+')) return null;
			if (['-o', '-O', '+o', '+O', '--rcfile', '--init-file'].includes(arg)) i++;
		}
		return stdin;
	}
	if (name === 'perl' || name === 'ruby') {
		let inPlace = false;
		const files = [];
		for (let i = 0; i < args.length; i++) {
			const arg = args[i];
			if (/^-[MmIl0xCdDr]/.test(arg)) {
				if (/^-[MmIr]$/.test(arg)) i++;
			} else if (/^-[a-zA-Z]*[eE]/.test(arg)) return inline;
			else if (/^-[a-zA-Z]*i/.test(arg)) inPlace = true;
			else if (!arg.startsWith('-') || arg === '-') files.push(arg);
		}
		if (!files.length || files[0] === '-') return stdin;
		return inPlace ? checkPaths(`${name} -i`, files.slice(1), cwds) : null;
	}
	if (name === 'osascript') return args.includes('-e') ? inline : positional(args).length ? null : stdin;
	return undefined;
}

function checkTar(args, cwds) {
	const first = args[0] ?? '';
	const modes = args.filter((arg) => /^-[a-zA-Z]+$/.test(arg)).join('') + (first.startsWith('-') ? '' : first);
	const extract = /x/.test(modes) || args.some((arg) => arg === '--extract' || arg === '--get');
	if (/t/.test(modes) && !extract) return null;
	if (!extract) return checkPaths('tar', positional(args.slice(first.startsWith('-') ? 0 : 1)), cwds);
	const dirIndex = args.findIndex((arg) => arg === '-C' || arg === '--directory');
	const inline = args.find((arg) => arg.startsWith('--directory='));
	const dir = dirIndex !== -1 ? args[dirIndex + 1] : inline ? inline.slice(12) : '.';
	return checkPaths('tar -x', [dir ?? ''], cwds);
}

function checkUnzip(args, cwds) {
	if (args.some((arg) => /^-[a-zA-Z]*[lptvZ]/.test(arg))) return null;
	const dirIndex = args.indexOf('-d');
	return checkPaths('unzip', [dirIndex === -1 ? '.' : (args[dirIndex + 1] ?? '')], cwds);
}

// --- mise --------------------------------------------------------------------------------------------------------

// `mise exec|x [tools] -- <command>` is checked as <command>. Other mise commands (install, use, run) are allowed.
function checkMise(args, cwds) {
	if (args[0] !== 'exec' && args[0] !== 'x') return null;
	if (args.some((arg) => arg === '-c' || arg === '--command' || arg.startsWith('--command='))) return `inline-code rule: \`mise exec -c\` runs a shell string; ${INLINE}`;
	const split = args.indexOf('--');
	if (split === -1 || split === args.length - 1) return '`mise exec` must use the form `mise exec -- <command>` so the guard can check the command.';
	const inner = commandWords(args.slice(split + 1));
	return inner && checkCommand(inner[0], inner[1], cwds);
}

// --- entry point -------------------------------------------------------------------------------------------------

const projectDir = process.env.CLAUDE_PROJECT_DIR || input.cwd;
const repoRoot = createRepoRoot(projectDir);

runGuard(
	() => check(input.tool_name, input.tool_input ?? {}),
	(reason) => `Developer guard: ${reason} ${ESCALATE} See ${RULES}.`,
);
