import { agentIdFromEnv, clearSession } from '../packages/cellix/guardrails/src/index.mjs';

const agentId = agentIdFromEnv();
if (!agentId) {
	console.error('Set CELLIX_AGENT_ID to remove that agent session.');
	process.exit(1);
}

clearSession(process.cwd(), agentId);
