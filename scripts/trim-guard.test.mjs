// node --test scripts/trim-guard.test.mjs — the trim guard is report-only and runs inside verify.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { check, config, duplicates, overBudget, staleLedger } from './trim-guard.mjs';

const root = path.resolve(import.meta.dirname, '..');

test('repo: always-loaded files are within budget, duplicate-free, and every ledger rule still exists', () => {
	assert.deepEqual(check(root), []);
});

test('config: one protection window and every budgeted file exists', () => {
	assert.equal(config.TRIM_PROTECT_RUNS, 20);
	for (const file of Object.keys(config.budgets)) assert.ok(readFileSync(path.join(root, file)).length > 0, file);
	assert.ok(!Object.keys(config.budgets).includes(config.trimLog) && !Object.keys(config.budgets).includes(config.ledger));
});

test('over budget: one line naming the file, the bytes over and the fix', () => {
	const [line, ...rest] = overBudget({ 'AGENTS.md': 120, 'x.md': 5 }, { 'AGENTS.md': 100, 'x.md': 10 });
	assert.equal(rest.length, 0);
	assert.match(line, /^AGENTS\.md: 20 bytes over its 100-byte budget — trim or move to an on-demand file \(.*never in SCORE.*last 20 runs.*\)$/);
});

test('duplicates: exact and contained lines flagged across files; distinct and short lines and code are not', () => {
	const a = 'Never run verify or commit yourself; the Stop hook does it once.\nshort line here\n```\nconst same = 1; // identical code line ok\n```';
	const b = '- Never run verify or `commit` yourself — the Stop hook does it once, then commits.\nshort line here\n```\nconst same = 1; // identical code line ok\n```';
	const c = 'Integers: digits only, then Number.isSafeInteger, then the range check.';
	const out = duplicates({ 'a.md': a, 'b.md': b, 'c.md': c });
	assert.equal(out.length, 1);
	assert.match(out[0], /^a\.md:1 duplicates b\.md:1 \(\d+% of words\) — keep one; trim or move/);
});

test('ledger: rows whose rule left the file are reported; present rules pass', () => {
	const ledger = '| rule | file | sink |\n| --- | --- | --- |\n| `else TS2883` | `map.md` | TS2883 |\n| `gone rule` | map.md | x |';
	assert.deepEqual(
		staleLedger(ledger, (f) => (f === 'map.md' ? 'Exported helpers need a return type, else TS2883.' : undefined)),
		[`${config.ledger}: rule \`gone rule\` is no longer in map.md — drop or update the ledger row`],
	);
});

test('CLI runs when invoked through a symlinked path (prints its ok line)', () => {
	const dir = mkdtempSync(path.join(tmpdir(), 'mog-tg-link-'));
	try {
		symlinkSync(import.meta.dirname, path.join(dir, 'scripts'));
		assert.equal(execFileSync(process.execPath, [path.join(dir, 'scripts/trim-guard.mjs')], { encoding: 'utf8' }).trim(), 'trim-guard: ok');
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
});
