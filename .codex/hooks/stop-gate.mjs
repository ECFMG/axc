// Codex Stop hook: before the agent finishes a turn that changed the working
// tree, run the network-free verification checks and send failures back to the
// agent as a continuation prompt. Capped so a persistent failure cannot loop.
// Every gate run is appended to an evidence log outside the repository so the
// run record can quote what was actually executed.
import { appendFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { findRepositoryRoot, readHookInput, respond, run, stripAnsi } from './lib/hook-io.mjs';

const MAX_AUTOMATIC_CONTINUATIONS = 2;
const FAILURE_TAIL_LINES = 40;
const FAILURE_TAIL_CHARACTERS = 6000;

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

// Paths changed by commits the agent made in this run (HEAD ahead of the
// branch's upstream). The gate must still run when the agent committed, so a
// clean working tree alone does not skip it.
function listCommittedPaths(root) {
	const upstream = run('git', ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{upstream}'], root);
	if (upstream.status !== 0) {
		return [];
	}
	const result = run('git', ['diff', '--name-only', `${upstream.stdout.trim()}...HEAD`], root);
	if (result.status !== 0) {
		return [];
	}
	return result.stdout.split('\n').filter((line) => line.trim() !== '');
}

function touchesPackageManifest(changedPaths) {
	return changedPaths.some((path) => path === 'package.json' || path.endsWith('/package.json'));
}

function stateDirectory() {
	const directory = join(tmpdir(), 'codex-stop-gate');
	mkdirSync(directory, { recursive: true });
	return directory;
}

function readContinuationCount(statePath) {
	try {
		return JSON.parse(readFileSync(statePath, 'utf8')).count;
	} catch {
		return 0;
	}
}

function tailOf(text) {
	const lines = stripAnsi(text).trimEnd().split('\n');
	const tail = lines.slice(-FAILURE_TAIL_LINES).join('\n');
	return tail.slice(-FAILURE_TAIL_CHARACTERS);
}

function runChecks(root, checks) {
	const results = [];
	let failure;
	for (const check of checks) {
		const startedAt = Date.now();
		const result = run(check.command, check.args, root);
		const entry = { label: check.label, command: [check.command, ...check.args].join(' '), status: result.status, ms: Date.now() - startedAt };
		const turboSummary = /(\d+) cached, (\d+) total/.exec(stripAnsi(result.stdout ?? ''));
		if (turboSummary) {
			// Records how much of a turbo task was replayed, so a suspicious all-cached pass is visible in the run record.
			entry.turboCached = Number(turboSummary[1]);
			entry.turboTotal = Number(turboSummary[2]);
		}
		results.push(entry);
		if (result.status !== 0) {
			failure = { check, output: tailOf(`${result.stdout ?? ''}\n${result.stderr ?? ''}`) };
			break;
		}
	}
	return { results, failure };
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

function appendEvidence(evidencePath, entry) {
	appendFileSync(evidencePath, `${JSON.stringify(entry)}\n`);
}

function main() {
	const input = readHookInput();
	const root = findRepositoryRoot(input.cwd ?? process.cwd());
	if (root === undefined) {
		respond({ continue: true });
		return;
	}

	const uncommittedPaths = listChangedPaths(root);
	const committedPaths = listCommittedPaths(root);
	const changedPaths = [...new Set([...uncommittedPaths, ...committedPaths])];
	if (changedPaths.length === 0) {
		respond({ continue: true });
		return;
	}

	const sessionId = input.session_id ?? 'unknown-session';
	const directory = stateDirectory();
	const statePath = join(directory, `${sessionId}.json`);
	const evidencePath = join(directory, `${sessionId}-evidence.jsonl`);
	const continuationCount = readContinuationCount(statePath);

	const checks = touchesPackageManifest(changedPaths) ? [LOCKFILE_CHECK, ...GATE_CHECKS] : GATE_CHECKS;
	const { results, failure } = runChecks(root, checks);
	appendEvidence(evidencePath, {
		at: new Date().toISOString(),
		continuation: continuationCount,
		changedFiles: changedPaths.length,
		uncommittedFiles: uncommittedPaths.length,
		committedFiles: committedPaths.length,
		passed: failure === undefined,
		checks: results,
	});

	if (failure === undefined) {
		rmSync(statePath, { force: true });
		respond({ continue: true, systemMessage: `Stop gate passed (${results.length} checks). Evidence: ${evidencePath}` });
		return;
	}

	if (continuationCount >= MAX_AUTOMATIC_CONTINUATIONS) {
		rmSync(statePath, { force: true });
		respond({ continue: true, systemMessage: `Stop gate still failing after ${MAX_AUTOMATIC_CONTINUATIONS} automatic continuations: ${failure.check.label}. Evidence: ${evidencePath}` });
		return;
	}

	writeFileSync(statePath, JSON.stringify({ count: continuationCount + 1 }));
	respond({ decision: 'block', reason: describeFailure(failure) });
}

main();
