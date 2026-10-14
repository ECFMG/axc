#!/usr/bin/env node
import { pathToFileURL } from 'node:url';

// PostToolUse trimmer for shell output. Rewrites only the model-facing text.
// Short output is left unchanged. Fail-open: unreadable input exits 0 with no rewrite.

const LOG_THRESHOLD = 4_000;
const PATCH_THRESHOLD = 12_000;
const PATCH_BUDGET = 8_000;
const MAX_LOG_CHARS = 8_000;
const MIN_SAVINGS = 500;
const HEAD_LINES = 12;
const TAIL_LINES = 25;
const SIGNAL_BEFORE = 2;
const SIGNAL_AFTER = 12;
const SIGNAL_HEAD = 40;
const SIGNAL_TAIL = 15;

const ANSI_PATTERN = new RegExp(String.raw`\u001B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~]|\][^\u0007]*(?:\u0007|\u001B\\))`, 'g');
const SHELL_TOOLS = new Set(['bash', 'run_terminal_command']);
const TEXT_FIELDS = ['output_for_prompt', 'stdout', 'stderr', 'output'];

const patchCommandPattern = /\bgit\b.*\b(?:diff|show|log)\b/;
const patchSummaryPattern = /(?:^|\s)--(?:stat|name-only|name-status|numstat|shortstat|dirstat)\b/;

function normalize(text) {
	return text
		.replace(ANSI_PATTERN, '')
		.replaceAll('\r\n', '\n')
		.split('\n')
		.map((line) => {
			const parts = line.split('\r');
			return parts.at(-1) ?? '';
		})
		.join('\n');
}

function outputKind(command) {
	const normalized = command.replaceAll(/\s+/g, ' ');
	if (patchCommandPattern.test(normalized) && !patchSummaryPattern.test(normalized)) return 'patch';
	return 'log';
}

function bodyAfterTaskPrefix(line) {
	return line.replace(/^(?:@[^\s:]+:[^\s:]+:\s*)+/, '');
}

function isPassLine(line) {
	return /^\s*(?:✓|✔|√)(?:\s|$)|^\s*PASS\b/.test(bodyAfterTaskPrefix(line));
}

function isProgressLine(line) {
	const body = bodyAfterTaskPrefix(line).trim();
	return /^(?:progress: resolved\b|npm http (?:fetch|cache)\b)/i.test(body) || /^\d{1,3}%$/.test(body) || /^[\\|/-]{3,}$/.test(body);
}

function isCacheLine(line) {
	return /cache (?:hit|miss), (?:replaying|executing)/i.test(line);
}

function isSignal(line) {
	const body = bodyAfterTaskPrefix(line);
	return /(?:\b(?:error|errors|fail|failed|failure|exception|warn|warning|ELIFECYCLE|ERR!|not ok|AssertionError|Expected|Received|Duration|Snapshots|Suites|Failed:)\b|^Tasks:|^Cached:|^Time:|Test Files|^\s*Tests\s|^\s*FAIL\b|[✗×✘✖❯]|\bTS\d{4,5}\b|:\d+:\d+|\(\d+,\d+\)|^\s+at\s+\S)/i.test(
		body,
	);
}

function isDropLine(line) {
	if (isSignal(line)) return false;
	return isPassLine(line) || isProgressLine(line) || isCacheLine(line);
}

function collapseKeptLines(lines) {
	const kept = [];
	let omitted = 0;
	let blanks = 0;
	for (const line of lines) {
		if (isDropLine(line)) {
			omitted += 1;
			continue;
		}
		const trimmed = line.trimEnd();
		if (trimmed.trim() === '') {
			blanks += 1;
			if (blanks > 1) {
				omitted += 1;
				continue;
			}
			kept.push('');
			continue;
		}
		blanks = 0;
		kept.push(trimmed);
	}
	return { lines: kept, omitted };
}

function addRange(indexes, start, end, length) {
	const from = Math.max(0, start);
	const to = Math.min(length, end);
	for (let index = from; index < to; index += 1) indexes.add(index);
}

function selectedIndexes(lines) {
	const indexes = new Set();
	const length = lines.length;
	addRange(indexes, 0, HEAD_LINES, length);
	addRange(indexes, length - TAIL_LINES, length, length);

	const signals = [];
	for (let index = 0; index < length; index += 1) {
		if (isSignal(lines[index])) signals.push(index);
	}

	const signalKeep = new Set();
	if (signals.length <= SIGNAL_HEAD + SIGNAL_TAIL) {
		for (const index of signals) signalKeep.add(index);
	} else {
		for (const index of signals.slice(0, SIGNAL_HEAD)) signalKeep.add(index);
		for (const index of signals.slice(-SIGNAL_TAIL)) signalKeep.add(index);
	}

	for (const index of signalKeep) {
		indexes.add(index);
		addRange(indexes, index - SIGNAL_BEFORE, index, length);
		addRange(indexes, index + 1, index + 1 + SIGNAL_AFTER, length);
	}

	return [...indexes].sort((left, right) => left - right);
}

function joinedLength(lines, indexes) {
	let size = 0;
	let previous = -1;
	for (const index of indexes) {
		if (previous >= 0 && index > previous + 1) size += 24;
		size += lines[index].length + 1;
		previous = index;
	}
	return size;
}

function shrinkToBudget(lines, indexes) {
	const selected = [...indexes];
	const tailStart = Math.max(0, lines.length - TAIL_LINES);
	const droppable = (index) => !isSignal(lines[index]) && index < tailStart;
	while (joinedLength(lines, selected) > MAX_LOG_CHARS) {
		const dropAt = selected.findIndex(droppable);
		if (dropAt === -1) break;
		selected.splice(dropAt, 1);
	}
	while (joinedLength(lines, selected) > MAX_LOG_CHARS && selected.length > SIGNAL_TAIL) {
		const dropAt = selected.findIndex((index) => !isSignal(lines[index]));
		if (dropAt === -1) break;
		selected.splice(dropAt, 1);
	}
	return selected;
}

function renderSelection(lines, indexes, alreadyOmitted) {
	const parts = [];
	let previous = -1;
	let gap = 0;
	for (const index of indexes) {
		if (previous >= 0 && index > previous + 1) {
			const skipped = index - previous - 1;
			gap += skipped;
			parts.push(`… ${skipped} lines omitted …`);
		}
		parts.push(lines[index]);
		previous = index;
	}
	const omitted = alreadyOmitted + gap;
	const body = parts.join('\n').replace(/\n{3,}/g, '\n\n');
	if (omitted <= 0) return body;
	const banner = `[trimmed CLI output] omitted ${omitted} lines. Kept failures, warnings, diagnostics, and the summary. Full output remains in the session scrollback.`;
	return `${banner}\n${body}`;
}

function trimLog(text) {
	const { lines, omitted } = collapseKeptLines(text.split('\n'));
	const filtered = lines.join('\n');
	if (filtered.length <= MAX_LOG_CHARS)
		return renderSelection(
			lines,
			lines.map((_, index) => index),
			omitted,
		);
	const indexes = shrinkToBudget(lines, selectedIndexes(lines));
	return renderSelection(lines, indexes, omitted);
}

function patchPath(part) {
	const match = /^diff --git a\/(.+?) b\//.exec(part);
	return match?.[1] ?? 'unknown path';
}

function trimPatch(text) {
	if (text.length <= PATCH_BUDGET) return text;
	const parts = text.split(/(?=^diff --git )/m);
	const preamble = parts[0]?.startsWith('diff --git ') ? '' : (parts.shift() ?? '');
	const kept = [];
	const omittedPaths = [];
	let used = preamble.length;
	for (const part of parts) {
		const fits = used + part.length <= PATCH_BUDGET;
		if (fits || kept.length === 0) {
			const piece = part.length > PATCH_BUDGET ? trimLog(part) : part;
			kept.push(piece);
			used += piece.length;
			continue;
		}
		omittedPaths.push(patchPath(part));
	}
	if (omittedPaths.length === 0) return text;
	const list = omittedPaths.join(', ');
	return `${preamble}${kept.join('')}[trimmed CLI output] omitted diffs for ${omittedPaths.length} files: ${list}. Full diff remains in the session scrollback.\n`;
}

function accept(original, trimmed) {
	if (typeof trimmed !== 'string') return null;
	if (original.length - trimmed.length < MIN_SAVINGS) return null;
	return trimmed;
}

export function trimCommandOutput(text, command = '') {
	if (typeof text !== 'string' || text.length === 0) return null;
	const stripped = normalize(text);
	const looksLikePatch = outputKind(command) === 'patch' && stripped.includes('diff --git ');
	const threshold = looksLikePatch ? PATCH_THRESHOLD : LOG_THRESHOLD;
	if (stripped.length < threshold && text.length - stripped.length < MIN_SAVINGS) return null;
	if (looksLikePatch) {
		const patchTrimmed = trimPatch(stripped);
		if (text.length - patchTrimmed.length >= MIN_SAVINGS) return patchTrimmed;
	}
	return accept(text, trimLog(stripped));
}

function commandOf(event) {
	const input = event.toolInput ?? event.tool_input ?? {};
	const command = input.command ?? input.cmd ?? '';
	if (Array.isArray(command)) return command.join(' ');
	return typeof command === 'string' ? command : '';
}

function isShellEvent(event) {
	const name = event.toolName ?? event.tool_name;
	if (typeof name !== 'string' || name.length === 0) return true;
	return SHELL_TOOLS.has(name.toLowerCase());
}

function trimField(value, command) {
	if (typeof value !== 'string') return value;
	return trimCommandOutput(value, command) ?? value;
}

export function replacementFor(event) {
	if (event == null || typeof event !== 'object' || !isShellEvent(event)) return null;
	const command = commandOf(event);
	const result = event.toolResult ?? event.tool_response ?? event.tool_result;
	if (typeof result === 'string') return trimCommandOutput(result, command);
	if (result == null || typeof result !== 'object' || Array.isArray(result)) return null;

	if (typeof result.pre_formatted === 'string' && result.pre_formatted.length > 0) {
		const trimmed = trimCommandOutput(result.pre_formatted, command);
		if (trimmed == null) return null;
		return { ...result, pre_formatted: trimmed };
	}

	let changed = false;
	const next = { ...result };
	for (const field of TEXT_FIELDS) {
		if (typeof next[field] !== 'string') continue;
		const trimmed = trimField(next[field], command);
		if (trimmed !== next[field]) {
			next[field] = trimmed;
			changed = true;
		}
	}
	return changed ? next : null;
}

async function readStdin() {
	const chunks = [];
	for await (const chunk of process.stdin) chunks.push(chunk);
	return Buffer.concat(chunks).toString('utf8');
}

const invokedAsCli = process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedAsCli) {
	const raw = await readStdin();
	try {
		const replacement = replacementFor(JSON.parse(raw));
		if (replacement != null) {
			process.stdout.write(
				`${JSON.stringify({
					hookSpecificOutput: {
						hookEventName: 'PostToolUse',
						updatedToolOutput: replacement,
					},
				})}\n`,
			);
		}
	} catch {
		// Unreadable events fail open so the original tool output reaches the model.
	}
}
