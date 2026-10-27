// session.mjs is one agent's file list.
// write/agent-access.mjs reads ocom-write.config.json patterns.
// write/shell.mjs decides which shell commands can write.
// write/decide.mjs applies those three in order.
// verify-flag.mjs records a passing pnpm run verify.

export { agentIdFromEnv, clearSession, loadSession, recordSession, sessionAllows, sessionAllowsRead, sessionFile } from './session.mjs';
export { checkFlag, workingTree, writeFlag } from './verify-flag.mjs';
export { matchGlob, relativeToWorkspace } from './write/agent-access.mjs';
export { decidePath, decideRead, decideShell, policyFromConfig } from './write/decide.mjs';
