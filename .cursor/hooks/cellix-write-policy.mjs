import path from 'node:path';

// node/python/tsx count only when invoked as the command. versions/node/v24 in a PATH is not a write.
const WRITE_COMMAND =
	/--write\b|>>?|\btee\b|\brm\b|\bmv\b|\bcp\b|\bmkdir\b|\btouch\b|\bchmod\b|\bsed\s+-i|\bperl\s+-i|(?:^|&&|\|\||[;&|]\s)\s*(?:\.?\/)?(?:[\w@.+-]+\/)*node(?:\s|$)|(?:^|&&|\|\||[;&|]\s)\s*(?:\.?\/)?(?:[\w@.+-]+\/)*python3?(?:\s|$)|(?:^|&&|\|\||[;&|]\s)\s*(?:\.?\/)?(?:[\w@.+-]+\/)*tsx(?:\s|$)/;

export function policyFromConfig(config = {}) {
	return {
		agentAccess: config.agentAccess ?? {},
		writable: config.writable ?? [],
	};
}

export function decidePath(file, workspace, policy) {
	const relative = relativeToWorkspace(file, workspace);
	if (!relative) return deny('That path is outside the workspace.');
	const access = matchingAccess(relative, policy.agentAccess);
	if (access === false) return deny(`${relative} is locked. Set its agentAccess entry to true in cellix-lint.config.json yourself, then ask again.`);
	if (access === true) return allow();
	if (matchesAny(policy.writable, relative)) return allow();
	return deny(`${relative} is outside the writable paths in cellix-lint.config.json.`);
}

export function decideShell(command, workspace, policy) {
	for (const [glob, open] of Object.entries(policy.agentAccess)) {
		if (open === true) continue;
		if (mentionsGlob(command, glob) && WRITE_COMMAND.test(command)) {
			return deny(`${glob} is locked. Set agentAccess["${glob}"] to true in cellix-lint.config.json yourself, then ask again.`);
		}
	}
	if (!WRITE_COMMAND.test(command)) return allow();
	for (const token of commandPaths(command)) {
		const decision = decidePath(token, workspace, policy);
		if (!decision.ok) return decision;
	}
	return allow();
}

function commandPaths(command) {
	const paths = [];
	for (const raw of command.split(/[\s'"`;|&<>]+/)) {
		const token = raw.includes('=') ? raw.slice(raw.indexOf('=') + 1) : raw;
		if (!token || token.includes('$') || token.includes('versions/node') || token.split(':').length > 2) continue;
		if (token.startsWith('./') || token.startsWith('/') || token.startsWith('packages/') || token.startsWith('apps/') || token.startsWith('.cursor/') || token.startsWith('cellix-lint.config.json')) {
			paths.push(token);
		}
	}
	return paths;
}

function matchesAny(globs, relative) {
	return globs.some((glob) => matchGlob(glob, relative));
}

function matchingAccess(relative, agentAccess) {
	for (const [glob, open] of Object.entries(agentAccess)) {
		if (matchGlob(glob, relative)) return open === true;
	}
	return undefined;
}

function mentionsGlob(command, glob) {
	const prefix = glob.replace(/\/\*\*$/, '').replace(/\/\*$/, '');
	return command.includes(prefix);
}

export function matchGlob(glob, relative) {
	const pattern = glob
		.replace(/[.+^${}()|[\]\\]/g, '\\$&')
		.replace(/\*\*/g, '::DOUBLE::')
		.replace(/\*/g, '[^/]*')
		.replace(/::DOUBLE::/g, '.*');
	return new RegExp(`^${pattern}$`).test(relative);
}

export function relativeToWorkspace(file, workspace) {
	const absolute = path.resolve(workspace, file);
	const workspacePath = path.resolve(workspace);
	if (absolute !== workspacePath && !absolute.startsWith(`${workspacePath}${path.sep}`)) return '';
	return absolute
		.slice(workspacePath.length + 1)
		.split(path.sep)
		.join('/');
}

function allow() {
	return { ok: true, message: '' };
}

function deny(message) {
	return { ok: false, message };
}