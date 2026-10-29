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

const additional_context = 'Do not list the tree. Read .agents/skills/cellix-architecture/SKILL.md when the change adds a context, subdomain, or action. Any other change edits the existing file.';

process.stdout.write(`${JSON.stringify({ ...(agentId ? { env: { CELLIX_AGENT_ID: agentId } } : {}), additional_context })}\n`);
