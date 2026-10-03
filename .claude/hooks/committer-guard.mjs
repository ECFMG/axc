// PreToolUse guard for the `committer` sub-agent (.agents/instructions/04-committer-agent.md).
// Claude Code passes `agent_type` (the sub-agent's frontmatter `name`) on tool calls made inside a sub-agent, so this
// guard only acts when agent_type is `committer`. Every other caller (main thread, manager, other sub-agents) passes
// through untouched.
// Escape hatch for maintenance sessions: start Claude Code with AXC_COMMITTER_GUARD=off.
//
// The committer stages, commits, and (when its brief says so) pushes exactly the files and message the manager gives it.
// It never edits files: Write/Edit/NotebookEdit may only touch .agents-work/ and the temp dir (for a commit-message file).
// The shell is allow-by-exception: read-only commands, read-only git/mise/gh, and the narrow staging, commit, push, and
// branch forms below. Everything else is denied.
//
// `git commit` runs the repository's husky pre-commit hook (lint-staged, then `pnpm run verify`) inside git. That is repo
// policy, outside this guard; the committer may not skip it (--no-verify, -n, HUSKY=0 and `-c` config are denied).

import { execFileSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';

// Dependency-free prelude: decide scope from the raw input before loading the shared lib, so a broken lib never blocks
// out-of-scope callers. Anything that goes wrong in scope exits 2, which blocks the tool call (exit 1 would not).
function block(message) {
	process.stderr.write(`Committer guard: ${message} Blocking this call (fail closed).\n`);
	process.exit(2);
}

if (process.env.AXC_COMMITTER_GUARD === 'off') process.exit(0);
let input;
try {
	input = JSON.parse(readFileSync(0, 'utf8'));
} catch (error) {
	block(`could not parse the hook input (${error.message}).`);
}
if (typeof input !== 'object' || input === null) block('the hook input is not a JSON object.');
if (input.agent_type !== 'committer') process.exit(0);
let lib;
try {
	lib = await import('./lib/guard-utils.mjs');
} catch (error) {
	block(`could not load lib/guard-utils.mjs (${error.message}).`);
}
const { checkGitReadOnly, checkMiseReadOnly, createRepoRoot, expandHome, gitCheckoutTouchesFiles, isNotesOrTempPath, isVersionCheck, parseShell, resolveExisting, runGuard, SHELL_GLOB, trackCd } = lib;

const RULES = '.agents/instructions/04-committer-agent.md';
const SCOPE = 'The committer only stages and commits the files and message in its brief; report anything else to the manager.';

function check(tool, args) {
	if (tool === 'Write' || tool === 'Edit' || tool === 'NotebookEdit') {
		const target = args.file_path ?? args.notebook_path;
		if (!target || isNotesOrTemp(target, { list: [input.cwd || projectDir], unknown: false })) return null;
		return `no-edit rule: the committer never edits files; it may only write a commit-message file under .agents-work/ or the temp dir (tried ${target}).`;
	}
	if (tool === 'Bash') return checkShell(String(args.command ?? ''));
	return null;
}

function isNotesOrTemp(path, cwds) {
	if (path.includes('$') || (cwds.unknown && !isAbsolute(expandHome(path)))) return false;
	return cwds.list.every((cwd) => isNotesOrTempPath(resolveExisting(resolve(cwd, expandHome(path))), projectDir, repoRoot));
}

// --- shell -------------------------------------------------------------------------------------------------------

// Read-only commands. Options that make some of them write or run commands are checked in checkReadOnly.
const READ_ONLY = new Set([
	'cat',
	'ls',
	'head',
	'tail',
	'wc',
	'grep',
	'egrep',
	'fgrep',
	'rg',
	'diff',
	'cmp',
	'comm',
	'find',
	'echo',
	'printf',
	'pwd',
	'which',
	'type',
	'file',
	'stat',
	'du',
	'df',
	'basename',
	'dirname',
	'realpath',
	'readlink',
	'sort',
	'uniq',
	'cut',
	'tr',
	'jq',
	'column',
	'nl',
	'tree',
	'true',
	'false',
	'test',
	'[',
	'date',
	'whoami',
	'id',
	'uname',
	'hostname',
	'printenv',
]);

function checkShell(command) {
	const cwds = { list: [input.cwd || projectDir], unknown: false };
	for (const { words, redirects } of parseShell(command)) {
		for (const { target, write } of redirects) {
			if (write && !isNotesOrTemp(target, cwds)) return `redirect rule: shell output may only be written under .agents-work/ or the temp dir (tried ${target}).`;
		}
		if (!words.length) continue;
		if (/^[A-Za-z_]\w*=/.test(words[0])) return `environment rule: \`${words[0]}\` sets an environment variable for the command, which can change what git runs (for example HUSKY=0 or GIT_DIR); run the command without it.`;
		const name = words[0].slice(words[0].lastIndexOf('/') + 1);
		const reason = checkCommand(name, words.slice(1), cwds);
		if (reason) return reason;
	}
	return null;
}

function checkCommand(name, args, cwds) {
	if (isVersionCheck(name, args) || (name === 'pnpm' && args.length === 1 && ['--version', '-v'].includes(args[0]))) return null;
	if (name === 'cd' || name === 'pushd') {
		trackCd(args, cwds);
		return null;
	}
	if (name === 'git') return checkGit(args, cwds);
	if (name === 'mise') {
		const reason = checkMiseReadOnly(args);
		return reason && `read-only rule: ${reason}`;
	}
	if (name === 'gh') return checkGh(args);
	if (READ_ONLY.has(name)) return checkReadOnly(name, args);
	return `allow-list rule: \`${name}\` is not one of the committer's commands (read-only inspection, git add/restore --staged/reset <paths>/commit/push, branch switch or creation, read-only gh).`;
}

function checkReadOnly(name, args) {
	const writes =
		(name === 'sort' && args.some((arg) => /^(-o|--output)(=|$)/.test(arg) || /^-[a-zA-Z]*o/.test(arg))) ||
		(name === 'uniq' && args.filter((arg) => !arg.startsWith('-')).length > 1) ||
		(name === 'tree' && args.some((arg) => arg === '-o')) ||
		(name === 'rg' && args.some((arg) => /^--pre(=|$)/.test(arg))) ||
		(name === 'find' && args.some((arg) => ['-delete', '-exec', '-execdir', '-ok', '-okdir', '-fprint', '-fprint0', '-fprintf', '-fls'].includes(arg)));
	return writes ? `read-only rule: \`${name} ${args.join(' ')}\` writes files or runs commands.` : null;
}

// --- git ---------------------------------------------------------------------------------------------------------

function checkGit(args, outer) {
	if (args.length === 1 && args[0] === '--version') return null;
	let i = 0;
	let cwds = outer;
	while (i < args.length && args[i].startsWith('-')) {
		if (args[i] === '-C' && args[i + 1] !== undefined) {
			const dir = args[i + 1];
			if (dir.includes('$') || SHELL_GLOB.test(dir)) cwds = { list: cwds.list, unknown: `\`git -C ${dir}\` cannot be resolved.` };
			else cwds = { list: cwds.list.map((cwd) => resolve(cwd, expandHome(dir))), unknown: isAbsolute(expandHome(dir)) ? false : cwds.unknown };
			i += 2;
		} else if (args[i] === '--no-pager' || args[i] === '-P') i++;
		else return `git rule: the global option \`${args[i]}\` is not allowed (only -C and --no-pager); -c and --git-dir/--work-tree can change what git runs or where it writes.`;
	}
	const sub = args[i];
	const rest = args.slice(i + 1);
	if (!sub) return null;
	const deny = (why) => `git rule: \`git ${[sub, ...rest].join(' ')}\` ${why}`;
	switch (sub) {
		case 'add':
			return checkAdd(rest, cwds, deny);
		case 'restore':
			return checkRestore(rest, cwds, deny);
		case 'reset':
			return checkReset(rest, cwds, deny);
		case 'commit':
			return checkCommit(rest, deny);
		case 'push':
			return checkPush(rest, deny);
		case 'switch':
			return checkSwitch(rest, deny);
		case 'checkout': {
			if (rest.some((arg) => arg.startsWith('-') && !['-b', '-q', '--quiet'].includes(arg))) return deny('is not allowed; only `git checkout -b <name>` and plain branch switches are.');
			return gitCheckoutTouchesFiles(rest, cwds) ? deny('could change working-tree files; only `git checkout -b <name>` and plain branch switches are allowed.') : null;
		}
	}
	if (rest.some((arg) => /^--output(=|$)/.test(arg))) return deny('writes its output to a file.');
	if (sub === 'grep' && rest.some((arg) => /^(-O|--open-files-in-pager)/.test(arg))) return deny('runs a pager command.');
	const reason = checkGitReadOnly([sub, ...rest]);
	return reason && `git rule: the committer may only run read-only git commands besides add, restore --staged, reset <paths>, commit, push, and branch switching; ${reason}`;
}

// An explicit file path (or a directory too, when `allowDirs`), or a reason.
function explicitPath(arg, cwds, allowDirs) {
	if (arg === '') return 'an empty path';
	if (arg.includes('$')) return `${arg} uses a variable or command substitution`;
	if (SHELL_GLOB.test(arg)) return `${arg} contains glob characters`;
	if (arg.startsWith(':')) return `${arg} uses pathspec magic`;
	if (allowDirs) return null;
	if (arg === '.' || arg === '..' || arg.endsWith('/')) return `${arg} is a directory`;
	if (cwds.unknown && !isAbsolute(expandHome(arg))) return `${arg} is relative and ${cwds.unknown}`;
	for (const cwd of cwds.list) {
		try {
			if (statSync(resolve(cwd, expandHome(arg))).isDirectory()) return `${arg} is a directory`;
		} catch {
			// A path that does not exist is a deletion being staged.
		}
	}
	return null;
}

// Splits arguments into options and paths (everything after `--` is a path). Returns a reason for any option not in `allowed`.
function splitArgs(rest, allowed) {
	const options = [];
	const paths = [];
	let dashdash = false;
	for (const arg of rest) {
		if (dashdash || !arg.startsWith('-')) paths.push(arg);
		else if (arg === '--') dashdash = true;
		else options.push(arg);
	}
	const bad = options.find((option) => !allowed.includes(option));
	return { options, paths, dashdash, bad };
}

function checkPaths(paths, cwds, allowDirs, deny) {
	if (!paths.length) return deny('needs explicit file paths.');
	for (const path of paths) {
		const reason = explicitPath(path, cwds, allowDirs);
		if (reason) return deny(`must name explicit files: ${reason}.`);
	}
	return null;
}

function checkAdd(rest, cwds, deny) {
	const { paths, bad } = splitArgs(rest, ['-v', '--verbose', '-n', '--dry-run']);
	if (bad) return deny(`uses ${bad}; only \`git add [-v] [-n] [--] <explicit files>\` is allowed (no -A/--all/-u/-p/-i/--force).`);
	return checkPaths(paths, cwds, false, deny);
}

function checkRestore(rest, cwds, deny) {
	const { options, paths, bad } = splitArgs(rest, ['--staged', '-S', '-q', '--quiet']);
	if (bad || !options.some((option) => option === '--staged' || option === '-S')) return deny('is not allowed; only `git restore --staged <paths>` (unstaging) is.');
	return checkPaths(paths, cwds, true, deny);
}

// `git reset [-q] [HEAD] -- <paths>` or `git reset [-q] <paths>`: unstaging only, never moving HEAD or touching files.
function checkReset(rest, cwds, deny) {
	const split = rest.indexOf('--');
	const before = split === -1 ? rest : rest.slice(0, split);
	const bad = before.find((arg) => arg.startsWith('-') && arg !== '-q' && arg !== '--quiet');
	if (bad) return deny(`uses ${bad}; only \`git reset [-q] -- <paths>\` (unstaging) is allowed.`);
	const names = before.filter((arg) => !arg.startsWith('-'));
	if (split !== -1) {
		if (names.length > 1 || (names.length === 1 && names[0] !== 'HEAD')) return deny('names a commit; only `git reset [-q] [HEAD] -- <paths>` is allowed.');
		return checkPaths(rest.slice(split + 1), cwds, true, deny);
	}
	if (!names.length) return deny('without paths resets the whole index; name the paths to unstage.');
	const commitish = names.find((name) => isRevision(name, cwds));
	if (commitish) return deny(`names a commit (${commitish}); use \`git reset -- <paths>\` to unstage.`);
	return checkPaths(names, cwds, true, deny);
}

function isRevision(name, cwds) {
	try {
		execFileSync('git', ['-C', cwds.list[0], 'rev-parse', '--verify', '--quiet', `${name}^{commit}`], { stdio: 'ignore' });
		return true;
	} catch {
		return false;
	}
}

const COMMIT_VALUE_OPTIONS = ['-m', '--message', '-F', '--file', '--author'];
const COMMIT_FLAGS = ['-s', '--signoff', '--allow-empty', '-q', '--quiet'];

function checkCommit(rest, deny) {
	let message = false;
	for (let i = 0; i < rest.length; i++) {
		const arg = rest[i];
		if (COMMIT_VALUE_OPTIONS.includes(arg)) {
			if (i + 1 >= rest.length) return deny(`is missing the value for ${arg}.`);
			message ||= arg !== '--author';
			i++;
		} else if (/^--(message|file)=/.test(arg) || /^-[mF]./.test(arg)) message = true;
		else if (/^--author=/.test(arg) || COMMIT_FLAGS.includes(arg)) continue;
		else if (arg.startsWith('-')) {
			return deny(`uses ${arg}; only -m/--message, -F/--file, -s/--signoff, --allow-empty, --author, and -q are allowed (never --amend, -a, --no-verify/-n, --fixup/--squash, -c/-C, -i/-o).`);
		} else return deny(`names a pathspec (${arg}); stage the files with git add and commit without paths.`);
	}
	return message ? null : deny('needs -m or -F; the committer cannot use an editor.');
}

function checkPush(rest, deny) {
	const { paths: positional, bad } = splitArgs(rest, ['-u', '--set-upstream', '-q', '--quiet', '-v', '--verbose', '--dry-run']);
	if (bad) return deny(`uses ${bad}; only \`git push [-u|--set-upstream] [<remote> [<branch>]]\` is allowed (no force, delete, mirror, --all, --tags, --prune, --no-verify).`);
	if (positional.length > 2) return deny('names more than one refspec.');
	const refspec = positional.find((arg) => arg.startsWith('+') || arg.startsWith(':') || arg.includes(':') || arg.includes('$') || SHELL_GLOB.test(arg));
	return refspec ? deny(`uses the refspec ${refspec}; push a plain branch name (no +, :, or <src>:<dst>).`) : null;
}

function checkSwitch(rest, deny) {
	const name = rest.length === 1 ? rest[0] : rest.length === 2 && (rest[0] === '-c' || rest[0] === '--create') ? rest[1] : null;
	const bad = name === null || (name !== '-' && name.startsWith('-')) || name.includes('$') || SHELL_GLOB.test(name);
	return bad ? deny('is not allowed; only `git switch <branch>` and `git switch -c <name>` are.') : null;
}

// --- gh ----------------------------------------------------------------------------------------------------------

const GH_READ_ONLY = { pr: ['view', 'list', 'status', 'diff'], auth: ['status'], repo: ['view'] };

function checkGh(args) {
	const [group, sub] = args.filter((arg) => !arg.startsWith('-'));
	if (args.length === 1 && args[0] === '--version') return null;
	return GH_READ_ONLY[group]?.includes(sub) ? null : `gh rule: only \`gh pr view|list|status|diff\`, \`gh auth status\`, and \`gh repo view\` are allowed (tried gh ${args.join(' ')}).`;
}

// --- entry point -------------------------------------------------------------------------------------------------

const projectDir = process.env.CLAUDE_PROJECT_DIR || input.cwd;
const repoRoot = createRepoRoot(projectDir);

runGuard(
	() => check(input.tool_name, input.tool_input ?? {}),
	(reason) => `Committer guard: ${reason} ${SCOPE} See ${RULES}.`,
);
