// identity.mjs reads CELLIX_AGENT_ID. sessionStart sets it when the process has none.
// session.mjs is one agent's file list.
// write/agent-access.mjs compiles the ocom read and write maps.
// write/shell.mjs decides which shell commands can write.
// write/decide.mjs applies the map, then an exact true path, then the session.
// budget.mjs decides what may enter the transcript. scripts/check-budget.mjs re-exports it.
// report.mjs is the error block agent-check prints. Expected comes first.
// verify-flag.mjs records a passing pnpm run verify.

export { agentIdFromEnv, agentIdFromSession, clearSession, ensureStartupSession, loadSession, recordSession, STARTUP_READ, sessionAllows, sessionAllowsRead, sessionFile } from './session.mjs';
export { checkFlag, workingTree, writeFlag } from './verify-flag.mjs';
export { matchGlob, relativeToWorkspace } from './write/agent-access.mjs';
export { decidePath, decideRead, decideShell, policyFromConfig } from './write/decide.mjs';
