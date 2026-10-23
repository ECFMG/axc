// node --test scripts/grok-config.test.mjs — no native Bash permission rules in the project Grok config.
// Smoke (2026-10-23, grok 1.0.67 -p --always-approve): with any Bash deny/ask rule loaded, `echo $(git rev-parse HEAD)` is
// refused ("could not be checked against the permission rules"); without them it runs. Unsplittable commands would be
// refused headless or prompt (hang) interactively, so the write-boundary PreToolUse hook stays the only command deny.
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';

const file = path.join(import.meta.dirname, '../.grok/config.toml');

test('project .grok/config.toml sets no Bash deny/ask permission rules', () => {
	const toml = existsSync(file) ? readFileSync(file, 'utf8') : '';
	assert.doesNotMatch(toml, /Bash\(|tool\s*=\s*"bash"/i);
});
