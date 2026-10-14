/**
 * AgentCourses - Harness-Agnostic Verification
 *
 * Runs the repository's existing verification pipeline.
 * Captures console output and produces structured evidence.
 *
 * Usage:
 *   node scripts/verify-agent-work.mjs
 *
 * Outputs:
 *   .verification/last-run.log
 *   .verification/last-run.json
 *
 * Exit codes:
 *   0 = verification passed
 *   1 = verification failed
 */

import { spawn } from 'node:child_process';
import { createWriteStream, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(scriptDirectory, '..');

const outputDirectory = join(repositoryRoot, '.verification');
const logPath = join(outputDirectory, 'last-run.log');
const resultPath = join(outputDirectory, 'last-run.json');

const command = 'pnpm';
const args = ['run', 'verify'];

mkdirSync(outputDirectory, { recursive: true });

const startedAt = new Date();
const startTime = performance.now();

console.log('AgentCourses Verification');
console.log('=========================');
console.log(`Repository: ${repositoryRoot}`);
console.log(`Command: ${command} ${args.join(' ')}`);
console.log(`Started: ${startedAt.toISOString()}`);
console.log('');

const logStream = createWriteStream(logPath, { flags: 'w' });

const child = spawn(command, args, {
	cwd: repositoryRoot,
	env: process.env,
	shell: process.platform === 'win32',
	stdio: ['ignore', 'pipe', 'pipe'],
});

child.stdout.on('data', (chunk) => {
	process.stdout.write(chunk);
	logStream.write(chunk);
});

child.stderr.on('data', (chunk) => {
	process.stderr.write(chunk);
	logStream.write(chunk);
});

let completed = false;

function finish(exitCode, signal = null, error = null) {
	if (completed) return;
	completed = true;

	const finishedAt = new Date();
	const durationSeconds = Number(((performance.now() - startTime) / 1000).toFixed(2));

	const passed = exitCode === 0 && !signal && !error;

	const result = {
		project: 'agentCourses',
		verificationCommand: `${command} ${args.join(' ')}`,
		status: passed ? 'PASS' : 'FAIL',
		exitCode,
		signal,
		error: error ? String(error.message ?? error) : null,
		startedAt: startedAt.toISOString(),
		finishedAt: finishedAt.toISOString(),
		durationSeconds,
		logFile: '.verification/last-run.log',
	};

	writeFileSync(resultPath, JSON.stringify(result, null, 2) + '\n');

	logStream.end();

	console.log('');
	console.log('=========================');
	console.log(`Verification: ${result.status}`);
	console.log(`Duration: ${durationSeconds}s`);
	console.log(`Exit code: ${exitCode}`);
	console.log(`Log: ${logPath}`);
	console.log(`Results: ${resultPath}`);

	if (!passed) {
		console.error('');
		console.error('Verification failed.');
		console.error('Review the log and resolve failures before completion.');
	}

	process.exitCode = passed ? 0 : 1;
}

child.on('error', (error) => {
	finish(1, null, error);
});

child.on('close', (code, signal) => {
	finish(code, signal);
});
