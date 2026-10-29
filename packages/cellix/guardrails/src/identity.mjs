// Who is asking. sessionStart sets CELLIX_AGENT_ID when the process does not already have one.
// A shell assignment is not an id. write/decide.mjs rejects that assignment.

const AGENT_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,80}$/;

/** CELLIX_AGENT_ID for this process. Empty string means this agent has no session. */
export function agentIdFromEnv(env = process.env) {
	const id = env.CELLIX_AGENT_ID ?? '';
	if (!id) return '';
	if (!AGENT_ID.test(id)) throw new Error('CELLIX_AGENT_ID may contain letters, numbers, dots, underscores, and hyphens.');
	return id;
}

/** The env id, or a stable id from the session payload. */
export function agentIdFromSession(payload, env = process.env) {
	const existing = agentIdFromEnv(env);
	if (existing) return existing;
	const raw = typeof payload?.conversation_id === 'string' ? payload.conversation_id : typeof payload?.session_id === 'string' ? payload.session_id : '';
	const sanitized = raw.replace(/[^A-Za-z0-9._-]/g, '').slice(0, 80);
	if (AGENT_ID.test(sanitized)) return sanitized;
	return `agent${Date.now().toString(36)}`;
}
