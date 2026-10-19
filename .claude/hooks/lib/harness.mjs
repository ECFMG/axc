import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

// Shared helpers for the Claude Code hooks in .claude/hooks. The write boundary mirrors the
// "allowed write boundary" in task-set-a-prompt.md and task-set-b-prompt.md.

export const repoRoot = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();

export async function readHookInput() {
	let raw = '';
	for await (const chunk of process.stdin) {
		raw += chunk;
	}
	return raw ? JSON.parse(raw) : {};
}

// Exit code 2 blocks the tool call and shows the message to Claude.
export function block(message) {
	process.stderr.write(`${message}\n`);
	process.exit(2);
}

export function stateDir() {
	const dir = path.join(repoRoot, 'node_modules', '.cache', 'axc-harness');
	mkdirSync(dir, { recursive: true });
	return dir;
}

export function git(args) {
	return execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8' }).trim();
}

const allowedPrefixes = ['apps/api/', 'apps/docs/', 'packages/axc/application-services/', 'packages/axc/domain/', 'packages/axc/persistence/', 'packages/axc/rest/', 'packages/axc/service-mongoose/', 'packages/axc-verification/'];

export const boundaryHint = `Allowed: ${allowedPrefixes.join(', ')}. Harness files, root configs, CI, and scripts are off limits.`;

const configRules = /(^|\/)(tsconfig[^/]*\.json|biome\.jsonc?)$/;
const secretFiles = /(^|\/)(\.env[^/]*|local\.settings\.json)$/;

function isTracked(relPath) {
	try {
		return git(['ls-files', '--', relPath]) !== '';
	} catch {
		return false;
	}
}

// Returns a repo-relative path, or undefined when the path is outside the repository.
export function toRepoPath(filePath, cwd = repoRoot) {
	const rel = path.relative(repoRoot, path.resolve(cwd, filePath));
	if (rel === '' || rel.startsWith('..') || path.isAbsolute(rel)) {
		return undefined;
	}
	return rel.split(path.sep).join('/');
}

// Returns a reason string when the path must not be written, otherwise undefined.
export function writeViolation(relPath) {
	if (relPath === undefined) {
		return undefined;
	}
	if (secretFiles.test(relPath)) {
		return `${relPath} holds environment settings or secrets, which the task forbids changing.`;
	}
	if (relPath.startsWith('packages/cellix/')) {
		const pkg = relPath.split('/')[2];
		if (pkg && isTracked(`packages/cellix/${pkg}`)) {
			return `${relPath} is in a vendored CellixJS package. These must never deviate from upstream; change the axc code that uses it instead.`;
		}
		return undefined;
	}
	if (configRules.test(relPath) && (isTracked(relPath) || existsSync(path.join(repoRoot, relPath)))) {
		return `${relPath} holds TypeScript/Biome rules. Changing them is an automatic fail; change the code to satisfy the rules instead.`;
	}
	if (relPath !== 'packages/axc/README.md' && !allowedPrefixes.some((prefix) => relPath.startsWith(prefix))) {
		return `${relPath} is outside the allowed write boundary.`;
	}
	return undefined;
}

export function readRunBase() {
	const file = path.join(stateDir(), 'run-base');
	return existsSync(file) ? readFileSync(file, 'utf8').trim() : undefined;
}
