import { spawnSync } from 'node:child_process';

function run(args) {
	return spawnSync('snyk', args, { encoding: 'utf8' });
}

const version = run(['--version']);
if (version.status !== 0) {
	console.log('Snyk: SKIPPED');
	console.log('Reason: the snyk CLI is not available on PATH.');
	console.log('This is NON-BLOCKING for the first scaffold only. Install the Snyk CLI and authenticate before treating security results as enforced.');
	process.exit(0);
}

console.log('Snyk: running snyk test --all-projects --policy-path=.snyk (local CLI, no monitor, no --remote-repo-url)');
// Extra arguments (verify passes --json-file-output for its baseline comparison) go to snyk test.
const test = spawnSync('snyk', ['test', '--all-projects', '--policy-path=.snyk', ...process.argv.slice(2)], { stdio: 'inherit' });
process.exit(test.status ?? 1);
