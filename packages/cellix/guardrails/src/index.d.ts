export interface AgentSession {
	agentId: string;
	files?: string[];
	write?: string[];
	read?: string[];
}

export interface AccessPolicy {
	read: Record<string, boolean>;
	write: Record<string, boolean>;
	agentAccess: Record<string, boolean>;
	session: AgentSession | null;
}

export interface AccessDecision {
	ok: boolean;
	message: string;
}

export interface VerifyFlag {
	flag: 'pass';
	exitCode: 0;
	endedAt: string;
	head: string;
	tree: string;
}

export function agentIdFromEnv(env?: NodeJS.ProcessEnv): string;
export function agentIdFromSession(payload?: { conversation_id?: string; session_id?: string }, env?: NodeJS.ProcessEnv): string;
export function sessionFile(root: string, agentId: string): string;
export const STARTUP_READ: readonly string[];
export function ensureStartupSession(root: string, agentId: string): AgentSession | null;
export function noteActiveAgent(root: string, agentId: string): void;
export function agentIdForRecord(root: string, env?: NodeJS.ProcessEnv): string;
export function loadSession(root: string, agentId: string): AgentSession | null;
export function sessionAllows(relative: string, session: AgentSession | null): boolean;
export function sessionAllowsRead(relative: string, session: AgentSession | null): boolean;
export function recordSession(root: string, agentId: string, files: readonly string[] | { read?: readonly string[]; write?: readonly string[]; files?: readonly string[] }): string;
export function clearSession(root: string, agentId: string): void;
export function policyFromConfig(config?: { read?: Record<string, boolean>; write?: Record<string, boolean>; agentAccess?: Record<string, boolean> }, session?: AgentSession | null): AccessPolicy;
export function decidePath(file: string, workspace: string, policy: AccessPolicy): AccessDecision;
export function decideRead(file: string, workspace: string, policy: AccessPolicy): AccessDecision;
export function decideShell(command: string, workspace: string, policy: AccessPolicy): AccessDecision;
export function matchGlob(glob: string, relative: string): boolean;
export function relativeToWorkspace(file: string, workspace: string): string;
export function workingTree(cwd: string): { head: string; tree: string };
export function writeFlag(cwd: string): VerifyFlag;
export function checkFlag(cwd: string): boolean;
