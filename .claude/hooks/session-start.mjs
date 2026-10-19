import { rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { git, readHookInput, repoRoot, stateDir } from './lib/harness.mjs';

// SessionStart: on a fresh session, removes gitignored build output (stale dist/ from earlier
// runs can leak a previous solution and mislead type resolution) and records HEAD as the run
// base the Stop hook diffs against. Resumed and compacted sessions keep both.

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
