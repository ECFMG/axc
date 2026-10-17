// Codex hooks for the agentCourses harness. Codex runs hooks outside its sandbox, so they can
// install packages, start the Azure Functions host and reach npm and Snyk without approval prompts.
//
//   node verify-gate.mjs sync  (PostToolUse) when a package.json changed, run pnpm install so the
//                              lockfile and workspace links stay in sync; the agent never installs.
//   node verify-gate.mjs stop  (Stop) the agent may only finish when the CI steps pass:
//                              pnpm install --frozen-lockfile, then pnpm run verify.
//
// Only a short excerpt of a failure goes back to the agent, to keep its context small.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const MAX_BLOCKS = 3;
// Logs, counters and the manifest hash go to .agents-work/, the repo's gitignored folder for agent runtime files.
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

// Runs a shell command with stdout and stderr merged, so each tool's errors stay next to the command that printed them.
function shell(command, cwd) {
	const run = spawnSync('/bin/sh', ['-c', `${command} 2>&1`], { cwd, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
	return { ok: run.status === 0, log: (run.stdout ?? '').replaceAll(/\u001b\[[0-9;]*m/g, '') };
}

// The command chain stops at the first failing step, so the excerpt starts at the last `$ <command>` line.
// Short steps (Knip, audit, Snyk, install) are sent whole; long Turbo output is reduced to error lines plus the line after each.
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

function changedFiles(root) {
	return [...lines(git(['diff', '--name-only', 'HEAD'], root)), ...lines(git(['ls-files', '--others', '--exclude-standard'], root))];
}

// Fingerprint of every package.json change (tracked diffs plus new manifests) relative to HEAD.
function manifestFingerprint(root, changed) {
	const manifests = changed.filter((file) => file.endsWith('package.json')).sort((a, b) => a.localeCompare(b));
	const hash = createHash('sha256');
	for (const file of manifests) {
		hash.update(file);
		hash.update(existsSync(path.join(root, file)) ? readFileSync(path.join(root, file)) : '');
	}
	return manifests.length === 0 ? '' : hash.digest('hex');
}

// Installs when the manifests changed since the last sync. Returns undefined when nothing ran.
function syncDependencies(root, stateDir, changed) {
	const fingerprint = manifestFingerprint(root, changed);
	const fingerprintFile = path.join(stateDir, 'manifests.sha256');
	const synced = existsSync(fingerprintFile) ? readFileSync(fingerprintFile, 'utf8') : '';
	if (fingerprint === synced) {
		return undefined;
	}
	const result = shell('pnpm install --config.confirmModulesPurge=false', root);
	appendFileSync(path.join(stateDir, 'install.log'), `\n===== ${new Date().toISOString()}\n${result.log}`);
	if (result.ok) {
		writeFileSync(fingerprintFile, fingerprint);
	}
	return result;
}

function context(root) {
	const stateDir = path.join(root, STATE_SUBDIR);
	mkdirSync(stateDir, { recursive: true });
	return stateDir;
}

function onToolUse(input, root) {
	const changed = changedFiles(root);
	const stateDir = context(root);
	const result = syncDependencies(root, stateDir, changed);
	if (result === undefined) {
		return;
	}
	const message = result.ok
		? 'A package.json changed, so the harness ran pnpm install outside the sandbox: workspace links are installed and pnpm-lock.yaml is updated. Do not edit, revert or reinstall the lockfile.'
		: `A package.json changed and pnpm install failed outside the sandbox. Fix the manifest (workspace:* or catalog: versions only):\n${excerpt(result.log)}`;
	process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: input.hook_event_name ?? 'PostToolUse', additionalContext: message } }));
}

function onStop(input, root) {
	const changed = changedFiles(root);
	if (changed.length === 0) {
		return;
	}
	const stateDir = context(root);
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
		syncDependencies(root, stateDir, changed);
		const logFile = path.join(stateDir, `${session}-${blocks + 1}.log`);
		// Exactly what CI runs: a frozen install, then the full gate.
		const result = shell('pnpm install --frozen-lockfile && pnpm run verify', root);
		writeFileSync(logFile, result.log);
		if (result.ok) {
			appendFileSync(path.join(stateDir, `${session}.passed`), `${new Date().toISOString()} ${logFile}\n`);
			return;
		}
		failure = `The CI steps failed (pnpm install --frozen-lockfile, then pnpm run verify). Relevant lines:\n${excerpt(result.log)}\n\nFull log (read only the part you need): ${logFile}`;
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
	const input = JSON.parse(readFileSync(0, 'utf8') || '{}');
	const root = git(['rev-parse', '--show-toplevel'], input.cwd).trim() || input.cwd || process.cwd();
	if (process.argv[2] === 'sync') {
		onToolUse(input, root);
	} else {
		onStop(input, root);
	}
} catch {
	// Fail open: a broken hook must never trap the agent in a loop.
}
