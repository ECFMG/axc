// PreToolUse write-boundary guard (Grok Build; Claude/Copilot-shaped input also accepted). Dependency-free; fails open.
// Rules live in .github/hooks/write-boundary.json (shared with the Copilot guard). Deny rules match per line,
// so a newline can't hide a command; quoted heredoc bodies are inert text and are skipped.
import { readFileSync } from 'node:fs';
import path from 'node:path';

const WRITE_TOOLS = new Set(['search_replace', 'write', 'hashline_edit', 'edit', 'multiedit', 'create', 'create_file', 'write_file', 'apply_patch', 'strreplace', 'notebookedit', 'editnotebook', 'delete']);
const SHELL_TOOLS = new Set(['run_terminal_command', 'bash', 'shell', 'execute']);
const PATH_KEYS = ['file_path', 'filePath', 'path', 'target_file', 'target_notebook', 'notebook_path', 'file'];
const HEREDOC_QUOTED = /<<-?\s*(?:'(\w+)'|"(\w+)"|\\(\w+))/;

export const loadRules = (root) => JSON.parse(readFileSync(path.join(root, '.github/hooks/write-boundary.json'), 'utf8'));

/** Drops quoted heredoc bodies and indentation so line-anchored rules see each command. */
export function stripQuotedHeredocs(cmd) {
	const out = [];
	const lines = cmd.split('\n');
	for (let i = 0; i < lines.length; i++) {
		out.push(lines[i]);
		const m = HEREDOC_QUOTED.exec(lines[i]);
		if (!m) continue;
		const end = m[1] ?? m[2] ?? m[3];
		while (i + 1 < lines.length && lines[i + 1].trim() !== end) i++;
		i++;
	}
	return out.map((line) => line.trimStart()).join('\n');
}

const firstMatch = (rules, text, flags) => rules.find(([pattern]) => new RegExp(pattern, flags).test(text))?.[1];

const inGlobs = (rel, globs) => globs.some((g) => (g.endsWith('/**') ? rel === g.slice(0, -3) || rel.startsWith(g.slice(0, -2)) : rel === g));

export function check(input, rules, root) {
	const tool = String(input.toolName ?? input.tool_name ?? '').toLowerCase();
	const args = input.toolInput ?? input.tool_input ?? {};
	if (SHELL_TOOLS.has(tool)) {
		const reason = firstMatch(rules.bash_deny ?? [], stripQuotedHeredocs(String(args.command ?? '')), 'im');
		return reason && `BLOCKED (write-boundary): ${reason}`;
	}
	if (!WRITE_TOOLS.has(tool)) return undefined;
	for (const key of PATH_KEYS) {
		if (typeof args[key] !== 'string' || !args[key]) continue;
		const rel = path.relative(root, path.resolve(root, args[key])).split(path.sep).join('/');
		const denied = firstMatch(rules.path_deny ?? [], rel, 'i');
		if (denied) return `BLOCKED (write-boundary): ${denied} Path: ${rel}`;
		if (!inGlobs(rel, rules.allowed_write_globs ?? [])) return `BLOCKED (write-boundary): outside allowed write paths: ${rel}. Writable: ${rules.allowed_write_globs.join(', ')}`;
	}
	return undefined;
}

if (import.meta.url === `file://${process.argv[1]}`) {
	try {
		const input = JSON.parse(readFileSync(0, 'utf8') || '{}');
		const root = input.workspaceRoot ?? process.env.CLAUDE_PROJECT_DIR ?? input.cwd ?? process.cwd();
		const reason = check(input, loadRules(root), root);
		if (reason) process.stdout.write(JSON.stringify({ decision: 'deny', reason, hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: reason } }));
	} catch {
		// fail open
	}
}
