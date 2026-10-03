// Shared helpers for the PreToolUse guards in .claude/hooks/ (manager-, unit-test-, developer-, and committer-guard.mjs).

import { execFileSync } from 'node:child_process';
import { existsSync, lstatSync, realpathSync, statSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';

export function deny(message) {
	console.log(
		JSON.stringify({
			hookSpecificOutput: {
				hookEventName: 'PreToolUse',
				permissionDecision: 'deny',
				permissionDecisionReason: message,
			},
		}),
	);
}

// Runs `check` and denies with `format(reason)` when it returns a reason. A crashing hook would let the call through,
// so any internal error is turned into a deny (fail closed).
export function runGuard(check, format) {
	let reason;
	try {
		reason = check();
	} catch (error) {
		reason = `the guard could not evaluate this call (${error.message}).`;
	}
	if (reason) deny(format(reason));
}

export function real(path) {
	try {
		return realpathSync(path);
	} catch {
		return resolve(path);
	}
}

export function within(path, dir) {
	const rel = relative(real(dir), path);
	return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel));
}

// Absolute path with the parent directory's symlinks resolved (the file itself may not exist yet).
export function resolveTarget(path, cwd) {
	const abs = resolve(cwd, path);
	const dir = real(resolve(abs, '..'));
	return resolve(dir, abs.slice(abs.lastIndexOf('/') + 1));
}

// Resolves every symlink in an absolute path, including the file itself when it exists, even when trailing segments do not
// exist yet. Returns the resolved path and the deepest ancestor (or the path itself) that exists on disk.
// A dangling symlink throws, which the fail-closed wrapper turns into a deny.
export function resolveExisting(abs) {
	let existing = abs;
	const missing = [];
	while (!exists(existing)) {
		const parent = dirname(existing);
		if (parent === existing) break;
		missing.unshift(basename(existing));
		existing = parent;
	}
	const realExisting = realpathSync(existing);
	return { full: join(realExisting, ...missing), existing: realExisting };
}

function exists(path) {
	try {
		lstatSync(path);
		return true;
	} catch {
		return false;
	}
}

export function isTempPath(full) {
	return within(full, tmpdir()) || within(full, '/tmp');
}

// Strips quoted strings so that text like `grep "a > b"` is not read as a redirect or a command.
export function stripQuotes(command) {
	return command.replace(/'[^']*'/g, "''").replace(/"(?:\\.|[^"\\])*"/g, '""');
}

// Targets of output redirections (`>`, `>>`, `2>`, `&>`, `>|`), excluding fd duplications (`>&2`) and /dev/null.
export function redirectTargets(bare) {
	const targets = [];
	for (const match of bare.matchAll(/(?:^|[^<>&\d])(?:\d|&)?>>?\|?\s*([^\s;&|<>()]+)/g)) {
		const target = match[1];
		if (target.startsWith('&') || target === '/dev/null') continue;
		targets.push(target);
	}
	return targets;
}

const PREFIX_COMMANDS = ['sudo', 'env', 'command', 'time', 'nice', 'nohup', 'exec'];

// Splits a (quote-stripped) command line into simple commands, each as [name, args], with env assignments and
// wrapper commands such as `env` or `time` removed and the command name reduced to its basename.
export function simpleCommands(bare) {
	const commands = [];
	for (const segment of bare.split(/&&|\|\||[;|&\n`]|\$\(|\(|\)/)) {
		const words = segment.trim().split(/\s+/).filter(Boolean);
		while (words.length && (/^\w+=/.test(words[0]) || PREFIX_COMMANDS.includes(words[0]))) words.shift();
		if (!words.length) continue;
		commands.push([words[0].slice(words[0].lastIndexOf('/') + 1), words.slice(1)]);
	}
	return commands;
}

export const TOOLCHAIN = new Set(['npm', 'npx', 'yarn', 'turbo', 'vitest', 'biome', 'tsc', 'tsgo', 'knip', 'snyk', 'func', 'portless', 'husky', 'lint-staged', 'cucumber-js', 'docusaurus', 'rolldown', 'e18e', 'serenity-bdd']);
export const INTERPRETERS = new Set(['node', 'deno', 'bun', 'python', 'python3', 'perl', 'ruby', 'sh', 'bash', 'zsh', 'eval', 'source', '.', 'xargs', 'osascript']);
export const FILE_WRITERS = new Set(['rm', 'rmdir', 'mv', 'cp', 'touch', 'mkdir', 'chmod', 'chown', 'ln', 'truncate', 'dd', 'patch', 'install', 'tee', 'unzip', 'tar', 'rsync']);
export const PNPM_READ_ONLY = new Set(['ls', 'list', 'll', 'why', 'outdated', 'licenses', 'root', '--version', '-v', 'help']);
const GIT_READ_ONLY = new Set([
	'status',
	'log',
	'diff',
	'show',
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
	'name-rev',
	'help',
	'version',
	'check-ignore',
	'check-attr',
	'rev-list',
	'for-each-ref',
	'show-ref',
	'count-objects',
	'ls-remote',
	'whatchanged',
	'range-diff',
]);
const GIT_READ_ONLY_WITH_LIST = new Set(['branch', 'tag', 'remote', 'worktree', 'config']);
const MISE_READ_ONLY = new Set(['current', 'ls', 'list', 'which', 'where', 'doctor', 'version', '--version', 'env']);
// Flags that only print a version, per command. Short flags are listed only where they mean "version": `bash -v` runs piped
// input verbosely, `lint-staged -v` runs lint-staged, and `husky --version` installs hooks, so those are left out.
const VERSION_FLAGS = new Map(
	Object.entries({
		node: ['--version', '-v'],
		deno: ['--version', '-V'],
		bun: ['--version', '-v'],
		python: ['--version', '-V'],
		python3: ['--version', '-V'],
		perl: ['--version', '-v'],
		ruby: ['--version', '-v'],
		sh: ['--version'],
		bash: ['--version'],
		zsh: ['--version'],
		npm: ['--version', '-v'],
		npx: ['--version', '-v'],
		yarn: ['--version', '-v'],
		turbo: ['--version'],
		vitest: ['--version', '-v'],
		biome: ['--version'],
		tsc: ['--version', '-v'],
		tsgo: ['--version'],
		knip: ['--version', '-V'],
		snyk: ['--version'],
		func: ['--version'],
		portless: ['--version', '-v'],
		'lint-staged': ['--version', '-V'],
		'cucumber-js': ['--version'],
		docusaurus: ['--version'],
		rolldown: ['--version'],
	}),
);

// True when `name args` only prints a version.
export function isVersionCheck(name, args) {
	return args.length === 1 && VERSION_FLAGS.get(name)?.includes(args[0]);
}

// Null when the mise subcommand is read-only, otherwise a reason.
export function checkMiseReadOnly(args) {
	const [sub, next] = args;
	const readOnly = MISE_READ_ONLY.has(sub) || (sub === 'config' && ['ls', 'list'].includes(next)) || (sub === 'settings' && next === 'get') || (sub === 'trust' && next === '--show');
	return readOnly ? null : `\`mise ${args.join(' ')}\` installs tools, changes config, or runs commands (exec/run).`;
}

// Null when the git subcommand is read-only, otherwise a reason.
export function checkGitReadOnly(args) {
	let i = 0;
	while (i < args.length && args[i].startsWith('-')) i += ['-C', '-c', '--git-dir', '--work-tree'].includes(args[i]) ? 2 : 1;
	const sub = args[i];
	const rest = args.slice(i + 1);
	if (!sub || GIT_READ_ONLY.has(sub)) return null;
	if (sub === 'stash') return ['list', 'show'].includes(rest[0]) ? null : '`git stash` changes the working tree.';
	if (GIT_READ_ONLY_WITH_LIST.has(sub)) {
		const listing =
			rest.length === 0 ||
			rest.every((arg) => arg.startsWith('-') && !/^-(d|D|m|M|c|C|f|u)$|^--(delete|move|copy|force|set-upstream|unset)/.test(arg)) ||
			['list', 'show', 'get', '--list', '--get', '-l'].includes(rest[0]) ||
			(sub === 'remote' && rest[0] === '-v');
		return listing ? null : `\`git ${sub} ${rest.join(' ')}\` changes repository state.`;
	}
	return `\`git ${sub}\` changes repository state or the working tree.`;
}

// `sed -i` and `find -delete/-exec` write files even though the commands are usually read-only.
export function checkInPlaceEditors(name, args) {
	if (name === 'sed' && args.some((arg) => /^-[a-zA-Z]*i/.test(arg) || arg.startsWith('--in-place'))) return '`sed -i` edits files in place.';
	if (name === 'find' && args.some((arg) => ['-delete', '-exec', '-execdir', '-ok', '-okdir', '-fprint', '-fprintf', '-fls'].includes(arg))) {
		return '`find` with -delete/-exec can change files.';
	}
	return null;
}

// --- repository and worktree resolution ---------------------------------------------------------------------------

// Git toplevel and common dir (both with symlinks resolved) of the repository containing `dir`, or null.
export function gitInfo(dir) {
	try {
		const out = execFileSync('git', ['-C', dir, 'rev-parse', '--path-format=absolute', '--show-toplevel', '--git-common-dir'], {
			encoding: 'utf8',
			stdio: ['ignore', 'pipe', 'ignore'],
		});
		const [top, common] = out.trim().split('\n');
		return top && common ? { top: resolveExisting(top).full, common: resolveExisting(common).full } : null;
	} catch {
		return null;
	}
}

// Returns `repoRoot(existing)`: the root directory of the project's repository (main checkout or a linked worktree) that
// contains the existing path `existing`, or null. A worktree only counts when it shares the project's git common dir.
// When git is unavailable the project dir is used as the root.
export function createRepoRoot(projectDir) {
	let projectGit;
	return function repoRoot(existing) {
		const anchor = existsSync(existing) && !statSync(existing).isDirectory() ? dirname(existing) : existing;
		const target = gitInfo(anchor);
		projectGit ??= gitInfo(projectDir) ?? false;
		if (target && projectGit) return target.common === projectGit.common ? target.top : null;
		const root = resolveExisting(resolve(projectDir)).full;
		return within(anchor, root) ? root : null;
	};
}

// --- quote-aware shell parsing ------------------------------------------------------------------------------------

// Placeholder for the output of a command or process substitution inside a word. Its `$` marks the word as unverifiable.
export const SUBSTITUTION = '$(…)';
const KEYWORDS = new Set(['{', '}', '!', 'if', 'then', 'else', 'elif', 'fi', 'do', 'done', 'while', 'until', 'function']);

// Parses a command line into simple commands, following quotes, backslash escapes, command and process substitution
// (parsed recursively), subshells, and here-documents. Each command is { words, redirects }, where words have their
// quotes removed and redirects are { target, write } for file redirections (fd duplications are dropped). Best effort:
// this is not a full shell grammar (no case patterns, arithmetic, or alias expansion).
export function parseShell(source) {
	const commands = [];
	parseList(source, 0, null, commands);
	return commands;
}

function parseList(src, start, closer, commands) {
	let cmd = { words: [], redirects: [] };
	let word = null;
	let quoted = false;
	let pending = null; // redirect waiting for its target word
	const heredocs = [];

	const finishWord = () => {
		if (word === null) return;
		if (pending?.heredoc) heredocs.push({ delimiter: word, quoted, dash: pending.dash });
		else if (pending) {
			if (!(pending.dup && /^(\d+|-)$/.test(word)) && word !== '/dev/null') cmd.redirects.push({ target: word, write: pending.write });
		} else cmd.words.push(word);
		pending = null;
		word = null;
		quoted = false;
	};
	const finishCommand = () => {
		finishWord();
		if (cmd.words.length || cmd.redirects.length) commands.push(cmd);
		cmd = { words: [], redirects: [] };
	};
	const append = (text) => {
		word = (word ?? '') + text;
	};

	let i = start;
	while (i < src.length) {
		const c = src[i];
		const next = src[i + 1];
		if (closer && c === closer) {
			finishCommand();
			return i + 1;
		}
		if (c === ' ' || c === '\t') {
			finishWord();
			i++;
		} else if (c === '\n') {
			finishCommand();
			i++;
			while (heredocs.length) {
				const { delimiter, quoted: literal, dash } = heredocs.shift();
				const lines = [];
				let end = src.indexOf('\n', i);
				for (;;) {
					const line = src.slice(i, end === -1 ? src.length : end);
					i = end === -1 ? src.length : end + 1;
					if ((dash ? line.replace(/^\t+/, '') : line) === delimiter || end === -1) break;
					lines.push(line);
					end = src.indexOf('\n', i);
				}
				if (!literal) readDouble(`${lines.join('\n')}`, 0, false, commands);
			}
		} else if (c === '#' && word === null) {
			while (i < src.length && src[i] !== '\n') i++;
		} else if (c === '\\') {
			if (next !== '\n') append(next ?? '');
			quoted = true;
			i += 2;
		} else if (c === "'") {
			const end = src.indexOf("'", i + 1);
			append(src.slice(i + 1, end === -1 ? src.length : end));
			quoted = true;
			i = end === -1 ? src.length : end + 1;
		} else if (c === '"') {
			const { value, end } = readDouble(src, i + 1, true, commands);
			append(value);
			quoted = true;
			i = end;
		} else if (c === '$' && next === '(') {
			i = parseList(src, i + 2, ')', commands);
			append(SUBSTITUTION);
		} else if (c === '`') {
			i = parseList(src, i + 1, '`', commands);
			append(SUBSTITUTION);
		} else if ((c === '<' || c === '>') && next === '(') {
			finishWord();
			i = parseList(src, i + 2, ')', commands);
			cmd.words.push(SUBSTITUTION);
		} else if (c === '(') {
			finishCommand();
			i = parseList(src, i + 1, ')', commands);
		} else if (c === ')') {
			finishCommand();
			i++;
		} else if (c === '&' && next === '>') {
			finishWord();
			const append2 = src[i + 2] === '>';
			pending = { write: true };
			i += append2 ? 3 : 2;
		} else if (c === ';' || c === '&' || c === '|') {
			finishCommand();
			i += next === c || (c === '|' && next === '&') ? 2 : 1;
		} else if (c === '>' || c === '<') {
			if (word !== null && !quoted && /^\d+$/.test(word))
				word = null; // fd number, as in 2>
			else finishWord();
			if (c === '<' && next === '<' && src[i + 2] === '<') {
				pending = { write: false };
				i += 3;
			} else if (c === '<' && next === '<') {
				const dash = src[i + 2] === '-';
				pending = { heredoc: true, dash };
				i += dash ? 3 : 2;
			} else if (c === '<' && next === '>') {
				pending = { write: true };
				i += 2;
			} else if (c === '<') {
				pending = { write: false, dup: next === '&' };
				i += next === '&' ? 2 : 1;
			} else if (next === '&') {
				pending = { write: true, dup: true };
				i += 2;
			} else {
				pending = { write: true };
				i += next === '>' || next === '|' ? 2 : 1;
			}
		} else {
			append(c);
			i++;
		}
	}
	finishCommand();
	return i;
}

// Reads the body of a double-quoted string (or an unquoted here-document when `untilQuote` is false), parsing command
// substitutions into `commands`. Returns the expanded text (substitutions replaced by SUBSTITUTION) and the end index.
function readDouble(src, start, untilQuote, commands) {
	let value = '';
	let i = start;
	while (i < src.length) {
		const c = src[i];
		if (untilQuote && c === '"') return { value, end: i + 1 };
		if (c === '\\' && i + 1 < src.length) {
			const next = src[i + 1];
			value += '$`"\\\n'.includes(next) ? (next === '\n' ? '' : next) : `\\${next}`;
			i += 2;
		} else if (c === '$' && src[i + 1] === '(') {
			i = parseList(src, i + 2, ')', commands);
			value += SUBSTITUTION;
		} else if (c === '`') {
			i = parseList(src, i + 1, '`', commands);
			value += SUBSTITUTION;
		} else {
			value += c;
			i++;
		}
	}
	return { value, end: i };
}

const WRAPPERS = new Set(['sudo', 'env', 'command', 'builtin', 'time', 'nice', 'nohup', 'exec', 'timeout', 'stdbuf', 'caffeinate']);

// Splits a parsed command's words into [name, args]: drops env assignments, shell keywords, and wrapper commands (with
// their options, and the duration for `timeout`), and reduces the command name to its basename. Null when nothing runs.
export function commandWords(words) {
	const rest = [...words];
	for (;;) {
		if (rest.length && (/^[A-Za-z_]\w*=/.test(rest[0]) || KEYWORDS.has(rest[0]))) rest.shift();
		else if (rest.length && WRAPPERS.has(rest[0])) {
			const wrapper = rest.shift();
			while (rest.length && (rest[0].startsWith('-') || (wrapper === 'env' && /^[A-Za-z_]\w*=/.test(rest[0])))) {
				const flag = rest.shift();
				if ((wrapper === 'nice' && flag === '-n') || (wrapper === 'env' && ['-u', '-C', '-S'].includes(flag)) || (wrapper === 'timeout' && ['-s', '-k'].includes(flag))) rest.shift();
			}
			if (wrapper === 'timeout' && rest.length) rest.shift();
		} else break;
	}
	if (!rest.length) return null;
	return [rest[0].slice(rest[0].lastIndexOf('/') + 1), rest.slice(1)];
}

// --- path rules shared by several guards --------------------------------------------------------------------------

// Rationale notes (.agents-work/ of the project or of the repository/worktree holding the path) and the system temp dir.
// `resolved` is a resolveExisting() result; `repoRoot` comes from createRepoRoot().
export function isNotesOrTempPath({ full, existing }, projectDir, repoRoot) {
	if (isTempPath(full) || within(full, resolve(projectDir, '.agents-work'))) return true;
	const root = repoRoot(existing);
	return Boolean(root) && within(full, resolve(root, '.agents-work'));
}

// Test files the unit tester owns, by path relative to the repository root:
//   colocated *.test.ts and features/*.feature under packages/axc/<pkg>/src/ and apps/<app>/src/ (not src/**/tests/integration/),
//   *.test.ts under packages/axc-verification/archunit-tests/src/,
//   *.test.ts under packages/axc/<pkg>/tests/integration/ and apps/<app>/tests/integration/,
//   acceptance tests: *.feature under packages/axc-verification/acceptance-api/src/features/ and *.ts under its
//   src/step-definitions/ (not the harness: world.ts, serenity.ts, infrastructure.ts, cucumber.yaml, package.json, config).
// Never node_modules/ or dist/, or packages/cellix/.
export function isUnitTesterTestPath(rel) {
	const parts = rel.split(sep);
	if (parts.some((part) => part === 'node_modules' || part === 'dist')) return false;
	const name = parts.at(-1);
	const testFile = /^.+\.test\.ts$/.test(name);
	const colocated = (parts[0] === 'packages' && parts[1] === 'axc' && parts[3] === 'src' && parts.length > 4) || (parts[0] === 'apps' && parts[2] === 'src' && parts.length > 3);
	if (colocated) {
		if (parts.some((part, i) => part === 'tests' && parts[i + 1] === 'integration')) return false;
		return testFile || (/^.+\.feature$/.test(name) && parts.at(-2) === 'features');
	}
	const archunit = parts[0] === 'packages' && parts[1] === 'axc-verification' && parts[2] === 'archunit-tests' && parts[3] === 'src' && parts.length > 4;
	const integration =
		(parts[0] === 'packages' && parts[1] === 'axc' && parts[3] === 'tests' && parts[4] === 'integration' && parts.length > 5) || (parts[0] === 'apps' && parts[2] === 'tests' && parts[3] === 'integration' && parts.length > 4);
	if (isAcceptanceTestPath(parts)) return true;
	return (archunit || integration) && testFile;
}

// Acceptance features and step definitions, given the path's segments relative to the repository root.
export function isAcceptanceTestPath(parts) {
	if (!(parts[0] === 'packages' && parts[1] === 'axc-verification' && parts[2] === 'acceptance-api' && parts[3] === 'src' && parts.length > 5)) return false;
	const name = parts.at(-1);
	return (parts[4] === 'features' && /^.+\.feature$/.test(name)) || (parts[4] === 'step-definitions' && /^.+\.ts$/.test(name));
}

// --- working directory tracking and branch commands ---------------------------------------------------------------

// Glob or brace-expansion characters in a shell word.
export const SHELL_GLOB = /[*?[\]]|\{[^}]*(,|\.\.)[^}]*\}/;

// Expands a leading `~`.
export function expandHome(path) {
	return path === '~' || path.startsWith('~/') ? homedir() + path.slice(1) : path;
}

// Records a `cd`/`pushd` in `cwds` ({ list, unknown }): every directory the command line may now be in is kept in `list`,
// and `unknown` becomes a reason string when the target cannot be resolved.
export function trackCd(args, cwds) {
	const target = args.filter((arg) => !arg.startsWith('-') || arg === '-')[0] ?? '~';
	if (target === '-' || target.includes('$') || SHELL_GLOB.test(target)) cwds.unknown = `the working directory is unknown after \`cd ${target}\`; use an absolute path.`;
	else cwds.list = [...new Set([...cwds.list, ...cwds.list.map((cwd) => resolve(cwd, expandHome(target)))])];
}

function statExists(path) {
	try {
		statSync(path);
		return true;
	} catch {
		return false;
	}
}

// True when `git checkout <rest>` may touch working-tree files rather than only switch or create a branch. Allowed:
// `git checkout <branch>`, `-`, `-b/-B/--orphan <new> [<start>]`, `--detach`. Denied: `--`, -f/-p/-m/--ours/--theirs/
// --overlay/--pathspec-from-file, more names than that, and a name that exists as a path (or cannot be resolved).
export function gitCheckoutTouchesFiles(rest, cwds) {
	if (rest.includes('--') || rest.some((arg) => /^(-f|--force|-p|--patch|-m|--merge|--ours|--theirs|--pathspec-from-file(=.*)?|--overlay|--no-overlay)$/.test(arg))) return true;
	const names = rest.filter((arg) => !arg.startsWith('-'));
	const create = rest.some((arg) => ['-b', '-B', '--orphan'].includes(arg));
	if (names.length > (create ? 2 : 1)) return true;
	if (create || names.length === 0) return false;
	const name = names[0];
	if (name.includes('$') || SHELL_GLOB.test(name) || cwds.unknown) return true;
	return cwds.list.some((cwd) => statExists(resolve(cwd, name)));
}
