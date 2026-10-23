// Trim guard (harness self-test, runs in verify via trim-guard.test.mjs): byte budgets for always-loaded agent files,
// near-duplicate lines across them, and rules-ledger rows whose rule left its file. Report-only — never edits.
// Trimming is AI-driven in a harness round, never inside a SCORE run. Settings: scripts/trim-guard.config.json.
// Usage: node scripts/trim-guard.mjs
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

export const config = JSON.parse(readFileSync(path.join(import.meta.dirname, 'trim-guard.config.json'), 'utf8'));
const how = () => `trim or move to an on-demand file (AI trim in a harness round, never in SCORE: duplicates → rules with no sink in the last ${config.TRIM_PROTECT_RUNS} runs → wording → on-demand; log it in ${config.trimLog})`;

const normalize = (line) =>
	line
		.toLowerCase()
		.replace(/[`*_#>|]/g, ' ')
		.replace(/^\s*(?:[-+]|\d+\.)\s+/, '')
		.replace(/\s+/g, ' ')
		.trim();
const words = (s) => new Set(s.match(/[\p{L}\p{N}@/.'-]+/gu) ?? []);

/** Share of the shorter line's words that also occur in the other line (1 = one line is contained in the other). */
function containment(a, b) {
	const [x, y] = [words(a), words(b)];
	let both = 0;
	for (const w of x) if (y.has(w)) both++;
	return both / (Math.min(x.size, y.size) || 1);
}

/** Prose lines (outside code fences and frontmatter delimiters) with enough words to compare. */
function proseLines(text, minWords) {
	const out = [];
	let fence = false;
	text.split('\n').forEach((raw, i) => {
		if (/^\s*```/.test(raw)) fence = !fence;
		else if (!fence && raw.trim() !== '---') {
			const n = normalize(raw);
			if (words(n).size >= minWords) out.push({ line: i + 1, n });
		}
	});
	return out;
}

/** files: { name: text } → one line per near-duplicate pair (within or across files). */
export function duplicates(files, { minWords, containment: threshold } = config.duplicate) {
	const all = Object.entries(files).flatMap(([file, text]) => proseLines(text, minWords).map((l) => ({ file, ...l })));
	const out = [];
	for (let i = 0; i < all.length; i++)
		for (let j = i + 1; j < all.length; j++) {
			const [a, b] = [all[i], all[j]];
			const s = a.n === b.n ? 1 : containment(a.n, b.n);
			if (s >= threshold) out.push(`${a.file}:${a.line} duplicates ${b.file}:${b.line} (${Math.round(s * 100)}% of words) — keep one; ${how()}`);
		}
	return out;
}

export function overBudget(sizes, budgets = config.budgets) {
	return Object.entries(budgets).flatMap(([file, max]) => ((sizes[file] ?? 0) > max ? [`${file}: ${sizes[file] - max} bytes over its ${max}-byte budget — ${how()}`] : []));
}

/** Preloaded dirs: every .md in them needs its own budget, and their total stays under the dir budget. */
export function overDirBudget(dirFiles, sizes, budgets = config.budgets, dirBudgets = config.dirBudgets ?? {}) {
	return Object.entries(dirBudgets).flatMap(([dir, max]) => {
		if (dir.startsWith('_')) return [];
		const files = dirFiles(dir).map((f) => `${dir}/${f}`);
		const total = files.reduce((n, f) => n + (sizes[f] ?? 0), 0);
		return [
			...files.filter((f) => !(f in budgets)).map((f) => `${f}: preloaded but has no budget — add it to scripts/trim-guard.config.json budgets`),
			...(total > max ? [`${dir}/*.md: ${total - max} bytes over its ${max}-byte total budget — ${how()}`] : []),
		];
	});
}

/** Ledger rows `| \`key\` | file | …`: the key must still occur in that file. */
export function staleLedger(ledger, read) {
	const out = [];
	for (const [, key, file] of ledger.matchAll(/^\|\s*`([^`]+)`\s*\|\s*`?([^|`\s]+)`?\s*\|/gm)) {
		if (!(read(file) ?? '').includes(key)) out.push(`${config.ledger}: rule \`${key}\` is no longer in ${file} — drop or update the ledger row`);
	}
	return out;
}

export function check(root) {
	const read = (f) => (existsSync(path.join(root, f)) ? readFileSync(path.join(root, f), 'utf8') : undefined);
	const files = Object.fromEntries(Object.keys(config.budgets).map((f) => [f, read(f) ?? '']));
	const sizes = Object.fromEntries(Object.entries(files).map(([f, t]) => [f, Buffer.byteLength(t)]));
	const dirFiles = (d) => (existsSync(path.join(root, d)) ? readdirSync(path.join(root, d)).filter((f) => f.endsWith('.md')) : []);
	return [...overBudget(sizes), ...overDirBudget(dirFiles, sizes), ...duplicates(files), ...staleLedger(read(config.ledger) ?? '', read)];
}

if (import.meta.url === `file://${process.argv[1]}`) {
	const problems = check(path.resolve(import.meta.dirname, '..'));
	if (problems.length) {
		console.log(problems.join('\n'));
		process.exit(1);
	}
}
