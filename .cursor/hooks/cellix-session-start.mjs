#!/usr/bin/env node
// sessionStart is the Cursor hook whose additional_context reaches the model.
// Keep this short. The session file, not this paragraph, is the file list.
import { agentIdFromSession, ensureStartupSession, noteActiveAgent } from '../../packages/cellix/guardrails/src/index.mjs';

const raw = await new Response(process.stdin).text();
const payload = JSON.parse(raw || '{}');

function workspaceFrom(value) {
	const roots = value.workspace_roots;
	if (Array.isArray(roots) && typeof roots[0] === 'string' && roots[0]) return roots[0];
	if (typeof process.env.CURSOR_PROJECT_DIR === 'string' && process.env.CURSOR_PROJECT_DIR) return process.env.CURSOR_PROJECT_DIR;
	return process.cwd();
}

let agentId = '';
try {
	agentId = agentIdFromSession(payload);
	if (agentId) {
		const workspace = workspaceFrom(payload);
		ensureStartupSession(workspace, agentId);
		noteActiveAgent(workspace, agentId);
	}
} catch {
	agentId = '';
}

const session = agentId
	? ` The session file .cellix/sessions/${agentId}.json exists. The shell may not have CELLIX_AGENT_ID. Do not assign it. query records this session. Read the file once. Run query before reading the product tree.`
	: '';

const additional_context = `Cellix. A search endpoint is a query. Edit the files the generator prints.${session} Leave ocom-write.config.json unchanged. pnpm run agent-check prints the next edit. Do not pipe it to tail. The Expected line is the shape.`;

process.stdout.write(`${JSON.stringify({ ...(agentId ? { env: { CELLIX_AGENT_ID: agentId } } : {}), additional_context })}\n`);
