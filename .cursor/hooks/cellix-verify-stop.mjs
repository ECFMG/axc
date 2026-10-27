#!/usr/bin/env node
// Cursor runs this when an agent turn ends.
// An agent with CELLIX_AGENT_ID stays in the loop until .cellix/verify.json matches this tree.
// The follow-up is the next user message. An empty object lets the turn end.
// A matching flag removes that agent's session file. The verify file stays.
import { readFileSync } from 'node:fs';
import { agentIdFromEnv, checkFlag, clearSession } from '../../packages/cellix/guardrails/src/index.mjs';

const FOLLOWUP =
	'While files are still changing, run pnpm run agent-check -- pnpm run check. Run pnpm run agent-check -- pnpm run verify once when the behavior is in place. Finish only after it prints CELLIX_VERIFY=pass. Do not write .cellix/verify.json.';

const payload = readPayload();
const workspace = workspaceFrom(payload);
const agentId = readAgentId();

if (!agentId || payload.status === 'aborted' || payload.status === 'error') reply({});
if (checkFlag(workspace)) {
	clearSession(workspace, agentId);
	reply({});
}
reply({ followup_message: FOLLOWUP });

function readPayload() {
	try {
		return JSON.parse(readFileSync(0, 'utf8') || '{}');
	} catch {
		return {};
	}
}

function readAgentId() {
	try {
		return agentIdFromEnv();
	} catch (error) {
		reply({ followup_message: error instanceof Error ? error.message : 'CELLIX_AGENT_ID is invalid.' });
	}
}

function workspaceFrom(payload) {
	const roots = payload.workspace_roots;
	if (Array.isArray(roots) && typeof roots[0] === 'string' && roots[0]) return roots[0];
	if (process.env.CURSOR_PROJECT_DIR) return process.env.CURSOR_PROJECT_DIR;
	return process.cwd();
}

function reply(body) {
	process.stdout.write(`${JSON.stringify(body)}\n`);
	process.exit(0);
}
