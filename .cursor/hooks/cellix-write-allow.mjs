#!/usr/bin/env node
// Cursor runs this before a file edit (preToolUse) and before a shell command (beforeShellExecution).
// Stdout is one JSON line: {"permission":"allow"} or {"permission":"deny","user_message","agent_message"}.
// The rules are packages/cellix/guardrails/src/write/decide.mjs. This file only reads Cursor's payload.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { agentIdFromEnv, decidePath, decideShell, loadSession, policyFromConfig } from '../../packages/cellix/guardrails/src/index.mjs';

const payload = readPayload();
const workspace = typeof payload.cwd === 'string' && payload.cwd ? payload.cwd : process.cwd();
const policy = policyFromConfig(readAgentAccess(workspace), readSession(workspace));
const toolInput = toolInputObject(payload.tool_input);
const toolName = String(payload.tool_name ?? payload.toolName ?? '');
const command = String(payload.command ?? toolInput.command ?? '');

if (command && (!toolName || toolName === 'Shell')) {
	reply(decideShell(command, workspace, policy));
}

const editedPaths = pathsInToolInput(toolInput, payload);
if (isFileEdit(toolName) && editedPaths.length === 0) reply(deny('Refusing a write whose path could not be read.'));
for (const file of editedPaths) {
	const decision = decidePath(file, workspace, policy);
	if (!decision.ok) reply(decision);
}
reply(allow());

function readPayload() {
	try {
		return JSON.parse(readFileSync(0, 'utf8') || '{}');
	} catch {
		reply(deny('Refusing a write because the hook payload was not JSON.'));
	}
}

function readSession(workspace) {
	try {
		const agentId = agentIdFromEnv();
		return agentId ? loadSession(workspace, agentId) : null;
	} catch (error) {
		reply(deny(error instanceof Error ? error.message : 'CELLIX_AGENT_ID is invalid.'));
	}
}

function readAgentAccess(workspace) {
	try {
		return JSON.parse(readFileSync(path.join(workspace, 'ocom-write.config.json'), 'utf8'));
	} catch {
		return {};
	}
}

function isFileEdit(toolName) {
	return /write|strreplace|delete|edit|patch|notebook/i.test(toolName);
}

function toolInputObject(value) {
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

function pathsInToolInput(toolInput, payload) {
	const found = [];
	const visit = (value) => {
		if (!value || typeof value !== 'object') return;
		for (const [key, entry] of Object.entries(value)) {
			if (typeof entry === 'string' && /path|file|target|notebook/i.test(key) && !entry.includes('\n') && entry.length < 500) found.push(entry);
			else if (entry && typeof entry === 'object') visit(entry);
		}
	};
	visit(toolInput);
	if (typeof payload.file_path === 'string') found.push(payload.file_path);
	return found;
}

function allow() {
	return { ok: true, message: '' };
}

function deny(message) {
	return { ok: false, message };
}

function reply(decision) {
	if (decision.ok) {
		process.stdout.write(`${JSON.stringify({ permission: 'allow' })}\n`);
		process.exit(0);
	}
	process.stdout.write(`${JSON.stringify({ permission: 'deny', user_message: decision.message, agent_message: decision.message })}\n`);
	process.exit(0);
}
