#!/usr/bin/env node
// Keeps whole-tree searches and fat command logs out of an agent transcript.
// A check failure may still name one closed file. That file can be opened.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import { broadGlobReason, closedReferenceInText, heavyCommandReason, logAllowsPath, wideShellReason } from '../../scripts/check-budget.mjs';

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
			if (blocked === undefined || logNames(blocked, cwd)) allow();
			else deny(`Inspection of ${blocked} is closed. Use the agent-check error block first. Open this path only when that log names the file.`, input.hook_event_name);
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
	if (toolName === 'Grep' || toolName === 'Glob' || toolName === 'Shell') {
		for (const value of collectStrings(toolInput)) {
			const blocked = toolName === 'Shell' ? inspectionTarget(value) : closedPath(value, cwd);
			if (blocked !== undefined) return blocked;
		}
	}
	return undefined;
}

function inspectionTarget(command) {
	if (typeof command !== 'string') return undefined;
	return closedReferenceInText(command);
}

function closedPath(value, cwd) {
	if (typeof value !== 'string') return undefined;
	const absolute = isAbsolute(value) ? value : resolve(cwd ?? process.cwd(), value);
	const relativePath = relative(cwd ?? process.cwd(), absolute)
		.split(sep)
		.join('/');
	return closedReferenceInText(relativePath) ?? closedReferenceInText(value.replaceAll('\\', '/'));
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
