// node --test scripts/grok-config.test.mjs — .grok/config.toml native deny rules (Grok-only backstop to write-guard).
// Emulates Grok's Bash rule matching (docs 22-permissions: split on && || ; | and newlines, then prefix or whole glob).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';

const toml = readFileSync(path.join(import.meta.dirname, '../.grok/config.toml'), 'utf8');
const deny = [...toml.matchAll(/^\s*"Bash\((.+)\)",?\s*$/gm)].map((m) => m[1]);
const glob = (p) => new RegExp(`^${p.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`);
const segments = (cmd) => cmd.split(/&&|\|\||;|\||\n/).map((s) => s.trim().replace(/^(\w+=\S*\s+)+/, ''));
const denied = (cmd) => [cmd, ...segments(cmd)].some((s) => deny.some((p) => s.startsWith(p) || glob(p).test(s)));

test('config.toml has only a [permission] deny list, every entry a Bash rule', () => {
	assert.match(toml, /^\[permission\]\ndeny = \[$/m);
	assert.equal(deny.length, (toml.match(/^\s*"/gm) ?? []).length);
	assert.ok(deny.length >= 20);
});

test('ad-hoc checks and git commit are denied natively; the hook fallback, installs, builds and reads are not', () => {
	for (const c of [
		'git commit -m x',
		'git -C . commit -am x',
		'vitest run',
		'npx vitest run src/a.test.ts',
		'source ~/.nvm/nvm.sh && nvm use && pnpm --filter @axc/application-services exec vitest run --silent',
		'pnpm exec biome check --write packages/axc',
		'pnpm dlx knip',
		'pnpm exec knip --workspace packages/axc/rest',
		'npx tsc --noEmit',
		'tsc --noEmit -p packages/axc/rest',
		'pnpm --filter @axc/rest run typecheck',
		'pnpm -F @axc/rest test',
		'pnpm run test',
		'pnpm test:arch',
		'pnpm lint',
		'npm run typecheck',
		'pnpm run verify',
		'pnpm exec turbo run typecheck test --filter=[HEAD]',
		'turbo run test',
		'cd packages/axc/rest && pnpm typecheck',
	])
		assert.ok(denied(c), `should deny: ${c}`);
	for (const c of [
		'node scripts/stop-gate.mjs run',
		'source ~/.nvm/nvm.sh && nvm use && node scripts/stop-gate.mjs run',
		'pnpm install --frozen-lockfile',
		'pnpm --filter @axc/application-services run build',
		'pnpm exec turbo run build',
		'git log --oneline -3',
		'git status --short',
		'cat packages/axc/rest/src/index.ts',
		"rg -n 'typecheck' turbo.json",
	])
		assert.ok(!denied(c), `should allow: ${c}`);
});
