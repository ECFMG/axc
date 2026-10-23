// PostToolUse shell-output trimmer for Grok Build (updatedToolOutput). Dependency-free; fails open (no output = unchanged).
// Long shell output: drop pass/progress/blank lines, then keep head + tail + every error-looking line between.
// Large file reads (read_file): cap at READ_CAP chars, keep the first READ_KEEP (specs fit; lockfiles/dists don't).
import { readFileSync, realpathSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const MAX_LINES = 60;
const HEAD = 10;
const TAIL = 30;
const MAX_ERRORS = 40;
const ERROR = /error|fail|✖|✗|×|\bERR|warn|TS\d{4}|exception|not ok|assert|expected|received|unused|denied|cannot|traceback|panic/i;
const NOISE = /^\s*$|^\s*(✓|✔|√|ok \d|PASS\b)|\b(passed|successful|cache (hit|miss))\b|Progress: resolved|\b\d{1,3}%(\s|$)|^\s*[⠁-⣿]|^\s*(Downloading|Resolving|Fetching|Packages:)\b/i;

const READ_CAP = 16000;
const READ_KEEP = 12000;

/** Longest string inside a tool result (the file text, whatever the result shape). */
const longest = (v) =>
	typeof v === 'string'
		? v
		: v && typeof v === 'object'
			? Object.values(v)
					.map(longest)
					.reduce((a, b) => (b.length > a.length ? b : a), '')
			: '';

export function capRead(text) {
	if (text.length <= READ_CAP) return undefined;
	return `${text.slice(0, READ_KEEP)}\n[read capped: first ${READ_KEEP} of ${text.length} chars — this file is too big to read whole; read only the lines you need (offset/limit)]`;
}

export function trim(text, fullLog) {
	const lines = text.split('\n');
	if (lines.length <= MAX_LINES) return undefined;
	const kept = lines.filter((line, i) => i === 0 || ERROR.test(line) || !NOISE.test(line));
	let out = kept;
	if (kept.length > MAX_LINES) {
		const middle = kept.slice(HEAD, -TAIL);
		const errors = middle.filter((line) => ERROR.test(line)).slice(0, MAX_ERRORS);
		out = [...kept.slice(0, HEAD), `… ${middle.length - errors.length} lines omitted …`, ...errors, ...kept.slice(-TAIL)];
	}
	const note = `[trimmed ${lines.length} → ${out.length} lines${fullLog ? `; full output: ${fullLog}` : ''}]`;
	return `${out.join('\n')}\n${note}`;
}

// realpath + file URL: a symlinked or space-containing path must still run main, not no-op.
const isMain = () => Boolean(process.argv[1]) && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href;
if (isMain()) {
	try {
		const input = JSON.parse(readFileSync(0, 'utf8') || '{}');
		const result = input.toolResult;
		if (input.toolName === 'read_file') {
			const capped = capRead(longest(result));
			if (capped) process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PostToolUse', updatedToolOutput: capped } }));
			process.exit(0);
		}
		const text = typeof result === 'string' ? result : result?.output_for_prompt;
		const trimmed = typeof text === 'string' ? trim(text, result?.output_file) : undefined;
		if (trimmed) process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PostToolUse', updatedToolOutput: trimmed } }));
	} catch {
		// fail open
	}
}
