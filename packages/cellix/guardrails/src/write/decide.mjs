import { sessionAllows } from '../session.mjs';
import { exactOpen, firstMatchingAccess, relativeToWorkspace } from './agent-access.mjs';
import { commandPaths, WRITE_COMMAND } from './shell.mjs';

// Order for one path:
// 1. Outside the workspace: deny.
// 2. .cellix/verify.json: deny. pnpm run verify is the only writer. A session cannot open it.
// 3. First matching agentAccess key. false locks the path. No match denies it. true continues.
// 4. An exact true key (no *) stays writable during a session.
// 5. No session: allow. A session must list the file, or a directory entry that contains it.
// Step 3 runs before the session, so a session cannot unlock a locked path.

export function policyFromConfig(config = {}, session = null) {
	return {
		agentAccess: config.agentAccess ?? {},
		session,
	};
}

export function decidePath(file, workspace, policy) {
	const relativePath = relativeToWorkspace(file, workspace);
	if (!relativePath) return deny('That path is outside the workspace.');
	if (relativePath === '.cellix/verify.json') return deny('.cellix/verify.json is written only by pnpm run verify.');

	const standingRule = firstMatchingAccess(relativePath, policy.agentAccess);
	if (standingRule === false) return deny(`${relativePath} is locked. Set its agentAccess entry to true in ocom-write.config.json yourself, then ask again.`);
	if (standingRule !== true) return deny(`${relativePath} has no agentAccess entry in ocom-write.config.json. Add one.`);

	if (exactOpen(relativePath, policy.agentAccess)) return allow();
	if (sessionAllows(relativePath, policy.session)) return allow();
	return deny(`${relativePath} is outside the ${policy.session.agentId} session (.cellix/sessions/${policy.session.agentId}.json). Other agents are unchanged. An exact true path in ocom-write.config.json stays writable.`);
}

/** A command that does not match WRITE_COMMAND is not a write, so it is allowed. A write must name at least one path. */
export function decideShell(command, workspace, policy) {
	if (!WRITE_COMMAND.test(command)) return allow();
	const paths = commandPaths(command);
	if (paths.length === 0) return deny('This command can write files. Name a file with an agentAccess entry.');
	for (const token of paths) {
		const decision = decidePath(token, workspace, policy);
		if (!decision.ok) return decision;
	}
	return allow();
}

function allow() {
	return { ok: true, message: '' };
}

function deny(message) {
	return { ok: false, message };
}
