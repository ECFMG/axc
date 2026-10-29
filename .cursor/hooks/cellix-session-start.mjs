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
	'Cellix. Read the files the task names. Do not list the tree or cat a directory. Do not open REFERENCE.md until a check names a file role. packages/cellix stays closed. A new REST read is generate with --field and no --action, then query with --param, --route, and --transport rest. A new GraphQL read is that same generate, then query with --param and --transport graphql and no --route. Do not pass --field on query. Do not pass --entity. Use --subdomain. Quote a shell value that contains [] or |. A mutation is generate with --action. Pass --transport graphql on that generate only when the task asks for a resolver. Any other change edits the existing file. Do not assign CELLIX_AGENT_ID. Leave ocom-write.config.json unchanged. pnpm run agent-check prints the next edit. Do not pipe it to tail. Run verify once, after the behavior is in place. Finish only after pnpm run agent-check -- pnpm run verify prints CELLIX_VERIFY=pass.';

process.stdout.write(`${JSON.stringify({ ...(agentId ? { env: { CELLIX_AGENT_ID: agentId } } : {}), additional_context })}\n`);
