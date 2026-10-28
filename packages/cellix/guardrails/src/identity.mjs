// Who is asking. The runner sets CELLIX_AGENT_ID on the agent process.
// A shell assignment is not an id. write/decide.mjs rejects that assignment.

const AGENT_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,80}$/;

/** CELLIX_AGENT_ID for this process. Empty string means this agent has no session. */
export function agentIdFromEnv(env = process.env) {
	const id = env.CELLIX_AGENT_ID ?? '';
	if (!id) return '';
	if (!AGENT_ID.test(id)) throw new Error('CELLIX_AGENT_ID may contain letters, numbers, dots, underscores, and hyphens.');
	return id;
}
