// Failure-only excerpt of a `pnpm run verify` (or turbo) log, for agents.
// Usage: pnpm run verify > /tmp/verify.log 2>&1 || node scripts/verify-excerpt.mjs /tmp/verify.log
// Clean log -> prints nothing, exit 0. Failing log -> <=80 useful lines, exit 1.
import { readFileSync } from 'node:fs';
import { acceptanceFailures } from './acceptance-failures.mjs';

const MAX_LINES = 80;
const MAX_WIDTH = 240;
const MAX_LIST = 20;
const file = process.argv[2];
const raw = readFileSync(file ?? 0, 'utf8');

// biome-ignore lint/suspicious/noControlCharactersInRegex: strip ANSI escapes
const ansi = /\u001b\[[0-9;?]*[A-Za-z]/g;
const rawLines = raw.replace(ansi, '').split(/\r?\n/);
const taskPrefix = /^(@?[\w./-]+):([\w:-]+): /;
const lines = rawLines.map((l) => l.replace(taskPrefix, '[$1 $2] ').trimEnd());

const fail =
	/(ELIFECYCLE|ERR_PNPM|husky - .*failed|\bFAIL\b|\bFailed:|failed with exit code|exit code [1-9]|AssertionError|\berror\b|Error:|error TS\d+|✖|✗|×|\b\d+ failed\b|Unhealthy|Unable to |not ok|policy failed|coverage failed|Cannot find|Unexpected|is not assignable|Unused [\w ]+|Shutting down forcibly)/i;
const auditRow = /^│ (high|critical|Package|Vulnerable versions|Patched versions|More info)\b/;
const listHead = /^Unused [\w ]+ \((\d+)\)/; // knip section: include its rows
const noise =
	/(DeprecationWarning|--trace-deprecation|^\s*$|Spawning: |SERENITY COMMAND LINE|^\[?[^\]]*\]? ?-{5,}$|Progress: resolved|Configuration hints|more similar hints|Remove (from ignore|redundant)|0 errors?\b|\b0 failed\b|no errors|^\s*(\[[^\]]*\] )?at .*node_modules|^\s*(\[[^\]]*\] )?[✔✓ℹ] )/i;
const cmdEcho = /^(\$ |> |\. \w)/; // echoed commands, not results

// TS2305/TS2459/TS2724: a symbol imported from another module isn't exported by it.
const missingExport = /error (TS2305|TS2459|TS2724): (?:Module )?'"?([^'"]+)"?' .*?'([^']+)'/;
const missing = new Map();
// TS2883/TS2742: an exported function's inferred return type names a dependency-internal type.
const inferredType = /error (?:TS2883|TS2742): The inferred type of '([^']+)'/;
const needsReturnType = new Set();

const hits = new Set();
let lastStep = '';
let failedStep = '';
const failedTasks = new Set();

lines.forEach((line, i) => {
	if (/^\$ /.test(line)) lastStep = line.slice(2);
	const failedTask = line.match(/^\s*Failed:\s+(\S+)/) ?? line.match(/ERROR\s+(\S+#\S+): command/);
	if (failedTask?.[1]) failedTasks.add(failedTask[1]);
	const m = line.match(missingExport);
	if (m?.[2] && m[3]) missing.set(m[2], new Set([...(missing.get(m[2]) ?? []), m[3]]));
	const t = line.match(inferredType);
	if (t?.[1]) needsReturnType.add(t[1]);
	if (noise.test(line) || cmdEcho.test(line)) return;
	if (!(fail.test(line) || auditRow.test(line))) return;
	if (!failedStep) failedStep = lastStep;
	const prefixed = rawLines[i]?.match(taskPrefix);
	if (prefixed && /ELIFECYCLE|exit code [1-9]|Shutting down forcibly/i.test(line)) failedTasks.add(`${prefixed[1]}#${prefixed[2]}`);
	const listLen = Number(line.match(listHead)?.[1] ?? 0);
	const after = listLen > 0 ? Math.min(listLen, MAX_LIST) : 2;
	for (let j = Math.max(0, i - 1); j <= Math.min(lines.length - 1, i + after); j++) {
		if (!noise.test(lines[j] ?? '')) hits.add(j);
	}
});

if (hits.size === 0) process.exit(0);

const parts = [failedTasks.size ? `task(s) ${[...failedTasks].join(', ')}` : '', failedStep ? `step \`${failedStep}\`` : ''].filter(Boolean);
const header = [`FAILED: ${parts.join(' | ') || 'see lines below'}`];
if (file) header.push(`full log: ${file}`);
header.push(...acceptanceFailures(raw));
if (missing.size) {
	const what = [...missing].map(([mod, names]) => `${[...names].join(', ')} from ${mod}`).join('; ');
	header.push(`hint: re-export every cross-package type from <pkg>/src/index.ts (missing: ${what})`);
}
if (needsReturnType.size) header.push(`hint: add an explicit return type to exported ${[...needsReturnType].join(', ')} (e.g. \`: Response\` for Hono helpers) — TS2883`);
const body = [...hits].sort((a, b) => a - b).map((i) => lines[i] ?? '');
const out = [...new Set([...header, ...body])].map((l) => (l.length > MAX_WIDTH && !l.startsWith('scenario  ') ? `${l.slice(0, MAX_WIDTH)}…` : l));
const shown = out.slice(0, MAX_LINES - 1);
if (out.length > shown.length) shown.push(`… +${out.length - shown.length} more lines${file ? ` (full log: ${file})` : ''}`);
console.log(shown.join('\n'));
process.exit(1);
