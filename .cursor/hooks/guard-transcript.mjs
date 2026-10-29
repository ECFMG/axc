#!/usr/bin/env node
// Keeps whole-tree searches and fat command logs out of an agent transcript.
// A check failure may still name one closed file. That file can be opened.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';
import { agentIdFromEnv, decideRead, ensureStartupSession, loadSession, policyFromConfig } from '../../packages/cellix/guardrails/src/index.mjs';
import { broadGlobReason, closedReferenceInText, heavyCommandReason, logAllowsPath, OPEN_ROOTS, READ_BEFORE_SLICE, searchBeforeSessionReason, wideShellReason } from '../../scripts/check-budget.mjs';

try {
	const input = await readPayload();
	const command = shellCommand(input);
	const heavy = command === undefined ? undefined : heavyCommandReason(command);
	const wide = command === undefined ? undefined : wideShellReason(command);
	if (heavy !== undefined) deny(heavy, input.hook_event_name);
	else if (wide !== undefined) deny(wide, input.hook_event_name);
	else {
		const broad = broadPattern(input);
		if (broad !== undefined) deny(broad, input.hook_event_name);
		else {
			const blocked = findBlockedReference(input);
			const cwd = input.cwd ?? input.workspace_roots?.[0];
			if (blocked !== undefined && !logNames(blocked, cwd)) deny(`Inspection of ${blocked} is closed. Use the agent-check error block first. Open this path only when that log names the file.`, input.hook_event_name);
			else {
				const readBlock = readDenial(input, cwd);
				if (readBlock !== undefined) deny(readBlock, input.hook_event_name);
				else allow();
			}
		}
	}
} catch {
	allow();
}

async function readPayload() {
	let value = '';
	for await (const chunk of process.stdin) value += chunk;
	return JSON.parse(value || '{}');
}

function broadPattern(input) {
	const toolName = input.tool_name ?? input.toolName;
	if (toolName !== 'Glob') return undefined;
	for (const value of collectStrings(parseToolInput(input.tool_input))) {
		const reason = broadGlobReason(value);
		if (reason !== undefined) return reason;
	}
	return undefined;
}

function shellCommand(input) {
	if (typeof input.command === 'string') return input.command;
	const toolInput = parseToolInput(input.tool_input);
	return typeof toolInput.command === 'string' ? toolInput.command : undefined;
}

function findBlockedReference(input) {
	const cwd = input.cwd ?? input.workspace_roots?.[0];
	if (input.tool_name === undefined && input.toolName === undefined && typeof input.file_path === 'string') return closedPath(input.file_path, cwd);
	if (input.tool_name === undefined && input.toolName === undefined && typeof input.command === 'string') return inspectionTarget(input.command);
	const toolName = input.tool_name ?? input.toolName;
	const toolInput = parseToolInput(input.tool_input);
	if (toolName === 'Read') return closedPath(toolInput.path ?? toolInput.file_path ?? toolInput.target_file, cwd);
	if (toolName === 'Shell') {
		for (const value of collectStrings(toolInput)) {
			const blocked = inspectionTarget(value);
			if (blocked !== undefined) return blocked;
		}
	}
	if (toolName === 'Grep' || toolName === 'Glob') {
		for (const value of pathLikeValues(toolInput)) {
			const blocked = closedPath(value, cwd);
			if (blocked !== undefined) return blocked;
		}
	}
	return undefined;
}

function inspectionTarget(command) {
	if (typeof command !== 'string') return undefined;
	return closedReferenceInText(commandTextForPaths(command));
}

/** Heredoc bodies and quoted text that is not a path are file contents, not a tree to open. */
function commandTextForPaths(command) {
	const withoutHeredoc = command.replace(/<<-?\s*['"]?(\w+)['"]?[\s\S]*?\n\1\b/g, ' ');
	const dropQuotedText = (match) => (match.includes('/') ? match : ' ');
	return withoutHeredoc.replace(/"(?:\\.|[^"\\])*"/g, dropQuotedText).replace(/'(?:\\.|[^'\\])*'/g, dropQuotedText);
}

function closedPath(value, cwd) {
	if (typeof value !== 'string') return undefined;
	const absolute = isAbsolute(value) ? value : resolve(cwd ?? process.cwd(), value);
	const relativePath = relative(cwd ?? process.cwd(), absolute)
		.split(sep)
		.join('/');
	return closedReferenceInText(relativePath) ?? closedReferenceInText(value.replaceAll('\\', '/'));
}

function readDenial(input, cwd) {
	const workspace = cwd ?? process.cwd();
	let config;
	try {
		config = JSON.parse(readFileSync(join(workspace, 'ocom-write.config.json'), 'utf8'));
	} catch {
		return undefined;
	}
	if (!config?.read) return undefined;
	let session = null;
	let agentId = '';
	try {
		agentId = agentIdFromEnv();
		session = agentId ? loadSession(workspace, agentId) : null;
		if (agentId && !session) session = ensureStartupSession(workspace, agentId);
	} catch (error) {
		return error instanceof Error ? error.message : 'CELLIX_AGENT_ID is invalid.';
	}
	const policy = policyFromConfig(config, session);
	const beforeSession = isSearch(input) ? searchBeforeSessionReason(agentId, session) : undefined;
	if (beforeSession !== undefined) return beforeSession;
	if (searchWithoutRoot(input, workspace)) return `Name a directory on the read list. Open ${OPEN_ROOTS}. A search with no path reads the whole tree.`;
	const write = session?.write ?? session?.files ?? [];
	const waitingForQuery = agentId !== '' && Array.isArray(write) && write.length === 0;
	for (const candidate of readCandidates(input, workspace)) {
		const decision = decideRead(candidate, workspace, policy);
		if (!decision.ok && !logNames(candidate, workspace)) return waitingForQuery && decision.message.includes('read session') ? READ_BEFORE_SLICE : decision.message;
	}
	return undefined;
}

function isSearch(input) {
	const toolName = input.tool_name ?? input.toolName;
	if (toolName === 'Grep' || toolName === 'Glob') return true;
	const command = shellCommand(input);
	if (command === undefined || !/\b(?:rg|grep)\b/.test(command)) return false;
	const pipe = command.indexOf('|');
	const searchAt = command.search(/\b(?:rg|grep)\b/);
	return !(pipe !== -1 && searchAt > pipe);
}

function searchWithoutRoot(input, workspace) {
	const toolName = input.tool_name ?? input.toolName;
	if (toolName === 'Grep') return grepRoots(input, workspace).length === 0;
	const command = shellCommand(input);
	if (command !== undefined && /\b(?:rg|grep)\b/.test(command)) {
		const pipe = command.indexOf('|');
		const searchAt = command.search(/\b(?:rg|grep)\b/);
		if (pipe !== -1 && searchAt > pipe) return false;
		return !command.split(/\s+/).some((token) => !isPackageName(token) && (token.includes('/') || token.includes('\\')));
	}
	return false;
}

function grepRoots(input, workspace) {
	const keyed = [];
	collectLocations(parseToolInput(input.tool_input), '', keyed);
	collectLocations(parseToolInput(input.arguments), '', keyed);
	const roots = keyed.filter((value) => isSearchRoot(value, workspace));
	if (roots.length > 0) return roots;
	return collectStrings(parseToolInput(input.tool_input)).filter((value) => isSearchRoot(value, workspace));
}

function collectLocations(value, key, found) {
	if (/^(cwd|workspace_roots|workspace_root|hook_event_name|tool_name|toolName|command|conversation_id|generation_id|model|pattern)$/i.test(key)) return;
	if (typeof value === 'string') {
		if (/path|dir|directory|file|glob|target|folder|uri/i.test(key)) found.push(value);
		return;
	}
	if (Array.isArray(value)) {
		for (const item of value) collectLocations(item, key, found);
		return;
	}
	if (value !== null && typeof value === 'object') {
		for (const [childKey, child] of Object.entries(value)) collectLocations(child, childKey, found);
	}
}

function isPackageName(value) {
	return /^@[A-Za-z0-9][A-Za-z0-9._-]*\/[A-Za-z0-9][A-Za-z0-9._-]*$/.test(value);
}

function isSearchRoot(value, workspace) {
	if (typeof value !== 'string' || value.length === 0 || value.length > 500 || value.includes('\n') || value.includes('*') || isPackageName(value)) return false;
	if (resolve(workspace, value) === resolve(workspace)) return false;
	return value.includes('/') || value.includes('\\') || fileExists(workspace, value);
}

function readCandidates(input, workspace) {
	const found = [];
	if (typeof input.file_path === 'string') found.push(input.file_path);
	const toolName = input.tool_name ?? input.toolName;
	const toolInput = parseToolInput(input.tool_input);
	if (toolName === 'Read') {
		const value = toolInput.path ?? toolInput.file_path ?? toolInput.target_file;
		if (typeof value === 'string') found.push(value);
	} else if (toolName === 'Grep') {
		found.push(...grepRoots(input, workspace));
	} else if (toolName === 'Glob') {
		if (typeof toolInput.target_directory === 'string') found.push(toolInput.target_directory);
		if (typeof toolInput.glob_pattern === 'string') found.push(toolInput.glob_pattern);
	} else if (toolName === 'Shell' || typeof input.command === 'string') {
		found.push(...shellReadPaths(shellCommand(input) ?? '', workspace));
	}
	return found;
}

function shellReadPaths(command, workspace) {
	const found = [];
	for (const token of command.split(/\s+/)) {
		const cleaned = token.replace(/^['"`]+|['"`]+$/g, '').replace(/[;,]+$/g, '');
		const pathToken = cleaned.includes('>') ? cleaned.slice(cleaned.lastIndexOf('>') + 1) : cleaned;
		if (!pathToken || pathToken.startsWith('-') || pathToken.includes('$') || pathToken.includes('*') || isPackageName(pathToken)) continue;
		if (pathToken.includes('/') || pathToken.includes('\\') || pathToken.includes('.') || fileExists(workspace, pathToken)) found.push(pathToken);
	}
	return found;
}

function fileExists(workspace, token) {
	if (token.includes('..')) return false;
	try {
		statSync(join(workspace, token));
		return true;
	} catch {
		return false;
	}
}

function logNames(blockedReference, cwd) {
	const logPath = newestCheckLog();
	if (logPath === undefined) return false;
	const log = readFileSync(logPath, 'utf8').replaceAll('\\', '/');
	const absolute = resolve(cwd ?? process.cwd(), blockedReference).replaceAll('\\', '/');
	return logAllowsPath(log, blockedReference) || logAllowsPath(log, absolute);
}

function newestCheckLog() {
	let newest;
	for (const entry of readdirSync(tmpdir(), { withFileTypes: true })) {
		if (!entry.isDirectory() || !entry.name.startsWith('cellix-agent-check-')) continue;
		const path = resolve(tmpdir(), entry.name, 'command.log');
		try {
			const modified = statSync(path).mtimeMs;
			if (newest === undefined || modified > newest.modified) newest = { path, modified };
		} catch {
			// An unfinished check has no log yet.
		}
	}
	return newest?.path;
}

function pathLikeValues(value) {
	const found = [];
	collectPathValues(value, '', found);
	return found;
}

function collectPathValues(value, key, found) {
	if (/^(pattern|command|cwd|workspace_roots|workspace_root|hook_event_name|tool_name|toolName|conversation_id|generation_id|model)$/i.test(key)) return;
	if (typeof value === 'string') {
		if (/path|dir|directory|file|glob|target|folder|uri/i.test(key)) found.push(value);
		return;
	}
	if (Array.isArray(value)) {
		for (const item of value) collectPathValues(item, key, found);
		return;
	}
	if (value !== null && typeof value === 'object') {
		for (const [childKey, child] of Object.entries(value)) collectPathValues(child, childKey, found);
	}
}

function collectStrings(value, result = []) {
	if (typeof value === 'string') result.push(value);
	else if (Array.isArray(value)) {
		for (const item of value) collectStrings(item, result);
	} else if (value !== null && typeof value === 'object') {
		for (const item of Object.values(value)) collectStrings(item, result);
	}
	return result;
}

function parseToolInput(value) {
	if (typeof value === 'string') {
		try {
			const parsed = JSON.parse(value);
			return parsed && typeof parsed === 'object' ? parsed : {};
		} catch {
			return {};
		}
	}
	return value && typeof value === 'object' ? value : {};
}

function allow() {
	process.stdout.write(`${JSON.stringify({ permission: 'allow' })}\n`);
	process.exit(0);
}

function deny(message, eventName) {
	const output = { permission: 'deny', user_message: message };
	if (eventName !== 'beforeReadFile') output.agent_message = message;
	process.stdout.write(`${JSON.stringify(output)}\n`);
	process.exit(0);
}
