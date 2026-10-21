import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs';
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

export function isTracked(relPath) {
	try {
		return git(['ls-files', '--', relPath]) !== '';
	} catch {
		return false;
	}
}

/** A file this run created: untracked, not gitignored (local .env files and build output are ignored), and not a secrets file. */
export function isCreatedThisRun(relPath) {
	if (isTracked(relPath) || secretFiles.test(relPath)) {
		return false;
	}
	try {
		execFileSync('git', ['check-ignore', '-q', '--', relPath], { cwd: repoRoot });
		return false;
	} catch {
		return true;
	}
}

/** An untracked config file identical to a tracked one of the same name (e.g. rest copying application-services' tsconfig.vitest.json) adds no rules. */
function isVerbatimConfigCopy(relPath) {
	const absolute = path.join(repoRoot, relPath);
	if (isTracked(relPath) || !existsSync(absolute)) {
		return false;
	}
	const content = readFileSync(absolute, 'utf8').trim();
	const name = path.posix.basename(relPath);
	return git(['ls-files', '--', name, `*/${name}`])
		.split('\n')
		.filter(Boolean)
		.some((tracked) => readFileSync(path.join(repoRoot, tracked), 'utf8').trim() === content);
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
	if (configRules.test(relPath) && (isTracked(relPath) || existsSync(path.join(repoRoot, relPath))) && !isVerbatimConfigCopy(relPath)) {
		return `${relPath} holds TypeScript/Biome rules. Changing them is an automatic fail; change the code to satisfy the rules instead. (A new package may copy an existing package's tsconfig file byte for byte.)`;
	}
	// `${relPath}/` also accepts the package directory itself (mkdir -p packages/axc/rest, cp x packages/axc/rest).
	if (relPath !== 'packages/axc/README.md' && !allowedPrefixes.some((prefix) => `${relPath}/`.startsWith(prefix))) {
		return `${relPath} is outside the allowed write boundary.`;
	}
	return undefined;
}

export function readRunBase() {
	const file = path.join(stateDir(), 'run-base');
	return existsSync(file) ? readFileSync(file, 'utf8').trim() : undefined;
}

// Task sets: the prompt names a Task Set ID; its requirements file lists acceptance criteria as
// `| A-AC3 | ... |` rows. Mirrors packages/axc-verification/archunit-tests/src/rules/requirements-traceability.ts.

export function findTaskSet(taskSetId) {
	for (const name of readdirSync(repoRoot).filter((file) => /^task-set-[\w-]+-requirements\.md$/.test(file))) {
		const content = readFileSync(path.join(repoRoot, name), 'utf8');
		if (/^\| ?Task Set ID ?\|([^|\n]*)\|/m.exec(content)?.[1]?.trim() === taskSetId) {
			const criteria = [...content.matchAll(/^\| ?([A-Z]+-AC\d+) ?\|([^|\n]*)\|/gm)].map((match) => ({ id: match[1], text: match[2].trim() })).filter((criterion) => !/^Existing tests still pass/i.test(criterion.text));
			return { taskSetId, file: name, criteria };
		}
	}
	return undefined;
}

/** Acceptance-criteria IDs referenced by Cucumber tags or test names anywhere in the verification and app test files. */
export function referencedCriteria() {
	const files = git(['ls-files', '--cached', '--others', '--exclude-standard', '--', 'packages/axc', 'packages/axc-verification', 'apps/api'])
		.split('\n')
		.filter((file) => /\.(feature|test\.ts|steps\.ts)$/.test(file) && !file.endsWith('/axc-layer-rules.test.ts') && existsSync(path.join(repoRoot, file)));
	const referenced = new Set();
	for (const file of files) {
		for (const match of readFileSync(path.join(repoRoot, file), 'utf8').matchAll(/(?<![\w-])@?([A-Z]+-AC\d+)\b/g)) {
			referenced.add(match[1]);
		}
	}
	return referenced;
}

export function readActiveTaskSet() {
	const file = path.join(stateDir(), 'active-task-set');
	return existsSync(file) ? readFileSync(file, 'utf8').trim() : undefined;
}
