// node --test scripts/check-ac-coverage.test.mjs — AC gate against throwaway spec/feature trees (no git).
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, test } from 'node:test';

const gate = path.join(import.meta.dirname, 'check-ac-coverage.mjs');
let root;
const tree = (spec, feature) => {
	root = mkdtempSync(path.join(tmpdir(), 'ac-gate-'));
	writeFileSync(path.join(root, 'x-requirements.md'), spec);
	const dir = path.join(root, 'packages/axc-verification/acceptance-api/src/features');
	mkdirSync(dir, { recursive: true });
	writeFileSync(path.join(dir, 'x.feature'), feature);
	return spawnSync(process.execPath, [gate, root], { encoding: 'utf8' });
};
afterEach(() => rmSync(root, { recursive: true, force: true }));

const spec = '| X-AC1 | a |\n| X-AC2 | b |\n| X-AC3 | docs page |\n';
test('missing AC fails and names the activating spec + scenario', () => {
	const r = tree(spec, 'Feature: x\n  @X-AC1\n  Scenario: X-AC1 a\n');
	assert.equal(r.status, 1);
	assert.match(r.stderr, /x-requirements\.md \(activated by scenario X-AC1\): X-AC2, X-AC3/);
});
test('ac-meta covers non-scenario ACs', () => {
	const r = tree(spec, 'Feature: x\n  # ac-meta: X-AC3 docs page\n  Scenario: X-AC1 a\n  Scenario: X-AC2 b\n');
	assert.equal(r.status, 0, r.stderr);
});
test('ac-meta alone never activates a spec', () => {
	assert.equal(tree(spec, 'Feature: x\n  # ac-meta: X-AC3\n  Scenario: other\n').status, 0);
});
