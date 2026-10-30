import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { landDecision, pathsFromPorcelain } from './land.mjs';

const session = {
	agentId: 'task-a',
	files: ['packages/axc/rest/src/', 'apps/docs/'],
	write: ['packages/axc/rest/src/', 'apps/docs/'],
};

describe('land', () => {
	it('parses porcelain including a rename', () => {
		const paths = pathsFromPorcelain(' M packages/axc/rest/src/index.ts\0?? pnpm-lock.yaml\0R  old.ts\0packages/axc/rest/src/new.ts\0');
		assert.deepEqual(paths, ['packages/axc/rest/src/index.ts', 'pnpm-lock.yaml', 'old.ts', 'packages/axc/rest/src/new.ts']);
	});

	it('lands a session diff and names a path that left it', () => {
		const clean = landDecision(['packages/axc/rest/src/index.ts', 'pnpm-lock.yaml', '.cellix/verify.json'], session);
		assert.equal(clean.ok, true);
		assert.equal(clean.message, 'CELLIX_LAND=pass');
		const dirty = landDecision(['packages/axc/rest/src/index.ts', 'scripts/land.mjs'], session);
		assert.equal(dirty.ok, false);
		assert.deepEqual(dirty.off, ['scripts/land.mjs']);
		const missing = landDecision(['packages/axc/rest/src/index.ts'], null);
		assert.match(missing.message, /verify/);
	});
});
