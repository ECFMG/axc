import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { broadGlobReason, closedReferenceInText, heavyCommandReason, logAllowsPath, wideShellReason } from './check-budget.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));

async function hookDecision(payload) {
	const child = spawn(process.execPath, ['.cursor/hooks/guard-transcript.mjs'], { cwd: root });
	let out = '';
	child.stdout.setEncoding('utf8');
	child.stdout.on('data', (chunk) => {
		out += chunk;
	});
	child.stdin.end(JSON.stringify(payload));
	await once(child, 'exit');
	return JSON.parse(out);
}

describe('heavy commands', () => {
	it('sends verify, check, and the full test scripts through the wrapper', () => {
		assert.match(heavyCommandReason('pnpm run verify') ?? '', /agent-check/);
		assert.match(heavyCommandReason('pnpm run check') ?? '', /agent-check/);
		assert.match(heavyCommandReason('pnpm run test') ?? '', /agent-check/);
		assert.match(heavyCommandReason('pnpm run test:acceptance') ?? '', /agent-check/);
	});

	it('leaves the wrapper, verify:flag, and typecheck alone', () => {
		assert.equal(heavyCommandReason('pnpm run agent-check -- pnpm run verify'), undefined);
		assert.equal(heavyCommandReason('pnpm run verify:flag'), undefined);
		assert.equal(heavyCommandReason('pnpm run typecheck'), undefined);
		assert.equal(heavyCommandReason('pnpm run test:agent-check'), undefined);
	});
});

describe('broad globs', () => {
	it('rejects a whole tree and allows a filename', () => {
		assert.equal(broadGlobReason('packages/axc-verification/**/*'), 'That glob covers a whole tree. Name a directory and a filename, for example packages/axc/rest/src/**/*.ts.');
		assert.equal(broadGlobReason('**/course*/**'), 'That glob covers a whole tree. Name a directory and a filename, for example packages/axc/rest/src/**/*.ts.');
		assert.equal(broadGlobReason('packages/axc/rest/src/**/*.ts'), undefined);
	});
});

describe('closed trees', () => {
	it('names node_modules and packages/cellix', () => {
		assert.equal(closedReferenceInText('packages/cellix/lint/src/content.ts'), 'packages/cellix/lint/src/content.ts');
		assert.equal(closedReferenceInText('cat node_modules/mongoose/package.json'), 'node_modules/mongoose/package.json');
		assert.equal(closedReferenceInText('packages/axc/rest/src/index.ts'), undefined);
	});

	it('allows a closed file only when the check log names it', () => {
		assert.equal(logAllowsPath('error TS2307 packages/cellix/lint/src/content.ts', 'packages/cellix/lint/src/content.ts'), true);
		assert.equal(logAllowsPath('error in content.ts', 'packages/cellix'), false);
		assert.equal(logAllowsPath('nothing', 'node_modules/mongoose/package.json'), false);
	});
});

describe('the transcript hook', () => {
	it('stops an unwrapped verify and a whole-tree glob', async () => {
		const verify = await hookDecision({ command: 'pnpm run verify', hook_event_name: 'beforeShellExecution' });
		assert.equal(verify.permission, 'deny');
		const glob = await hookDecision({
			tool_name: 'Glob',
			tool_input: { glob_pattern: 'packages/axc-verification/**/*' },
			hook_event_name: 'preToolUse',
		});
		assert.equal(glob.permission, 'deny');
		const wrapped = await hookDecision({ command: 'pnpm run agent-check -- pnpm run verify', hook_event_name: 'beforeShellExecution' });
		assert.equal(wrapped.permission, 'allow');
	});
});

describe('wide shell dumps', () => {
	it('rejects a multi-file cat and a nameless find', () => {
		assert.match(wideShellReason('cat a.json; cat b.json; cat c.json') ?? '', /one file/);
		assert.match(wideShellReason('find packages/axc -type f') ?? '', /one file/);
		assert.equal(wideShellReason('find packages/axc -name package.json'), undefined);
		assert.equal(wideShellReason('cat packages/axc/rest/src/index.ts'), undefined);
	});
});
