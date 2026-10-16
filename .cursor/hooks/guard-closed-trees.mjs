#!/usr/bin/env node

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { isAbsolute, relative, resolve, sep } from 'node:path';

const CLOSED_TREES = ['node_modules', 'packages/cellix'];
const INSPECTION_COMMAND = /(?:^|[;&|]\s*|\s)(?:cat|less|more|head|tail|sed|awk|rg|grep|find|ls|stat|readlink|wc|tree)(?:\s|$)/;

try {
	const input = await readInput();
	const blockedReference = findBlockedReference(input);

	if (blockedReference === undefined || latestCheckNames(blockedReference, input.cwd)) {
		allow();
	} else {
		deny(`Inspection of ${blockedReference} is closed by the repository harness. Use the agent-check error block first; open this path only when the newest agent-check log names it.`);
	}
} catch {
	// Hook defects must not turn a scored run into a human intervention.
	allow();
}

async function readInput() {
	let value = '';
	for await (const chunk of process.stdin) {
		value += chunk;
	}
	return JSON.parse(value);
}

function findBlockedReference(input) {
	const toolName = input.tool_name;
	const toolInput = input.tool_input ?? {};

	if (toolName === 'Read') {
		return closedPath(toolInput.path ?? toolInput.file_path, input.cwd);
	}

	if (toolName === 'Grep') {
		for (const value of [toolInput.path, toolInput.glob]) {
			const blocked = closedPath(value, input.cwd);
			if (blocked !== undefined) {
				return blocked;
			}
		}
		return undefined;
	}

	if (toolName === 'Glob') {
		for (const value of [toolInput.target_directory, toolInput.glob_pattern]) {
			const blocked = closedPath(value, input.cwd);
			if (blocked !== undefined) {
				return blocked;
			}
		}
		return undefined;
	}

	if (toolName === 'Shell') {
		const command = toolInput.command;
		if (typeof command !== 'string' || !INSPECTION_COMMAND.test(command)) {
			return undefined;
		}
		return closedReferenceInText(command);
	}

	return undefined;
}

function closedPath(value, cwd) {
	if (typeof value !== 'string') {
		return undefined;
	}

	const normalized = value.replaceAll('\\', '/');
	const absolute = isAbsolute(value) ? value : resolve(cwd ?? process.cwd(), value);
	const relativePath = relative(cwd ?? process.cwd(), absolute)
		.split(sep)
		.join('/');

	return closedReferenceInText(relativePath) ?? closedReferenceInText(normalized);
}

function closedReferenceInText(value) {
	for (const tree of CLOSED_TREES) {
		const index = value.indexOf(tree);
		if (index === -1) {
			continue;
		}

		const before = value[index - 1];
		const after = value[index + tree.length];
		const startsAtBoundary = before === undefined || /[/\s"'`=:(]/.test(before);
		const endsAtBoundary = after === undefined || /[/\s"'`),;&|]/.test(after);
		if (!startsAtBoundary || !endsAtBoundary) {
			continue;
		}

		const suffix = value
			.slice(index)
			.split(/[\s"'`),;&|]/, 1)[0]
			.replace(/\/+$/, '');
		return suffix;
	}
	return undefined;
}

function latestCheckNames(blockedReference, cwd) {
	if (!blockedReference.includes('/')) {
		return false;
	}

	const logPath = newestCheckLog();
	if (logPath === undefined) {
		return false;
	}

	const log = readFileSync(logPath, 'utf8').replaceAll('\\', '/');
	const absolute = resolve(cwd ?? process.cwd(), blockedReference).replaceAll('\\', '/');
	return log.includes(blockedReference) || log.includes(absolute);
}

function newestCheckLog() {
	let newest;
	for (const entry of readdirSync(tmpdir(), { withFileTypes: true })) {
		if (!entry.isDirectory() || !entry.name.startsWith('axc-agent-check-')) {
			continue;
		}
		const path = resolve(tmpdir(), entry.name, 'command.log');
		try {
			const modified = statSync(path).mtimeMs;
			if (newest === undefined || modified > newest.modified) {
				newest = { path, modified };
			}
		} catch {
			// Ignore incomplete or already-removed check directories.
		}
	}
	return newest?.path;
}

function allow() {
	console.log(JSON.stringify({ permission: 'allow' }));
}

function deny(message) {
	console.log(
		JSON.stringify({
			permission: 'deny',
			user_message: message,
			agent_message: message,
		}),
	);
}
