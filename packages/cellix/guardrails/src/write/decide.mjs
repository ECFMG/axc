import { OPEN_ROOTS } from '../budget.mjs';
import { sessionAllows, sessionAllowsRead } from '../session.mjs';
import { exactOpen, firstMatchingAccess, relativeToWorkspace } from './agent-access.mjs';
import { commandPaths, WRITE_COMMAND } from './shell.mjs';

const RUNNER_OWNS_ID = 'The runner sets CELLIX_AGENT_ID. A shell assignment does not open a session.';

// Order for one path:
// 1. Outside the workspace: deny a write. A read of a path outside the workspace is not this list.
// 2. .cellix/verify.json: deny writes. pnpm run verify is the only writer. A session cannot open it.
// 3. First matching key in the write map, or the read map. false locks the path. No match denies it. true continues.
// 4. An exact true key (no *) stays open during a session for that side only.
// 5. No session list for that side: allow. A write list must name the file, or a directory entry that contains it.
//    A missing read list does not narrow reads.
// Step 3 runs before the session, so a session cannot unlock a locked path.
// config.write replaces config.agentAccess. agentAccess is still accepted.

export function policyFromConfig(config = {}, session = null) {
	const write = config.write ?? config.agentAccess ?? {};
	return {
		read: config.read ?? { '**': true },
		write,
		agentAccess: write,
		session,
	};
}

export function decidePath(file, workspace, policy) {
	const relativePath = relativeToWorkspace(file, workspace);
	if (!relativePath) return deny('That path is outside the workspace.');
	if (relativePath === '.cellix/verify.json') return deny('.cellix/verify.json is written only by pnpm run verify.');

	const standingRule = firstMatchingAccess(relativePath, policy.agentAccess);
	if (standingRule === false) return deny(`${relativePath} is locked. Write under ${OPEN_ROOTS}, or an exact true path. Leave ocom-write.config.json unchanged.`);
	if (standingRule !== true) return deny(`${relativePath} is not writable. Write under ${OPEN_ROOTS}. Leave ocom-write.config.json unchanged.`);

	if (exactOpen(relativePath, policy.agentAccess)) return allow();
	if (sessionAllows(relativePath, policy.session)) return allow();
	return deny(`${relativePath} is outside the ${policy.session.agentId} write session (.cellix/sessions/${policy.session.agentId}.json). Other agents are unchanged. An exact true path in ocom-write.config.json stays writable.`);
}

/** Same order as decidePath, against the read map and the session read list. A path outside the workspace is not this list. */
export function decideRead(file, workspace, policy) {
	const relativePath = relativeToWorkspace(file, workspace);
	if (!relativePath) return allow();
	if (relativePath === '.cellix/sessions' || relativePath.startsWith('.cellix/sessions/')) return allow();
	const standingRule = firstMatchingAccess(relativePath, policy.read ?? {});
	if (standingRule === false) return deny(`${relativePath} is locked for read. Open ${OPEN_ROOTS}. Leave ocom-write.config.json unchanged.`);
	if (standingRule !== true) return deny(`${relativePath} is not readable. Open ${OPEN_ROOTS}. Leave ocom-write.config.json unchanged.`);
	if (exactOpen(relativePath, policy.read)) return allow();
	if (sessionAllowsRead(relativePath, policy.session)) return allow();
	return deny(`${relativePath} is outside the ${policy.session.agentId} read session (.cellix/sessions/${policy.session.agentId}.json). Other agents are unchanged. An exact true path in ocom-write.config.json stays readable.`);
}

/** A command that does not match WRITE_COMMAND is not a write, so it is allowed. A write must name at least one path. */
export function decideShell(command, workspace, policy) {
	if (/\bCELLIX_AGENT_ID\s*=\s*(?!\$)/.test(command)) return deny(RUNNER_OWNS_ID);
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
