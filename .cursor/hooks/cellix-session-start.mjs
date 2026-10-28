#!/usr/bin/env node
// sessionStart is the Cursor hook whose additional_context reaches the model.
// Keep this short. The session file, not this paragraph, is the file list.
import { agentIdFromEnv } from '../../packages/cellix/guardrails/src/identity.mjs';

let agentId = '';
try {
	agentId = agentIdFromEnv();
} catch {
	agentId = '';
}

const session = agentId ? ` After the generator runs, read .cellix/sessions/${agentId}.json once. That write list is the slice.` : ' The runner sets CELLIX_AGENT_ID before the agent starts. Do not assign it in a shell.';

const additional_context = `Cellix. A search endpoint is a query. Edit the files the generator prints. Do not list the repository.${session} Open packages/axc, packages/axc-verification, apps/api/src, and apps/docs. Leave ocom-write.config.json unchanged. pnpm run agent-check prints the next edit. Do not pipe it to tail. The Expected line is the shape.`;

process.stdout.write(`${JSON.stringify({ additional_context })}\n`);
