// Codex Stop hook: before the agent finishes a turn that changed the working
// tree, run the network-free verification checks and send failures back to the
// agent as a continuation prompt. Capped so a persistent failure cannot loop.
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const MAX_AUTOMATIC_CONTINUATIONS = 2;
const FAILURE_TAIL_LINES = 40;
const FAILURE_TAIL_CHARACTERS = 6000;
const ANSI_ESCAPE_PATTERN = /\u001b\[[0-9;]*[A-Za-z]/g;

const GATE_CHECKS = [
	{ label: 'dependency script policy', command: 'node', args: ['scripts/check-script-policy.mjs'] },
	{ label: 'biome check', command: 'pnpm', args: ['exec', 'biome', 'check', '.'] },
	{ label: 'typecheck', command: 'pnpm', args: ['run', 'typecheck', '--output-logs=errors-only'] },
	{ label: 'build', command: 'pnpm', args: ['run', 'build', '--output-logs=errors-only'] },
	{ label: 'knip', command: 'pnpm', args: ['run', 'knip'] },
	{ label: 'architecture tests', command: 'pnpm', args: ['run', 'test:arch', '--output-logs=errors-only'] },
	{ label: 'tests', command: 'pnpm', args: ['run', 'test', '--output-logs=errors-only'] },
];

const LOCKFILE_CHECK = { label: 'frozen lockfile install', command: 'pnpm', args: ['install', '--offline', '--frozen-lockfile'] };

function readHookInput() {
	const raw = readFileSync(0, 'utf8');
	if (raw.trim() === '') {
		return {};
	}
	return JSON.parse(raw);
}

function respond(output) {
	process.stdout.write(`${JSON.stringify(output)}\n`);
}

function run(command, args, cwd) {
	return spawnSync(command, args, { cwd, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, env: { ...process.env, FORCE_COLOR: '0' } });
}

function findRepositoryRoot(cwd) {
	const result = run('git', ['rev-parse', '--show-toplevel'], cwd);
	if (result.status !== 0) {
		return undefined;
	}
	return result.stdout.trim();
}

function listChangedPaths(root) {
	const result = run('git', ['status', '--porcelain', '--untracked-files=all'], root);
	if (result.status !== 0) {
		return [];
	}
	return result.stdout
		.split('\n')
		.filter((line) => line.trim() !== '')
		.map((line) => line.slice(3));
}

function touchesPackageManifest(changedPaths) {
	return changedPaths.some((path) => path === 'package.json' || path.endsWith('/package.json'));
}

function continuationStatePath(sessionId) {
	const directory = join(tmpdir(), 'codex-stop-gate');
	mkdirSync(directory, { recursive: true });
	return join(directory, `${sessionId}.json`);
}

function readContinuationCount(statePath) {
	try {
		return JSON.parse(readFileSync(statePath, 'utf8')).count;
	} catch {
		return 0;
	}
}

function tailOf(text) {
	const lines = text.replace(ANSI_ESCAPE_PATTERN, '').trimEnd().split('\n');
	const tail = lines.slice(-FAILURE_TAIL_LINES).join('\n');
	return tail.slice(-FAILURE_TAIL_CHARACTERS);
}

function runChecks(root, checks) {
	for (const check of checks) {
		const result = run(check.command, check.args, root);
		if (result.status !== 0) {
			return { check, output: tailOf(`${result.stdout ?? ''}\n${result.stderr ?? ''}`) };
		}
	}
	return undefined;
}

function describeFailure(failure) {
	const commandLine = [failure.check.command, ...failure.check.args].join(' ');
	return [
		`Automated stop gate: \`${commandLine}\` (${failure.check.label}) failed on the current working tree.`,
		'Fix the cause in your change, then finish again. Do not weaken, skip or narrow checks or tests to get past this gate.',
		'If the failure is pre-existing on the base commit or outside the task scope, do not work around it: say so in your final summary.',
		'Output tail:',
		'```',
		failure.output,
		'```',
	].join('\n');
}

function main() {
	const input = readHookInput();
	const root = findRepositoryRoot(input.cwd ?? process.cwd());
	if (root === undefined) {
		respond({ continue: true });
		return;
	}

	const changedPaths = listChangedPaths(root);
	if (changedPaths.length === 0) {
		respond({ continue: true });
		return;
	}

	const statePath = continuationStatePath(input.session_id ?? 'unknown-session');
	const continuationCount = readContinuationCount(statePath);

	const checks = touchesPackageManifest(changedPaths) ? [LOCKFILE_CHECK, ...GATE_CHECKS] : GATE_CHECKS;
	const failure = runChecks(root, checks);

	if (failure === undefined) {
		rmSync(statePath, { force: true });
		respond({ continue: true });
		return;
	}

	if (continuationCount >= MAX_AUTOMATIC_CONTINUATIONS) {
		rmSync(statePath, { force: true });
		respond({ continue: true, systemMessage: `Stop gate still failing after ${MAX_AUTOMATIC_CONTINUATIONS} automatic continuations: ${failure.check.label}.` });
		return;
	}

	writeFileSync(statePath, JSON.stringify({ count: continuationCount + 1 }));
	respond({ decision: 'block', reason: describeFailure(failure) });
}

main();
