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

const test = spawnSync('snyk', ['test', '--all-projects', '--policy-path=.snyk'], { encoding: 'utf8' });
if ((test.status ?? 1) === 0) {
	console.log('Snyk: ok');
	process.exit(0);
}
const output = `${test.stdout ?? ''}\n${test.stderr ?? ''}`;
const summary = output.split('\n').filter((line) => /SNYK-|✗|Tested |introduced by|Upgrade|security/i.test(line));
console.error(summary.length > 0 ? summary.join('\n') : output.slice(-4000));
console.error('Snyk: failed');
process.exit(test.status ?? 1);
