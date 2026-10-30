#!/usr/bin/env node
// Cursor runs this when the conversation ends. The response is not shown to the agent.
// A passing verify flag means the run is done, so this agent's session file is removed.
// .cellix/verify.json stays. A run that did not pass keeps its session.
import { readFileSync } from 'node:fs';
import { agentIdFromEnv, checkFlag, clearSession } from '../../packages/cellix/guardrails/src/index.mjs';

const payload = readPayload();
const workspace = workspaceFrom(payload);

try {
	const agentId = agentIdFromEnv();
	if (agentId && checkFlag(workspace)) clearSession(workspace, agentId);
} catch {
	// An invalid id has no session file to remove.
}

process.stdout.write('{}\n');

function readPayload() {
	try {
		return JSON.parse(readFileSync(0, 'utf8') || '{}');
	} catch {
		return {};
	}
}

function workspaceFrom(payload) {
	const roots = payload.workspace_roots;
	if (Array.isArray(roots) && typeof roots[0] === 'string' && roots[0]) return roots[0];
	if (process.env.CURSOR_PROJECT_DIR) return process.env.CURSOR_PROJECT_DIR;
	return process.cwd();
}
