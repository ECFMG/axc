#!/usr/bin/env node
// sessionStart is the Cursor hook whose additional_context reaches the model.
// Keep this short. The session file, not this paragraph, is the file list.
import { agentIdFromEnv, ensureStartupSession } from '../../packages/cellix/guardrails/src/index.mjs';

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
	agentId = agentIdFromEnv();
	if (agentId) ensureStartupSession(workspaceFrom(payload), agentId);
} catch {
	agentId = '';
}

const session = agentId
	? ` The session file .cellix/sessions/${agentId}.json already exists. Read it once. An empty write list means run query before opening packages/axc or apps.`
	: ' The runner sets CELLIX_AGENT_ID before the agent starts. Do not assign it in a shell.';

const additional_context = `Cellix. A search endpoint is a query. Edit the files the generator prints.${session} Leave ocom-write.config.json unchanged. pnpm run agent-check prints the next edit. Do not pipe it to tail. The Expected line is the shape.`;

process.stdout.write(`${JSON.stringify({ additional_context })}\n`);
