// Understands what a tool call is about to do to the working tree: which
// files an apply_patch or shell command writes, and which shell commands it
// runs. Shell parsing is deliberately simple (split on separators, look for
// redirections and well-known writing utilities) - it only needs to be good
// enough that writing a file through the shell is not an invisible bypass of
// the Edit/Write hooks.
import { isAbsolute, relative, resolve } from 'node:path';

const PATCH_FILE_HEADER_PATTERN = /^\*\*\* (?:Add File|Update File|Move to|Delete File): (.+)$/gm;
const COMMAND_SEPARATOR_PATTERN = /\s*(?:&&|\|\||;|\|)\s*|\n+/;
const REDIRECTION_PATTERN = /(?:^|\s)\d?>{1,2}\s*(?:\|)?\s*("[^"]+"|'[^']+'|[^\s;&|]+)/g;
const WRITING_UTILITIES = new Set(['tee', 'touch', 'rm', 'mv', 'cp', 'sed', 'truncate', 'install', 'dd', 'ln']);
const ENV_ASSIGNMENT_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*=\S*$/;

export function extractCommandText(toolInput) {
	if (typeof toolInput === 'string') {
		return toolInput;
	}
	if (toolInput && typeof toolInput === 'object') {
		if (typeof toolInput.command === 'string') {
			return toolInput.command;
		}
		if (Array.isArray(toolInput.command)) {
			return toolInput.command.map(String).join(' ');
		}
		if (typeof toolInput.cmd === 'string') {
			return toolInput.cmd;
		}
	}
	return '';
}

export function isApplyPatch(commandText) {
	return /^\s*(?:apply_patch\b|\*\*\* Begin Patch)/.test(commandText);
}

export function patchTargets(patchText) {
	const targets = [];
	for (const match of patchText.matchAll(PATCH_FILE_HEADER_PATTERN)) {
		targets.push(match[1].trim());
	}
	return targets;
}

function unquote(token) {
	if ((token.startsWith('"') && token.endsWith('"')) || (token.startsWith("'") && token.endsWith("'"))) {
		return token.slice(1, -1);
	}
	return token;
}

function tokenize(segment) {
	return (segment.match(/"[^"]*"|'[^']*'|\S+/g) ?? []).map(unquote);
}

export function unwrapShell(commandText) {
	// `bash -lc "<script>"` or `sh -c '<script>'` wrappers: look at the script.
	const match = /^\s*(?:\/bin\/)?(?:ba|z)?sh\s+-(?:l?c|cl)\s+(["'])([\s\S]*)\1\s*$/.exec(commandText);
	return match ? match[2] : commandText;
}

export function splitCommands(commandText) {
	return unwrapShell(commandText)
		.split(COMMAND_SEPARATOR_PATTERN)
		.map((segment) => segment.trim())
		.filter((segment) => segment !== '');
}

const SUBCOMMAND_TOOLS = new Set(['pnpm', 'npm', 'yarn', 'bun', 'git']);

export function commandWords(segment) {
	const words = tokenize(segment);
	while (words.length > 0 && (ENV_ASSIGNMENT_PATTERN.test(words[0]) || words[0] === 'sudo' || words[0] === 'env')) {
		words.shift();
	}
	// `pnpm -w add x` / `git -C dir commit`: keep the tool, drop global flags
	// (and their values for -C/--filter) so words[1] is the subcommand.
	if (words.length > 0 && SUBCOMMAND_TOOLS.has(words[0])) {
		const normalized = [words[0]];
		let index = 1;
		while (index < words.length && words[index].startsWith('-')) {
			if (['-C', '--filter', '-F', '--dir', '--git-dir', '--work-tree'].includes(words[index])) {
				index += 1;
			}
			index += 1;
		}
		normalized.push(...words.slice(index));
		return normalized;
	}
	return words;
}

function utilityTargets(words) {
	const [utility, ...rest] = words;
	const operands = rest.filter((word) => !word.startsWith('-'));
	switch (utility) {
		case 'tee':
		case 'touch':
		case 'rm':
		case 'truncate':
			return operands;
		case 'mv':
		case 'cp':
		case 'ln':
			return operands;
		case 'install':
			return operands.slice(-1);
		case 'sed':
			return rest.some((word) => /^-[a-zA-Z]*i/.test(word)) ? operands.filter((word) => word !== '').slice(1) : [];
		case 'dd':
			return rest.filter((word) => word.startsWith('of=')).map((word) => word.slice(3));
		default:
			return [];
	}
}

export function shellWriteTargets(commandText) {
	const targets = [];
	for (const segment of splitCommands(commandText)) {
		for (const match of segment.matchAll(REDIRECTION_PATTERN)) {
			const target = unquote(match[1]);
			if (target !== '/dev/null' && !target.startsWith('&')) {
				targets.push(target);
			}
		}
		const words = commandWords(segment);
		if (words.length > 0 && WRITING_UTILITIES.has(words[0])) {
			targets.push(...utilityTargets(words));
		}
	}
	return targets;
}

export function writeTargets(toolInput) {
	const commandText = extractCommandText(toolInput);
	if (commandText === '') {
		return typeof toolInput?.file_path === 'string' ? [toolInput.file_path] : [];
	}
	return isApplyPatch(commandText) ? patchTargets(commandText) : shellWriteTargets(commandText);
}

export function toRepositoryPath(target, cwd, root) {
	const absolutePath = isAbsolute(target) ? target : resolve(cwd, target);
	const repositoryPath = relative(root, absolutePath);
	if (repositoryPath.startsWith('..') || isAbsolute(repositoryPath)) {
		return undefined;
	}
	return repositoryPath.split('\\').join('/');
}
