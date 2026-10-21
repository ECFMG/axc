// AC coverage gate: every `<ID>-AC<n>` in an active spec needs its own tagged acceptance scenario.
// Spec = root or docs/ *.md whose name contains requirements|spec|srd. A spec is active once any of its
// AC ids appears in a scenario (so unrelated specs in the repo don't fail the gate). No spec / no ids → silent.
// Scenario ids come from its own @tags or its `Scenario:` title (feature-level tags don't count).
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.argv[2] ?? process.cwd();
const featuresDir = path.join(root, 'packages/axc-verification/acceptance-api/src/features');
const idPattern = /\b[A-Z][A-Z0-9]*-AC\d+\b/g;
const specName = /(requirements|spec|srd)/i;

function mdFiles(dir) {
	if (!existsSync(dir)) return [];
	return readdirSync(dir, { withFileTypes: true })
		.filter((e) => e.isFile() && e.name.endsWith('.md') && specName.test(e.name))
		.map((e) => path.join(dir, e.name));
}

function specIds(file) {
	const text = readFileSync(file, 'utf8');
	const tableIds = [...text.matchAll(/^\|\s*([A-Z][A-Z0-9]*-AC\d+)\s*\|/gm)].map((m) => m[1]);
	return new Set(tableIds.length ? tableIds : (text.match(idPattern) ?? []));
}

function featureFiles(dir) {
	if (!existsSync(dir)) return [];
	return readdirSync(dir, { withFileTypes: true, recursive: true })
		.filter((e) => e.isFile() && e.name.endsWith('.feature'))
		.map((e) => path.join(e.parentPath ?? e.path, e.name));
}

const covered = new Set();
for (const file of featureFiles(featuresDir)) {
	let tags = [];
	for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
		const t = line.trim();
		if (t.startsWith('@')) tags.push(t);
		else if (/^Scenario( Outline)?:/.test(t)) {
			for (const id of `${tags.join(' ')} ${t}`.match(idPattern) ?? []) covered.add(id);
			tags = [];
		} else if (/^Feature:/.test(t)) tags = [];
	}
}

const gaps = [];
for (const spec of [...mdFiles(root), ...mdFiles(path.join(root, 'docs'))]) {
	const ids = [...specIds(spec)];
	if (!ids.some((id) => covered.has(id))) continue;
	const missing = ids.filter((id) => !covered.has(id));
	if (missing.length) gaps.push(`${path.relative(root, spec)}: ${missing.join(', ')}`);
}

if (gaps.length) {
	console.error('AC coverage failed: each AC id needs its own scenario (tag `@<ID>-AC<n>` or put the id in the Scenario title). Missing:');
	for (const g of gaps) console.error(`  ${g}`);
	process.exit(1);
}
