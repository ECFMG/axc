// Codex Stop hook: the agent may only finish when the full repository gate passes.
// Codex runs hooks outside its sandbox, so this can start the Azure Functions host
// for the acceptance suite and reach npm and Snyk without approval prompts.
// Only a short excerpt of a failure goes back to the agent, to keep its context small.
import { spawnSync } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const MAX_BLOCKS = 3;
// Logs and attempt counters go to .agents-work/, the repo's gitignored folder for agent runtime files.
const STATE_SUBDIR = path.join('.agents-work', 'verify-gate');
const ALLOWED = [/^apps\/api\//, /^apps\/docs\//, /^packages\/axc\/(rest|application-services|domain|persistence|service-mongoose)\//, /^packages\/axc-verification\//, /^pnpm-lock\.yaml$/];
// Boilerplate that costs tokens without helping a fix: Knip config hints and Snyk's per-project chatter.
const NOISE = [
	/knip\.json\s+(Remove from|Refine|Remove redundant)/,
	/no vulnerable paths found/,
	/^Next steps:/,
	/Run `snyk (monitor|test)`/,
	/^(Testing|Organization|Package manager|Target file|Project name|Open source|Project path|Local Snyk policy|Licenses):?\s/,
	/^-{10,}$/,
];
const SIGNAL = /error|fail|✗|×|ERR_|Unused|not ok|Assertion|Expected|Received|TS\d{4}|vulnerab/i;

function git(args, cwd) {
	const result = spawnSync('/usr/bin/git', args, { cwd, encoding: 'utf8' });
	return result.status === 0 ? result.stdout : '';
}

function lines(text) {
	return text.split('\n').filter((line) => line.trim() !== '');
}

// The verify chain stops at the first failing step, so the excerpt starts at the last `$ <command>` line.
// Short steps (Knip, audit, Snyk) are sent whole; long Turbo output is reduced to error lines plus the line after each.
function excerpt(log) {
	const all = log.split('\n').filter((line) => line.trim() !== '' && !NOISE.some((pattern) => pattern.test(line)));
	const lastStep = all.findLastIndex((line) => line.startsWith('$ '));
	const step = lastStep >= 0 ? all.slice(lastStep) : all;
	if (step.length <= 80) {
		return step.join('\n');
	}
	const keep = new Set();
	step.forEach((line, index) => {
		if (SIGNAL.test(line)) {
			keep.add(index);
			keep.add(index + 1);
		}
	});
	const picked = [...keep]
		.filter((index) => index < step.length)
		.sort((a, b) => a - b)
		.slice(0, 80)
		.map((index) => step[index]);
	return (picked.length >= 3 ? [step[0], ...picked] : step.slice(-60)).join('\n');
}

function main() {
	const input = JSON.parse(readFileSync(0, 'utf8') || '{}');
	const root = git(['rev-parse', '--show-toplevel'], input.cwd).trim() || input.cwd || process.cwd();
	const changed = [...lines(git(['diff', '--name-only', 'HEAD'], root)), ...lines(git(['ls-files', '--others', '--exclude-standard'], root))];
	if (changed.length === 0) {
		return;
	}

	const stateDir = path.join(root, STATE_SUBDIR);
	mkdirSync(stateDir, { recursive: true });
	const session = input.session_id ?? 'unknown-session';
	const countFile = path.join(stateDir, `${session}.count`);
	const blocks = existsSync(countFile) ? Number(readFileSync(countFile, 'utf8')) : 0;
	if (blocks >= MAX_BLOCKS) {
		return;
	}

	let failure = '';
	const outside = changed.filter((file) => !ALLOWED.some((pattern) => pattern.test(file)));
	if (outside.length > 0) {
		failure = `Files changed outside the write boundary. Revert them:\n${outside.join('\n')}`;
	} else {
		const logFile = path.join(stateDir, `${session}-${blocks + 1}.log`);
		// One merged stream keeps each tool's errors next to the command that printed them.
		const run = spawnSync('/bin/sh', ['-c', 'pnpm run verify 2>&1'], { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
		const log = (run.stdout ?? '').replaceAll(/\u001b\[[0-9;]*m/g, '');
		writeFileSync(logFile, log);
		if (run.status === 0) {
			appendFileSync(path.join(stateDir, `${session}.passed`), `${new Date().toISOString()} ${logFile}\n`);
			return;
		}
		failure = `pnpm run verify failed. Relevant lines:\n${excerpt(log)}\n\nFull log (read only the part you need): ${logFile}`;
	}

	writeFileSync(countFile, String(blocks + 1));
	process.stdout.write(
		JSON.stringify({
			decision: 'block',
			reason: `${failure}\n\nFix the cause in code without weakening any check, then finish again. Gate attempt ${blocks + 1} of ${MAX_BLOCKS}.`,
		}),
	);
}

try {
	main();
} catch {
	// Fail open: a broken hook must never trap the agent in a loop.
}
