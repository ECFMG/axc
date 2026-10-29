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

const additional_context =
	'Cellix. Read the files the task names. Do not list the tree or cat a directory. A new search or list endpoint starts with query, then edit the files it prints. Any other change edits the existing file. Do not assign CELLIX_AGENT_ID. Leave ocom-write.config.json unchanged. pnpm run agent-check prints the next edit. Do not pipe it to tail. The Expected line is the shape. Finish only after pnpm run agent-check -- pnpm run verify prints CELLIX_VERIFY=pass.';

process.stdout.write(`${JSON.stringify({ ...(agentId ? { env: { CELLIX_AGENT_ID: agentId } } : {}), additional_context })}\n`);
