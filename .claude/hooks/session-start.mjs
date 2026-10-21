import { spawn } from 'node:child_process';
import { rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { git, readHookInput, repoRoot, stateDir } from './lib/harness.mjs';

// SessionStart: on a fresh session, removes gitignored build output (stale dist/ from earlier
// runs can leak a previous solution and mislead type resolution), records HEAD as the run base
// the Stop hook diffs against, and snapshots the audit/Snyk findings of that base in the
// background (scripts/security-baseline.mjs) so verify can tell pre-existing findings from new
// ones. Resumed and compacted sessions keep all three.

const input = await readHookInput();
if (input.source !== 'startup') {
	process.exit(0);
}

const buildOutput = /(^|\/)(dist|build|target|reports|deploy|coverage|\.docusaurus|\.turbo)\/$|\.(tsbuildinfo|zip)$/;
const ignored = git(['ls-files', '--others', '--ignored', '--exclude-standard', '--directory', '--', 'apps', 'packages'])
	.split('\n')
	.filter((entry) => entry && !entry.includes('node_modules') && buildOutput.test(entry));
for (const entry of ignored) {
	rmSync(path.join(repoRoot, entry), { recursive: true, force: true });
}

writeFileSync(path.join(stateDir(), 'run-base'), git(['rev-parse', 'HEAD']));
rmSync(path.join(stateDir(), 'active-task-set'), { force: true });

spawn(process.execPath, [path.join(repoRoot, 'scripts', 'security-baseline.mjs')], { cwd: repoRoot, detached: true, stdio: 'ignore' }).unref();
