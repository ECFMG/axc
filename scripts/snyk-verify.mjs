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

// Local CLI only (no monitor, no --remote-repo-url). One line on success; full output on failure.
const test = run(['test', '--all-projects', '--policy-path=.snyk']);
const output = `${test.stdout ?? ''}${test.stderr ?? ''}`;
if (test.status === 0) {
	const projects = (output.match(/no vulnerable paths found/g) ?? []).length;
	console.log(`Snyk: ok (${projects} projects, snyk test --all-projects --policy-path=.snyk)`);
	process.exit(0);
}
process.stdout.write(output);
console.log(`Snyk: FAILED (exit ${test.status ?? 'signal'})`);
process.exit(test.status ?? 1);
