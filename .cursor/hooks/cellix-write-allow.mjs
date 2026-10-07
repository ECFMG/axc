#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { decidePath, decideShell, policyFromConfig } from './cellix-write-policy.mjs';

let input = {};
try {
	input = JSON.parse(readFileSync(0, 'utf8') || '{}');
} catch {
	deny('Refusing a write because the hook payload was not JSON.');
}

const root = typeof input.cwd === 'string' && input.cwd ? input.cwd : process.cwd();
const policy = policyFromConfig(loadConfig(root));
const toolInput = parseToolInput(input.tool_input);
const tool = String(input.tool_name ?? input.toolName ?? '');
const command = String(input.command ?? toolInput.command ?? '');
const writeTool = /write|strreplace|delete|edit|patch|notebook/i.test(tool);

if (command && (!tool || tool === 'Shell')) {
	const decision = decideShell(command, root, policy);
	if (!decision.ok) deny(decision.message);
	allow();
}

const paths = collectPaths(toolInput, input);
if (writeTool && paths.length === 0) deny('Refusing a write whose path could not be read.');
for (const file of paths) {
	const decision = decidePath(file, root, policy);
	if (!decision.ok) deny(decision.message);
}
allow();

function allow() {
	process.stdout.write(`${JSON.stringify({ permission: 'allow' })}\n`);
	process.exit(0);
}

function deny(message) {
	process.stdout.write(`${JSON.stringify({ permission: 'deny', user_message: message, agent_message: message })}\n`);
	process.exit(0);
}

function loadConfig(start) {
	try {
		return JSON.parse(readFileSync(path.join(start, 'cellix-lint.config.json'), 'utf8'));
	} catch {
		return {};
	}
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

function collectPaths(toolInput, payload) {
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
