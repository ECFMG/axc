// node --test scripts/grok-rules.test.mjs — the preloaded Grok rules stay in sync with their sources.
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { PATTERNS_FILE, render } from './grok-rules.mjs';

const root = path.resolve(import.meta.dirname, '..');

test('mog-patterns.md matches the pattern sources (regenerate: node scripts/grok-rules.mjs)', () => {
	assert.equal(readFileSync(path.join(root, PATTERNS_FILE), 'utf8'), render(root));
});

test('.grok/rules holds exactly the preloaded map, write skeleton and patterns', () => {
	assert.deepEqual(readdirSync(path.join(root, '.grok/rules')).sort(), ['mog-patterns.md', 'mog-repo-map.md', 'mog-write-skeleton.md']);
});

test('the map skill is a pointer, not a second copy of the map', () => {
	const skill = readFileSync(path.join(root, '.agents/skills/mog-repo-map/SKILL.md'), 'utf8');
	assert.ok(skill.length < 600, `pointer is ${skill.length} bytes`);
	assert.match(skill, /\.grok\/rules\/mog-repo-map\.md/);
});
