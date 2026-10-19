import { spawnSync } from 'node:child_process';
import { closeSync, mkdtempSync, openSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { commandText, isVerify, readBudget, recordVerify, rejectionReason } from './check-budget.mjs';

const args = process.argv.slice(2);
if (args[0] === '--') {
	args.shift();
}

if (args.length === 0) {
	console.error('Usage: node scripts/agent-check.mjs -- <command> [args...]');
	process.exit(2);
}

const [command, ...commandArgs] = args;
const displayCommand = [command, ...commandArgs].map(formatArgument).join(' ');
const requestedText = commandText(command, commandArgs);
const blocked = rejectionReason(requestedText, readBudget());
if (blocked !== undefined) {
	console.error(`FAIL: ${displayCommand}`);
	console.error(blocked);
	process.exit(1);
}

const directory = mkdtempSync(join(tmpdir(), 'axc-agent-check-'));
const logPath = join(directory, 'command.log');
const logFile = openSync(logPath, 'w');
const result = spawnSync(command, commandArgs, {
	cwd: process.cwd(),
	env: process.env,
	stdio: ['ignore', logFile, logFile],
});
closeSync(logFile);

if (isVerify(requestedText)) {
	recordVerify(result.status ?? 1);
}

if (result.status === 0) {
	console.log(`PASS: ${displayCommand}`);
	process.exit(0);
}

const exitCode = result.status ?? 1;
const log = stripAnsi(readFileSync(logPath, 'utf8'));
const lines = log.split(/\r?\n/);
const failedCheck = findFailedCheck(lines);
const errorBlock = findErrorBlock(lines);

console.error(`FAIL: ${displayCommand}`);
console.error(`Exit code: ${exitCode}`);
if (failedCheck !== undefined) {
	console.error(`Failed check: ${failedCheck}`);
}
if (result.error !== undefined) {
	console.error(`Cause: ${result.error.message}`);
}
console.error(`Log: ${logPath}`);
if (errorBlock.length > 0) {
	console.error('Error:');
	console.error(errorBlock.join('\n'));
}

process.exit(exitCode);

function formatArgument(value) {
	return /^[A-Za-z0-9_./:@=-]+$/.test(value) ? value : JSON.stringify(value);
}

function stripAnsi(value) {
	return value.replace(/\u001B\[[0-?]*[ -/]*[@-~]/g, '');
}

function findFailedCheck(lines) {
	for (const line of lines) {
		const failed = line.match(/^\s*Failed:\s*(.+)\s*$/);
		if (failed !== null) {
			return failed[1];
		}
		const turbo = line.match(/\bERROR\s+(@?\S+#\S+):/);
		if (turbo !== null) {
			return turbo[1];
		}
	}
	return undefined;
}

function findErrorBlock(lines) {
	const specificPatterns = [
		/^\s*[×✗]\s*/,
		/\bfunction timed out\b/i,
		/\bExecution failed\b/i,
		/\bFound \d+ errors?\b/i,
		/\bUnused exports?(?:ed)?\b/i,
		/\bUndefined(?: step|\. Implement with)\b/,
		/\bis not a function\b/,
		/\d+ failing\b/i,
		/\bscenarios?.*\bfailed\b/i,
		/\bFAIL\b/,
		/AssertionError:/,
		/\berror TS\d+:/i,
		/\bFailed Tests\b/i,
	];
	const specificIndexes = specificPatterns.map((pattern) => lines.findIndex((line) => pattern.test(line))).filter((candidate) => candidate !== -1);
	const index = specificIndexes.length > 0 ? Math.min(...specificIndexes) : lines.findIndex((line) => /\[ELIFECYCLE\]|\bERROR\b/.test(line));

	if (index === -1) {
		return lines.filter((line) => line.trim() !== '').slice(-12);
	}

	const window = lines.slice(Math.max(0, index - 1), Math.min(lines.length, index + 16));
	return isVitestSelection(lines[index]) ? includeVitestContext(lines, window) : window;
}

function isVitestSelection(line) {
	return line !== undefined && (/^\s*FAIL\b/.test(line) || /AssertionError:/.test(line) || /\bFailed Tests\b/i.test(line));
}

function includeVitestContext(lines, window) {
	const present = new Set(window);
	const additions = [];
	for (const line of [findTestName(lines), ...labeledContext(lines, 'Expected'), ...labeledContext(lines, 'Received'), findSourceLocation(lines)]) {
		if (line !== undefined && !present.has(line)) {
			present.add(line);
			additions.push(line);
		}
	}
	return additions.length === 0 ? window : [...window, ...additions];
}

function findTestName(lines) {
	return lines.find((line) => /^\s*FAIL\s+\S/.test(line));
}

function findSourceLocation(lines) {
	return lines.find((line) => /^\s*(?:❯|at )\s+\S+:\d+:\d+/.test(line));
}

function labeledContext(lines, label) {
	const pattern = new RegExp(String.raw`^\s*[-+]?\s*${label}\b`, 'i');
	const index = lines.findIndex((line) => pattern.test(line));
	if (index === -1) {
		return [];
	}
	const context = [lines[index]];
	const value = lines.slice(index + 1).find((line) => line.trim() !== '');
	if (value !== undefined && value.trim().length <= 200 && !/Expected|Received/i.test(value)) {
		context.push(value);
	}
	return context;
}
