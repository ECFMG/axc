import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { treeFingerprint, verifyCacheDir } from '../../scripts/lib/tree-fingerprint.mjs';
import { boundaryHint, git, readHookInput, readRunBase, repoRoot, stateDir, writeViolation } from './lib/harness.mjs';

// Stop: the agent may not finish while its changes are outside the write boundary or while
// `pnpm run verify` has not passed on the current working tree. A verify pass is recorded per
// tree fingerprint, so running `pnpm run verify` before stopping makes this check instant.
// Gives up after 3 blocks on the same tree so a stuck agent can still hand back to the user.

const maxBlocksPerTree = 3;
await readHookInput();

const base = readRunBase() ?? 'HEAD';
const changed = new Set([...git(['diff', '--name-only', base]).split('\n'), ...git(['ls-files', '--others', '--exclude-standard']).split('\n')].filter(Boolean));
if (changed.size === 0) {
	process.exit(0);
}

const fingerprint = treeFingerprint(repoRoot);
const attemptsFile = path.join(stateDir(), `stop-attempts-${fingerprint}`);
const attempts = existsSync(attemptsFile) ? Number(readFileSync(attemptsFile, 'utf8')) : 0;

function stopBlocked(reason) {
	if (attempts >= maxBlocksPerTree) {
		console.log(JSON.stringify({ systemMessage: `Harness: stop allowed after ${attempts} blocked attempts on the same code. Unresolved: ${reason.split('\n')[0]}` }));
		process.exit(0);
	}
	writeFileSync(attemptsFile, String(attempts + 1));
	console.log(JSON.stringify({ decision: 'block', reason }));
	process.exit(0);
}

const violations = [...changed]
	.filter((file) => file !== 'pnpm-lock.yaml')
	.map((file) => writeViolation(file))
	.filter(Boolean);
if (violations.length > 0) {
	stopBlocked(`Changes outside the allowed write boundary must be reverted (e.g. \`git restore\` / \`git checkout ${base} -- <path>\`) before finishing (${boundaryHint}):\n- ${violations.join('\n- ')}`);
}

if (existsSync(path.join(verifyCacheDir(repoRoot), 'passed', fingerprint))) {
	process.exit(0);
}

const result = spawnSync('node', ['scripts/verify.mjs'], { cwd: repoRoot, encoding: 'utf8', timeout: 25 * 60 * 1000 });
if (result.status !== 0) {
	stopBlocked(`Not done: \`pnpm run verify\` fails on the current code. Fix the failure, re-run \`pnpm run verify\`, then finish.\n\n${result.stdout}${result.stderr}`.trim());
}
