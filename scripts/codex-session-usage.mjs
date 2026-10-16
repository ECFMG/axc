// Summarise token usage and wall-clock time of a Codex session so the
// evaluation run record's cost lines are reproducible.
//
//   node scripts/codex-session-usage.mjs <rollout.jsonl>
//   node scripts/codex-session-usage.mjs --latest [--cwd <path>]
//
// Reads ~/.codex/sessions/**/rollout-*.jsonl; the last `token_count` event
// carries cumulative totals, timestamps give elapsed time, and user/tool
// events are counted so interventions and approvals can be cross-checked.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

function listRollouts(directory, found = []) {
	let entries = [];
	try {
		entries = readdirSync(directory, { withFileTypes: true });
	} catch {
		return found;
	}
	for (const entry of entries) {
		const path = join(directory, entry.name);
		if (entry.isDirectory()) {
			listRollouts(path, found);
		} else if (/^rollout-.*\.jsonl$/.test(entry.name)) {
			found.push(path);
		}
	}
	return found;
}

function latestRollout(cwdFilter) {
	const candidates = listRollouts(join(homedir(), '.codex', 'sessions'))
		.map((path) => ({ path, mtime: statSync(path).mtimeMs }))
		.sort((a, b) => b.mtime - a.mtime);
	for (const candidate of candidates) {
		if (cwdFilter === undefined) {
			return candidate.path;
		}
		const firstLine = readFileSync(candidate.path, 'utf8').split('\n', 1)[0];
		if (firstLine.includes(`"cwd":"${cwdFilter}"`)) {
			return candidate.path;
		}
	}
	return undefined;
}

export function summarise(jsonl) {
	const summary = {
		sessionId: undefined,
		cwd: undefined,
		model: undefined,
		startedAt: undefined,
		endedAt: undefined,
		userMessages: 0,
		toolCalls: 0,
		approvalRequests: 0,
		totals: undefined,
	};
	for (const line of jsonl.split('\n')) {
		if (line.trim() === '') {
			continue;
		}
		let record;
		try {
			record = JSON.parse(line);
		} catch {
			continue;
		}
		const payload = record.payload ?? {};
		summary.startedAt ??= record.timestamp;
		summary.endedAt = record.timestamp ?? summary.endedAt;
		if (record.type === 'session_meta') {
			summary.sessionId = payload.id;
			summary.cwd = payload.cwd;
			summary.model ??= payload.model ?? payload.model_provider_id;
		}
		if (record.type === 'turn_context') {
			summary.model = payload.model ?? summary.model;
		}
		if (record.type === 'event_msg' && payload.type === 'token_count' && payload.info?.total_token_usage) {
			summary.totals = payload.info.total_token_usage;
		}
		if (record.type === 'response_item' && payload.type === 'message' && payload.role === 'user') {
			summary.userMessages += 1;
		}
		if (record.type === 'response_item' && /^(function_call|custom_tool_call)$/.test(payload.type ?? '')) {
			summary.toolCalls += 1;
		}
		if (record.type === 'event_msg' && /approval/.test(payload.type ?? '')) {
			summary.approvalRequests += 1;
		}
	}
	return summary;
}

function formatElapsed(startedAt, endedAt) {
	if (startedAt === undefined || endedAt === undefined) {
		return 'unknown';
	}
	const minutes = Math.round((Date.parse(endedAt) - Date.parse(startedAt)) / 60000);
	return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

function main() {
	const args = process.argv.slice(2);
	let path = args.find((arg) => !arg.startsWith('--'));
	if (args.includes('--latest')) {
		const cwdIndex = args.indexOf('--cwd');
		path = latestRollout(cwdIndex === -1 ? undefined : args[cwdIndex + 1]);
	}
	if (path === undefined) {
		console.error('usage: node scripts/codex-session-usage.mjs <rollout.jsonl> | --latest [--cwd <path>]');
		process.exit(2);
	}
	const summary = summarise(readFileSync(path, 'utf8'));
	const totals = summary.totals ?? {};
	const rows = [
		['Rollout', path],
		['Session', summary.sessionId ?? 'unknown'],
		['Working directory', summary.cwd ?? 'unknown'],
		['Model', summary.model ?? 'unknown'],
		['Input Tokens', totals.input_tokens ?? 'n/a'],
		['Cached Tokens', totals.cached_input_tokens ?? 'n/a'],
		['Output Tokens', totals.output_tokens ?? 'n/a'],
		['Reasoning Output Tokens', totals.reasoning_output_tokens ?? 'n/a'],
		['Total Tokens', totals.total_tokens ?? 'n/a'],
		['Elapsed Time', formatElapsed(summary.startedAt, summary.endedAt)],
		['User messages (incl. harness-injected context)', summary.userMessages],
		['Tool calls', summary.toolCalls],
		['Approval events', summary.approvalRequests],
	];
	for (const [label, value] of rows) {
		console.log(`${label.padEnd(46)} ${value}`);
	}
}

if (process.argv[1] !== undefined && import.meta.url.endsWith(process.argv[1].split('/').pop())) {
	main();
}
