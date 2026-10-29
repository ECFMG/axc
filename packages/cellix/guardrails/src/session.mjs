// One agent, one file: .cellix/sessions/<CELLIX_AGENT_ID>.json
// identity.mjs reads the id. This file only stores and reads the list.
// write/decide.mjs asks this file after the config has already allowed the path.
// files is the write list. write is the same list. read is optional and does not narrow writes.
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { agentIdFromEnv, agentIdFromSession } from './identity.mjs';

export { agentIdFromEnv, agentIdFromSession };

/** What an agent may read before query has added a slice. packages/axc and apps stay closed. */
export const STARTUP_READ = ['.agents/skills/cellix-architecture/', 'AGENTS.md', 'cellix-lint.config.json', 'task-set-a-prompt.md', 'task-set-a-requirements.md', 'task-set-b-prompt.md', 'task-set-b-requirements.md'];

/** .cellix/sessions/<agentId>.json */
export function sessionFile(root, agentId) {
	return path.join(root, '.cellix', 'sessions', `${agentId}.json`);
}

/**
 * Read one agent's lists.
 * Missing file: null, so decide.mjs does not narrow this agent.
 * Missing write array: standing write rules still apply.
 * Invalid JSON, or a file with neither a files array nor a write array: throw, and the hook denies the write.
 * A missing read array does not narrow reads.
 */
export function loadSession(root, agentId) {
	if (!agentId) return null;
	const raw = readSessionFile(root, agentId);
	if (raw === null) return null;
	const parsed = parseSessionJson(raw, agentId);
	const write = parsed.write === undefined ? undefined : safeEntries(parsed.write);
	return { agentId, ...(write === undefined ? {} : { files: write, write }), ...(Array.isArray(parsed.read) ? { read: safeEntries(parsed.read) } : {}) };
}

/**
 * True when the path may be written.
 * No session object, or a session with no write array: true. Standing write rules are the only check.
 * An entry that ends with / matches every file inside that directory.
 * Any other entry matches that one path.
 */
export function sessionAllows(relativePath, session) {
	if (!session) return true;
	const list = Array.isArray(session.write) ? session.write : session.files;
	if (!Array.isArray(list)) return true;
	return list.some((entry) => entryCoversPath(entry, relativePath));
}

/** No session, or a session with no read array: true. Standing read rules are the only check. */
export function sessionAllowsRead(relativePath, session) {
	if (!session || !Array.isArray(session.read)) return true;
	return session.read.some((entry) => entryCoversPath(entry, relativePath));
}

/** Create the startup session once. A later recordSession unions the slice into this file. */
export function ensureStartupSession(root, agentId) {
	const id = agentIdFromEnv({ CELLIX_AGENT_ID: agentId });
	if (!id) return null;
	const existing = loadSession(root, id);
	if (existing) return existing;
	recordSession(root, id, { read: STARTUP_READ });
	return loadSession(root, id);
}

/** Remember which session sessionStart just opened. The shell does not inherit the hook env. */
export function noteActiveAgent(root, agentId) {
	const id = agentIdFromEnv({ CELLIX_AGENT_ID: agentId });
	if (!id) return;
	const dir = path.join(root, '.cellix');
	mkdirSync(dir, { recursive: true });
	writeFileSync(path.join(dir, 'active-id'), `${id}\n`);
}

/**
 * The env id, or the session sessionStart stored when the shell has no id.
 * One session file and no pointer: that file. Several files and no pointer: throw.
 */
export function agentIdForRecord(root, env = process.env) {
	const existing = agentIdFromEnv(env);
	if (existing) return existing;
	const pointed = readActiveId(root);
	if (pointed && loadSession(root, pointed)) return pointed;
	const ids = sessionIdsOnDisk(root);
	if (ids.length === 1) return ids[0];
	if (ids.length > 1) throw new Error('Several session files exist and the shell has no agent id. Do not assign CELLIX_AGENT_ID.');
	return '';
}

/** Remove this agent's session file. .cellix/verify.json is left in place. */
export function clearSession(root, agentId) {
	const id = agentIdFromEnv({ CELLIX_AGENT_ID: agentId });
	if (!id) return;
	rmSync(sessionFile(root, id), { force: true });
	rmSync(path.join(root, '.cellix', 'session.json'), { force: true });
	if (readActiveId(root) === id) rmSync(path.join(root, '.cellix', 'active-id'), { force: true });
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
	const addedWrite = lists.write ?? lists.files;
	const previousWrite = previous?.write ?? previous?.files;
	const hasWrite = Array.isArray(addedWrite) || Array.isArray(previousWrite);
	const write = hasWrite ? unionEntries(previousWrite, addedWrite) : undefined;
	let read = Array.isArray(lists.read) || Array.isArray(previous?.read) ? unionEntries(previous?.read, lists.read) : undefined;
	if (Array.isArray(previous?.read) && Array.isArray(addedWrite)) read = unionEntries(read, addedWrite);
	const body = { agentId: id, ...(write === undefined ? {} : { files: write, write }), ...(read === undefined ? {} : { read }) };
	mkdirSync(path.dirname(file), { recursive: true });
	writeFileSync(file, `${JSON.stringify(body, null, '\t')}\n`);
	return file;
}

function entryCoversPath(entry, relativePath) {
	if (entry.endsWith('/')) return relativePath.startsWith(entry);
	return entry === relativePath;
}

function readActiveId(root) {
	let raw = '';
	try {
		raw = readFileSync(path.join(root, '.cellix', 'active-id'), 'utf8');
	} catch (error) {
		if (error && error.code === 'ENOENT') return '';
		throw error;
	}
	try {
		return agentIdFromEnv({ CELLIX_AGENT_ID: raw.trim() });
	} catch {
		return '';
	}
}

function sessionIdsOnDisk(root) {
	let names = [];
	try {
		names = readdirSync(path.join(root, '.cellix', 'sessions'));
	} catch (error) {
		if (error && error.code === 'ENOENT') return [];
		throw error;
	}
	const ids = [];
	for (const name of names) {
		if (!name.endsWith('.json')) continue;
		try {
			const id = agentIdFromEnv({ CELLIX_AGENT_ID: name.slice(0, -'.json'.length) });
			if (id) ids.push(id);
		} catch {
			// A file whose name is not an agent id is not a session.
		}
	}
	return ids;
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
	const hasWrite = Array.isArray(parsed?.write) || Array.isArray(parsed?.files);
	const write = hasWrite ? (Array.isArray(parsed.write) ? parsed.write : parsed.files) : undefined;
	const read = Array.isArray(parsed?.read) ? parsed.read : undefined;
	if (!parsed || (write === undefined && read === undefined)) throw new Error(`Session ${agentId} must be an object with a files, write, or read array.`);
	return { write, read };
}

function unionEntries(previous, added) {
	return [...new Set([...(previous ?? []), ...safeEntries(added)])].sort();
}

/** Drop empty strings and any entry that contains .. so a session cannot leave the workspace. */
function safeEntries(files) {
	if (!Array.isArray(files)) return [];
	return files.filter((entry) => typeof entry === 'string' && entry.length > 0 && !entry.includes('..'));
}
