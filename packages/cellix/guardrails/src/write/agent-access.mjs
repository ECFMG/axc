import path from 'node:path';

/**
 * The first agentAccess key that matches the path.
 * Keys are tried in the order they appear in ocom-write.config.json.
 * true: the path is allowed, and decide.mjs continues to the session.
 * false: the path is locked. A session cannot open it.
 * undefined: no key matched.
 */
export function firstMatchingAccess(relativePath, agentAccess) {
	for (const [pattern, open] of Object.entries(agentAccess)) {
		if (patternMatchesPath(pattern, relativePath)) return open === true;
	}
	return undefined;
}

/**
 * True when some agentAccess key is exactly this path, contains no *, and is true.
 * That path stays writable while a session is open. A glob such as packages/axc/** does not.
 */
export function exactOpen(relativePath, agentAccess) {
	return Object.entries(agentAccess).some(([pattern, open]) => open === true && !pattern.includes('*') && pattern === relativePath);
}

export function matchGlob(pattern, relativePath) {
	return patternMatchesPath(pattern, relativePath);
}

/** Workspace-relative posix path. Empty string means the file is outside the workspace. */
export function relativeToWorkspace(file, workspace) {
	const absolute = path.resolve(workspace, file);
	const workspacePath = path.resolve(workspace);
	if (absolute !== workspacePath && !absolute.startsWith(`${workspacePath}${path.sep}`)) return '';
	return absolute
		.slice(workspacePath.length + 1)
		.split(path.sep)
		.join('/');
}

function patternMatchesPath(pattern, relativePath) {
	const expression = pattern
		.replace(/[.+^${}()|[\]\\]/g, '\\$&')
		.replace(/\*\*/g, '::DOUBLE::')
		.replace(/\*/g, '[^/]*')
		.replace(/::DOUBLE::/g, '.*');
	return new RegExp(`^${expression}$`).test(relativePath);
}
