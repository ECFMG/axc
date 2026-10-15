import path from 'node:path';

// node/python/tsx count only when invoked as the command. versions/node/v24 in a PATH is not a write.
const WRITE_COMMAND =
	/--write\b|>(?!&)|\btee\b|\brm\b|\bmv\b|\bcp\b|\bmkdir\b|\btouch\b|\bchmod\b|\bsed\s+-i|\bperl\s+-i|\bgit\s+(?:restore|checkout|reset|clean|apply|stash|rebase|merge|pull|switch|revert)\b|(?:^|&&|\|\||[;&|]\s)\s*(?:\.?\/)?(?:[\w@.+-]+\/)*node(?:\s|$)|(?:^|&&|\|\||[;&|]\s)\s*(?:\.?\/)?(?:[\w@.+-]+\/)*python3?(?:\s|$)|(?:^|&&|\|\||[;&|]\s)\s*(?:\.?\/)?(?:[\w@.+-]+\/)*tsx(?:\s|$)|\bpnpm exec node\b|\bpnpm exec tsx\b|\bpnpm exec python3?\b/;

export function policyFromConfig(config = {}, session = null) {
	return {
		agentAccess: config.agentAccess ?? {},
		writable: config.writable ?? [],
		session: session && Array.isArray(session.files) && session.files.length > 0 ? session : null,
	};
}

export function decidePath(file, workspace, policy) {
	const relative = relativeToWorkspace(file, workspace);
	if (!relative) return deny('That path is outside the workspace.');
	if (policy.session) {
		if (policy.session.files.includes(relative)) return allow();
		const task = `${policy.session.context}/${policy.session.entity}/${policy.session.action}`;
		return deny(
			`${relative} is outside the ${task} new structure. Edit a listed file. The session ends when pnpm run verify exits 0. Run pnpm --filter @cellix/generator generate when that context, entity, or action is missing or wrong.`,
		);
	}
	const access = matchingAccess(relative, policy.agentAccess);
	if (access === false) return deny(`${relative} is locked. Set its agentAccess entry to true in ocom-write.config.json yourself, then ask again.`);
	if (access === true) return allow();
	if (matchesAny(policy.writable, relative)) return allow();
	return deny(`${relative} is outside the writable paths in ocom-write.config.json. Generate is only for a new context, entity, or action.`);
}

export function decideShell(command, workspace, policy) {
	if (policy.session && /\bpnpm\s+run\s+clear-session\b/.test(command)) {
		const task = `${policy.session.context}/${policy.session.entity}/${policy.session.action}`;
		return deny(`pnpm run verify has to exit 0 before the ${task} structure can be cleared. Cursor keeps the turn open until then.`);
	}
	const writing = WRITE_COMMAND.test(command);
	if (writing) {
		const paths = commandPaths(command);
		if (paths.length === 0) {
			if (policy.session) {
				const task = `${policy.session.context}/${policy.session.entity}/${policy.session.action}`;
				return deny(`This command can write files. Name a file from the ${task} task, or run pnpm run verify.`);
			}
			return deny('This command can write files. Name a file inside the writable paths.');
		}
		if (policy.session) {
			for (const token of paths) {
				const decision = decidePath(token, workspace, policy);
				if (!decision.ok) return decision;
			}
			return allow();
		}
	}
	if (!writing) return allow();
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
		if (isPathToken(token)) paths.push(token);
	}
	return paths;
}

function isPathToken(token) {
	if (token.startsWith('./') || token.startsWith('/') || token.startsWith('packages/') || token.startsWith('apps/') || token.startsWith('.cursor/') || token.startsWith('.agents/')) return true;
	return /^(?:package\.json|pnpm-lock\.yaml|pnpm-workspace\.yaml|AGENTS\.md|biome\.json|ocom-write\.config\.json|cellix-lint\.config\.json)$/.test(token);
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
