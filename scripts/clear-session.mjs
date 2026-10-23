import { rm } from 'node:fs/promises';
import { agentIdFromEnv, sessionFile } from '../packages/cellix/guardrails/src/session.mjs';

const agentId = agentIdFromEnv();
if (!agentId) {
	console.error('Set CELLIX_AGENT_ID to remove that agent session.');
	process.exit(1);
}

await rm(sessionFile(process.cwd(), agentId), { force: true });
await rm('.cellix/session.json', { force: true });
