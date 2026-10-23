// Failed acceptance scenarios from a Serenity/JS console-reporter (or plain cucumber) log:
// one line each with feature file:line, scenario name, failing step and the first error line.
// Used by verify-excerpt.mjs (husky + stop gate) and check-summary.mjs.

// biome-ignore lint/suspicious/noControlCharactersInRegex: strip ANSI escapes
const ANSI = /\u001b\[[0-9;?]*[A-Za-z]/g;
const TASK = /^(@?[\w./-]+?):[a-z][\w:-]*: ?/; // turbo `pkg:task: ` prefix
const FEATURE = /^(\S+\.feature):(\d+)$/;
const OUTCOME = /^(✗|☕|⚠|\?)\s*(Execution .*|Implementation pending.*)$/;
const STEP = /^ {2}(Given|When|Then|And|But|\*) (.*)$/;

const relTo = (root) => (p) => (root && p.startsWith(`${root}/`) ? p.slice(root.length + 1) : p);

/** @returns {string[]} e.g. `scenario  src/x.feature:4 "AC1 name" — step "Then …" — AssertionError: … (expected 1, received 2) @ steps.ts:7` */
export function acceptanceFailures(log, root = process.cwd()) {
	const rel = relTo(root);
	const lines = log
		.replace(ANSI, '')
		.split(/\r?\n/)
		.map((l) => l.replace(TASK, '').trimEnd());
	const out = [];
	for (let i = 0; i < lines.length; i++) {
		const f = lines[i].match(FEATURE);
		if (f) {
			let end = i + 1;
			while (end < lines.length && !/^(-{20,}|={20,})$/.test(lines[end]) && !FEATURE.test(lines[end])) end++;
			const block = lines.slice(i + 1, end);
			const o = block.findIndex((l) => OUTCOME.test(l));
			if (o >= 0) out.push(describe(rel(f[1]), f[2], block, o, rel));
			i = end - 1;
			continue;
		}
		// plain cucumber summary: `1) Scenario: name # path.feature:4`
		const c = lines[i].match(/^\d+\) Scenario: (.*?) # (\S+\.feature):(\d+)$/);
		if (c) {
			const err = lines.slice(i + 1, i + 15).find((l) => /^\s+(✖|×)|Error\b/.test(l)) ?? '';
			out.push(`scenario  ${rel(c[2])}:${c[3]} "${c[1]}" — ${err.trim().replace(/^(✖|×)\s*/, '') || 'failed'}`);
		}
	}
	return out;
}

function describe(file, line, block, o, rel) {
	const name = (block.find((l) => l.trim() !== '') ?? '').replace(/^[^:]+: /, '');
	let step = '';
	for (let j = 0; j < o; j++) {
		const s = block[j].match(STEP);
		if (s && /^ {4}(✗|☕|⚠)/.test(block[j + 1] ?? '')) {
			step = `${s[1]} ${s[2]}`;
			break;
		}
	}
	const after = block.slice(o + 1);
	const first = after.find((l) => l.trim() !== '')?.trim() ?? '';
	const exp = after
		.find((l) => /^\s*Expected \w+: /.test(l))
		?.trim()
		.replace(/^Expected \w+: /, '');
	const got = after
		.find((l) => /^\s*Received \w+: /.test(l))
		?.trim()
		.replace(/^Received \w+: /, '');
	const at = after.map((l) => l.match(/^\s+at .*?\(?([^\s()]+\.(?:ts|mjs|js)):(\d+):\d+\)?$/)).find((m) => m && !m[1].includes('node_modules'));
	let why = first;
	if (/^ImplementationPendingError/.test(first)) why = 'undefined step — add it to src/step-definitions/<feature>.steps.ts (or reuse an existing pattern)';
	else if (exp !== undefined && got !== undefined) why += ` (expected ${exp}, received ${got})`;
	return `scenario  ${file}:${line} "${name}"${step ? ` — step "${step}"` : ''} — ${why}${at ? ` @ ${rel(at[1])}:${at[2]}` : ''}`;
}
