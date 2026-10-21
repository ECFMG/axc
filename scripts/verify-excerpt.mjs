// Failure-only excerpt of a `pnpm run verify` (or turbo) log, for agents.
// Usage: pnpm run verify > /tmp/verify.log 2>&1 || node scripts/verify-excerpt.mjs /tmp/verify.log
// Clean log -> prints nothing, exit 0. Failing log -> <=80 useful lines, exit 1.
import { readFileSync } from 'node:fs';

const MAX_LINES = 80;
const MAX_WIDTH = 240;
const file = process.argv[2];
const raw = readFileSync(file ?? 0, 'utf8');

// biome-ignore lint/suspicious/noControlCharactersInRegex: strip ANSI escapes
const ansi = /\u001b\[[0-9;?]*[A-Za-z]/g;
const lines = raw
	.replace(ansi, '')
	.split(/\r?\n/)
	.map((l) => l.replace(/^(@?[\w./-]+):([\w:-]+): /, '[$1 $2] ').trimEnd());

const fail =
	/(ELIFECYCLE|ERR_PNPM|husky - .*failed|\bFAIL\b|\bFailed:|failed with exit code|exit code [1-9]|AssertionError|\berror\b|Error:|error TS\d+|✖|✗|×|\b\d+ failed\b|Unhealthy|Unable to |not ok|policy failed|Cannot find|Unexpected|is not assignable|Unused (files|exports|dependencies))/i;
const auditRow = /^│ (high|critical|Package|Vulnerable versions|Patched versions|More info)\b/;
const noise = /(DeprecationWarning|--trace-deprecation|^\s*$|Spawning: |SERENITY COMMAND LINE|^\[?[^\]]*\]? ?-{5,}$|Progress: resolved|0 errors?\b|\b0 failed\b|no errors)/i;

const cmdEcho = /^(\$ |> |\. \w)/; // echoed commands, not results

const hits = new Set();
lines.forEach((line, i) => {
	if (noise.test(line) || cmdEcho.test(line)) return;
	if (fail.test(line) || auditRow.test(line)) {
		for (let j = Math.max(0, i - 1); j <= Math.min(lines.length - 1, i + 2); j++) {
			if (!noise.test(lines[j])) hits.add(j);
		}
	}
});

if (hits.size === 0) process.exit(0);

const summary = lines.filter((l) => /^\s*Failed:\s+\S/.test(l) || /^\s*Tasks:\s+/.test(l));
const body = [...hits].sort((a, b) => a - b).map((i) => lines[i]);
const out = [...new Set([...summary, ...body])].map((l) => (l.length > MAX_WIDTH ? `${l.slice(0, MAX_WIDTH)}…` : l));
const shown = out.slice(0, MAX_LINES - 1);
if (out.length > shown.length) shown.push(`… +${out.length - shown.length} more lines (full log: ${file ?? 'stdin'})`);
console.log(shown.join('\n'));
process.exit(1);
