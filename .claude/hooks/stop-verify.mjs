import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { treeFingerprint, verifyCacheDir } from '../../scripts/lib/tree-fingerprint.mjs';
import { boundaryHint, findTaskSet, git, isTracked, readActiveTaskSet, readHookInput, readRunBase, referencedCriteria, repoRoot, stateDir, writeViolation } from './lib/harness.mjs';

// Stop: the agent may not finish while its changes are outside the write boundary, while an
// acceptance criterion of the active task set has no test referencing it, or while
// `pnpm run verify` has not passed on the current working tree. A verify pass is recorded per
// tree fingerprint, so running `pnpm run verify` before stopping makes this check instant.
// Gives up after a few blocks so a stuck agent can still hand back to the user, and says so.

const maxBlocksPerTree = 3;
const maxBoundaryBlocks = 6;
await readHookInput();

const base = readRunBase() ?? 'HEAD';
const changed = new Set([...git(['diff', '--name-only', base]).split('\n'), ...git(['ls-files', '--others', '--exclude-standard']).split('\n')].filter(Boolean));
if (changed.size === 0) {
	process.exit(0);
}

function counter(name) {
	const file = path.join(stateDir(), name);
	const count = existsSync(file) ? Number(readFileSync(file, 'utf8')) : 0;
	return { count, increment: () => writeFileSync(file, String(count + 1)) };
}

function stop(reason, attempts, limit) {
	if (attempts.count >= limit) {
		console.log(JSON.stringify({ systemMessage: `Harness: stop allowed after ${attempts.count} blocked attempts. UNRESOLVED: ${reason}` }));
		process.exit(0);
	}
	attempts.increment();
	console.log(JSON.stringify({ decision: 'block', reason }));
	process.exit(0);
}

// Boundary violations are counted across trees: reverting changes the tree, so a per-tree
// counter would never run out while the agent edits around the problem.
const outside = [...changed].filter((file) => file !== 'pnpm-lock.yaml' && writeViolation(file));
if (outside.length > 0) {
	const tracked = outside.filter((file) => isTracked(file) || git(['ls-tree', '--name-only', base, '--', file]) !== '');
	const created = outside.filter((file) => !tracked.includes(file));
	const steps = [tracked.length > 0 ? `git restore --source=${base} --staged --worktree -- ${tracked.join(' ')}` : '', created.length > 0 ? `rm ${created.join(' ')}` : ''].filter(Boolean);
	stop(
		`Changes outside the allowed write boundary must be reverted before finishing (${boundaryHint}):\n- ${outside.map((file) => writeViolation(file)).join('\n- ')}\nRevert with:\n  ${steps.join('\n  ')}\nIf the task cannot be done without them, say so in the summary instead.`,
		counter('stop-boundary-blocks'),
		maxBoundaryBlocks,
	);
}

const fingerprint = treeFingerprint(repoRoot);
const treeAttempts = counter(`stop-attempts-${fingerprint}`);

const taskSet = (() => {
	const id = readActiveTaskSet();
	return id ? findTaskSet(id) : undefined;
})();
if (taskSet) {
	const referenced = referencedCriteria();
	const missing = taskSet.criteria.filter((criterion) => !referenced.has(criterion.id));
	if (missing.length > 0) {
		stop(
			`Not done: these ${taskSet.taskSetId} acceptance criteria (${taskSet.file}) have no test referencing them. Add or tag the test that proves each one (Cucumber @ID on the scenario, or the ID in a vitest test name), then re-run \`pnpm run verify\`:\n- ${missing.map((criterion) => `${criterion.id}: ${criterion.text}`).join('\n- ')}`,
			treeAttempts,
			maxBlocksPerTree,
		);
	}
}

if (existsSync(path.join(verifyCacheDir(repoRoot), 'passed', fingerprint))) {
	process.exit(0);
}

const result = spawnSync('node', ['scripts/verify.mjs'], { cwd: repoRoot, encoding: 'utf8', timeout: 25 * 60 * 1000 });
if (result.status !== 0) {
	stop(`Not done: \`pnpm run verify\` fails on the current code. Fix the failure, re-run \`pnpm run verify\`, then finish.\n\n${result.stdout}${result.stderr}`.trim(), treeAttempts, maxBlocksPerTree);
}
