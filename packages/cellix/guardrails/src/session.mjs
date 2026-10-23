// One agent, one file: .cellix/sessions/<CELLIX_AGENT_ID>.json
// This file only stores and reads that list. It does not look at ocom-write.config.json.
// write/decide.mjs asks this file after the config has already allowed the path.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const AGENT_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,80}$/;

/** CELLIX_AGENT_ID for this process. Empty string means this agent has no session. */
export function agentIdFromEnv(env = process.env) {
	const id = env.CELLIX_AGENT_ID ?? '';
	if (!id) return '';
	if (!AGENT_ID.test(id)) throw new Error('CELLIX_AGENT_ID may contain letters, numbers, dots, underscores, and hyphens.');
	return id;
}

/** .cellix/sessions/<agentId>.json */
export function sessionFile(root, agentId) {
	return path.join(root, '.cellix', 'sessions', `${agentId}.json`);
}

/**
 * Read one agent's list.
 * Missing file: null, so decide.mjs does not narrow this agent.
 * Empty files array: a session that lists nothing.
 * Invalid JSON or a missing files array: throw, and the hook denies the write.
 */
export function loadSession(root, agentId) {
	if (!agentId) return null;
	const raw = readSessionFile(root, agentId);
	if (raw === null) return null;
	const parsed = parseSessionJson(raw, agentId);
	return { agentId, files: safeEntries(parsed.files) };
}

/**
 * True when the path may be written.
 * No session object: true. Standing agentAccess is the only check.
 * An entry that ends with / matches every file inside that directory.
 * Any other entry matches that one path.
 */
export function sessionAllows(relativePath, session) {
	if (!session) return true;
	return session.files.some((entry) => entryCoversPath(entry, relativePath));
}

/** Add paths to this agent id. A second call for the same id unions the lists. Other ids are left alone. */
export function recordSession(root, agentId, files) {
	const id = agentIdFromEnv({ CELLIX_AGENT_ID: agentId });
	if (!id) return '';
	const file = sessionFile(root, id);
	const previous = loadSession(root, id);
	const next = [...new Set([...(previous?.files ?? []), ...safeEntries(files)])].sort();
	mkdirSync(path.dirname(file), { recursive: true });
	writeFileSync(file, `${JSON.stringify({ agentId: id, files: next }, null, '\t')}\n`);
	return file;
}

function entryCoversPath(entry, relativePath) {
	if (entry.endsWith('/')) return relativePath.startsWith(entry);
	return entry === relativePath;
}

function readSessionFile(root, agentId) {
	try {
		return readFileSync(sessionFile(root, agentId), 'utf8');
	} catch (error) {
		if (error && error.code === 'ENOENT') return null;
		throw error;
	}
}

function parseSessionJson(raw, agentId) {
	let parsed = null;
	try {
		parsed = JSON.parse(raw);
	} catch {
		throw new Error(`Session ${agentId} is not valid JSON. Fix .cellix/sessions/${agentId}.json or clear it.`);
	}
	if (!parsed || !Array.isArray(parsed.files)) throw new Error(`Session ${agentId} must be an object with a files array.`);
	return parsed;
}

/** Drop empty strings and any entry that contains .. so a session cannot leave the workspace. */
function safeEntries(files) {
	if (!Array.isArray(files)) return [];
	return files.filter((entry) => typeof entry === 'string' && entry.length > 0 && !entry.includes('..'));
}
