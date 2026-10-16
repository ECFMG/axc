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

// The organisation is a property of the authenticated Snyk account, not of this
// repository, so it is never hard-coded. Set SNYK_ORG to target a specific org.
const organisation = process.env.SNYK_ORG?.trim();
const args = ['test', '--all-projects', '--policy-path=.snyk'];
if (organisation !== undefined && organisation !== '') {
	args.push(`--org=${organisation}`);
}

console.log(`Snyk: running snyk ${args.join(' ')} (local CLI, no monitor, no --remote-repo-url)`);
const test = spawnSync('snyk', args, { stdio: 'inherit' });
process.exit(test.status ?? 1);
