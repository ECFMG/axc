import { spawnSync } from 'node:child_process';
import { appendFileSync, closeSync, mkdtempSync, openSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { errorBlock } from '../packages/cellix/guardrails/src/report.mjs';
import { checkFlag } from '../packages/cellix/guardrails/src/verify-flag.mjs';

const args = process.argv.slice(2);
if (args[0] === '--') args.shift();

if (args.length === 0) {
	console.error('Usage: pnpm run agent-check -- pnpm run verify');
	process.exit(2);
}

const [command, ...commandArgs] = args;
const displayCommand = [command, ...commandArgs].map(formatArgument).join(' ');
const requested = displayCommand;

if (isVerify(requested) && checkFlag(process.cwd())) {
	console.log(`PASS: ${displayCommand}`);
	console.log('CELLIX_VERIFY=pass');
	process.exit(0);
}

const directory = mkdtempSync(join(tmpdir(), 'cellix-agent-check-'));
const logPath = join(directory, 'command.log');
const logFile = openSync(logPath, 'w');
const result = spawnSync(command, commandArgs, {
	cwd: process.cwd(),
	env: process.env,
	stdio: ['ignore', logFile, logFile],
});
closeSync(logFile);

const log = stripAnsi(readFileSync(logPath, 'utf8'));
const hints = result.status !== 0 && acceptanceFailed(requested, log) ? acceptanceHints(process.cwd(), log) : [];
if (hints.length > 0) appendFileSync(logPath, `\n${hints.join('\n')}\n`);
if (result.status === 0) {
	console.log(`PASS: ${displayCommand}`);
	if (log.includes('CELLIX_VERIFY=pass')) console.log('CELLIX_VERIFY=pass');
	process.exit(0);
}

const exitCode = result.status ?? 1;
const lines = log.split(/\r?\n/);
const failedCheck = findFailedCheck(lines);
const block = errorBlock(lines);
const useful = block.filter((line) => !line.includes('[ELIFECYCLE]') && !line.includes('node_modules'));
const shown = useful.length > 0 ? useful.slice(0, 2) : hints.slice(0, 2);
const headline = shown.find((line) => line.includes('Expected:'));
console.error(headline === undefined ? `FAIL: ${displayCommand}` : `FAIL: ${displayCommand} — ${headline}`);
console.error(`Exit code: ${exitCode}`);
if (failedCheck !== undefined) console.error(`Failed check: ${failedCheck}`);
if (result.error !== undefined) console.error(`Cause: ${result.error.message}`);
if (shown.length > 0) {
	console.error('Error:');
	console.error(shown.join('\n'));
}
process.exit(exitCode);

function isVerify(text) {
	return /(?:^|\s)pnpm(?:\s+run)?\s+verify(?:\s|$)/.test(text);
}

function acceptanceFailed(requested, log) {
	if (/test:acceptance/.test(requested)) return true;
	return isVerify(requested) && (log.includes('@cucumber/cucumber') || /\.feature:\d+/.test(log));
}

function acceptanceHints(workspace, log) {
	let acceptance = 'packages/axc-verification/acceptance-api/src';
	try {
		const config = JSON.parse(readFileSync(join(workspace, 'cellix-lint.config.json'), 'utf8'));
		if (typeof config.acceptance === 'string') acceptance = config.acceptance;
	} catch {
		// The default acceptance root still names the files a failure has to open.
	}
	const hints = [];
	const add = (value) => {
		if (!hints.includes(value)) hints.push(value);
	};
	for (const match of log.matchAll(/(?:features|step-definitions)\/[\w.-]+\.(?:feature|steps\.ts)/g)) {
		add(acceptancePath(acceptance, match[0]));
	}
	add(`${acceptance}/infrastructure.ts`);
	add(`${acceptance}/cucumber-lifecycle-hooks.ts`);
	return hints;
}

function acceptancePath(acceptance, found) {
	if (found.startsWith('packages/')) return found;
	const leaf = found.includes('src/') ? found.slice(found.indexOf('src/')) : found;
	if (leaf.startsWith('src/')) return `${acceptance.replace(/\/src$/, '')}/${leaf}`;
	return `${acceptance}/${leaf}`;
}

function formatArgument(value) {
	return /^[A-Za-z0-9_./:@=-]+$/.test(value) ? value : JSON.stringify(value);
}

function stripAnsi(value) {
	return value.replace(/\u001B\[[0-?]*[ -/]*[@-~]/g, '');
}

function findFailedCheck(lines) {
	for (const line of lines) {
		const failed = line.match(/^\s*Failed:\s*(.+)\s*$/);
		if (failed !== null) return failed[1];
		const turbo = line.match(/\bERROR\s+(@?\S+#\S+):/);
		if (turbo !== null) return turbo[1];
	}
	return undefined;
}
