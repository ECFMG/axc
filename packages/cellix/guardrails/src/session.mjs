// One agent, one file: .cellix/sessions/<CELLIX_AGENT_ID>.json
// This file only stores and reads that list. It does not look at ocom-write.config.json.
// write/decide.mjs asks this file after the config has already allowed the path.
// files is the write list. write is the same list. read is optional and does not narrow writes.
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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
 * Read one agent's lists.
 * Missing file: null, so decide.mjs does not narrow this agent.
 * Empty write list: a session that lists nothing to write.
 * Invalid JSON, or a file with neither a files array nor a write array: throw, and the hook denies the write.
 * A missing read array does not narrow reads.
 */
export function loadSession(root, agentId) {
	if (!agentId) return null;
	const raw = readSessionFile(root, agentId);
	if (raw === null) return null;
	const parsed = parseSessionJson(raw, agentId);
	const write = safeEntries(parsed.write);
	return { agentId, files: write, write, ...(Array.isArray(parsed.read) ? { read: safeEntries(parsed.read) } : {}) };
}

/**
 * True when the path may be written.
 * No session object: true. Standing write rules are the only check.
 * An entry that ends with / matches every file inside that directory.
 * Any other entry matches that one path.
 */
export function sessionAllows(relativePath, session) {
	if (!session) return true;
	const list = Array.isArray(session.write) ? session.write : session.files;
	if (!Array.isArray(list)) return false;
	return list.some((entry) => entryCoversPath(entry, relativePath));
}

/** No session, or a session with no read array: true. Standing read rules are the only check. */
export function sessionAllowsRead(relativePath, session) {
	if (!session || !Array.isArray(session.read)) return true;
	return session.read.some((entry) => entryCoversPath(entry, relativePath));
}

/** Remove this agent's session file. .cellix/verify.json is left in place. */
export function clearSession(root, agentId) {
	const id = agentIdFromEnv({ CELLIX_AGENT_ID: agentId });
	if (!id) return;
	rmSync(sessionFile(root, id), { force: true });
	rmSync(path.join(root, '.cellix', 'session.json'), { force: true });
}

/**
 * Add paths to this agent id. A second call for the same id unions the lists. Other ids are left alone.
 * An array is the write list. An object may set read and write separately.
 */
export function recordSession(root, agentId, filesOrLists) {
	const id = agentIdFromEnv({ CELLIX_AGENT_ID: agentId });
	if (!id) return '';
	const file = sessionFile(root, id);
	const previous = loadSession(root, id);
	const lists = Array.isArray(filesOrLists) ? { write: filesOrLists } : (filesOrLists ?? {});
	const write = unionEntries(previous?.write ?? previous?.files, lists.write ?? lists.files);
	const read = Array.isArray(lists.read) || Array.isArray(previous?.read) ? unionEntries(previous?.read, lists.read) : undefined;
	const body = { agentId: id, files: write, ...(read === undefined ? {} : { read }), ...(!Array.isArray(filesOrLists) || read !== undefined ? { write } : {}) };
	mkdirSync(path.dirname(file), { recursive: true });
	writeFileSync(file, `${JSON.stringify(body, null, '\t')}\n`);
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
	const write = Array.isArray(parsed?.write) ? parsed.write : parsed?.files;
	if (!parsed || !Array.isArray(write)) throw new Error(`Session ${agentId} must be an object with a files or write array.`);
	return { write, read: Array.isArray(parsed.read) ? parsed.read : undefined };
}

function unionEntries(previous, added) {
	return [...new Set([...(previous ?? []), ...safeEntries(added)])].sort();
}

/** Drop empty strings and any entry that contains .. so a session cannot leave the workspace. */
function safeEntries(files) {
	if (!Array.isArray(files)) return [];
	return files.filter((entry) => typeof entry === 'string' && entry.length > 0 && !entry.includes('..'));
}
