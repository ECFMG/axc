// PostToolUse shell-output trimmer for Grok Build (updatedToolOutput). Dependency-free; fails open (no output = unchanged).
// Long output only: drop pass/progress/blank lines, then keep head + tail + every error-looking line between.
import { readFileSync } from 'node:fs';

const MAX_LINES = 60;
const HEAD = 10;
const TAIL = 30;
const MAX_ERRORS = 40;
const ERROR = /error|fail|✖|✗|×|\bERR|warn|TS\d{4}|exception|not ok|assert|expected|received|unused|denied|cannot|traceback|panic/i;
const NOISE = /^\s*$|^\s*(✓|✔|√|ok \d|PASS\b)|\b(passed|successful|cache (hit|miss))\b|Progress: resolved|\b\d{1,3}%(\s|$)|^\s*[⠁-⣿]|^\s*(Downloading|Resolving|Fetching|Packages:)\b/i;

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

if (import.meta.url === `file://${process.argv[1]}`) {
	try {
		const input = JSON.parse(readFileSync(0, 'utf8') || '{}');
		const result = input.toolResult;
		const text = typeof result === 'string' ? result : result?.output_for_prompt;
		const trimmed = typeof text === 'string' ? trim(text, result?.output_file) : undefined;
		if (trimmed) process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PostToolUse', updatedToolOutput: trimmed } }));
	} catch {
		// fail open
	}
}
