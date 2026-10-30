import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { broadGlobReason, closedReferenceInText, heavyCommandReason, logAllowsPath, wideShellReason } from './check-budget.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));

async function hookDecision(payload, env = {}, cwd = root) {
	const child = spawn(process.execPath, [join(root, '.cursor/hooks/guard-transcript.mjs')], {
		cwd,
		env: { ...process.env, CELLIX_AGENT_ID: '', CURSOR_PROJECT_DIR: cwd, ...env },
	});
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
		assert.match(heavyCommandReason('pnpm --filter @axc-verification/acceptance-api test:acceptance') ?? '', /agent-check/);
		assert.match(heavyCommandReason('pnpm --filter @axc/rest test') ?? '', /agent-check/);
		assert.equal(heavyCommandReason('pnpm --filter @cellix/generator generate -- --context course'), undefined);
	});

	it('leaves the wrapper, verify:flag, and typecheck alone', () => {
		assert.equal(heavyCommandReason('pnpm run agent-check -- pnpm run verify'), undefined);
		assert.equal(heavyCommandReason('pnpm run verify:flag'), undefined);
		assert.equal(heavyCommandReason('pnpm run typecheck'), undefined);
		assert.equal(heavyCommandReason('pnpm run test:agent-check'), undefined);
		assert.match(heavyCommandReason('export CELLIX_AGENT_ID=task-a; pnpm --filter @axc-verification/acceptance-api test:acceptance 2>&1') ?? '', /agent-check/);
		assert.match(heavyCommandReason('pnpm run agent-check -- pnpm run verify | tail -150') ?? '', /tail/);
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
	it('names node_modules, packages/cellix, dist, and old transcripts', () => {
		assert.equal(closedReferenceInText('packages/cellix/lint/src/content.ts'), 'packages/cellix/lint/src/content.ts');
		assert.equal(closedReferenceInText('cat node_modules/mongoose/package.json'), 'node_modules/mongoose/package.json');
		assert.equal(closedReferenceInText('packages/axc/domain/dist/course.d.ts'), 'dist/course.d.ts');
		assert.equal(closedReferenceInText('/tmp/agent-transcripts/run.jsonl'), 'agent-transcripts/run.jsonl');
		assert.equal(closedReferenceInText('packages/axc/rest/src/index.ts'), undefined);
		assert.equal(closedReferenceInText('"dist"'), undefined);
		assert.equal(closedReferenceInText("rg --glob '!**/dist/**' packages/axc"), undefined);
		assert.equal(closedReferenceInText('ls dist'), 'dist');
	});

	it('allows a closed file only when the check log names it', () => {
		assert.equal(logAllowsPath('error TS2307 packages/cellix/lint/src/content.ts', 'packages/cellix/lint/src/content.ts'), true);
		assert.equal(logAllowsPath('error in content.ts', 'packages/cellix'), false);
		assert.equal(logAllowsPath('nothing', 'node_modules/mongoose/package.json'), false);
		assert.equal(logAllowsPath('src/contexts/catalog/course/index.ts(5,66): error TS2503', 'packages/axc/application-services/src/contexts/catalog/course/index.ts'), true);
		assert.equal(logAllowsPath('error in index.ts', 'packages/axc/rest/src/index.ts'), false);
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
		const named = await hookDecision({
			tool_name: 'Grep',
			tool_input: { pattern: 'health', path: 'packages/axc/rest/src' },
			hook_event_name: 'preToolUse',
		});
		assert.equal(named.permission, 'allow');
		const otherKey = await hookDecision({
			tool_name: 'Grep',
			tool_input: { pattern: 'health', file_path: 'packages/axc/rest/src/index.ts' },
			hook_event_name: 'preToolUse',
		});
		assert.equal(otherKey.permission, 'allow');
		const missing = await hookDecision({ tool_name: 'Grep', tool_input: { pattern: 'health' }, hook_event_name: 'preToolUse' });
		assert.equal(missing.permission, 'deny');
		const closed = await hookDecision({
			tool_name: 'Grep',
			tool_input: { pattern: 'health', path: 'packages/cellix/guardrails' },
			hook_event_name: 'preToolUse',
		});
		assert.equal(closed.permission, 'deny');
		const generate = await hookDecision({
			command: 'pnpm --filter @cellix/generator generate -- --context course --subdomain course --action create',
			hook_event_name: 'beforeShellExecution',
		});
		assert.equal(generate.permission, 'allow');
		const listed = await hookDecision({ command: 'pnpm list @lucaspaganini/value-objects -r --depth 0', hook_event_name: 'beforeShellExecution' });
		assert.equal(listed.permission, 'allow');
		const cellix = await hookDecision({ command: 'ls packages/cellix/generator', hook_event_name: 'beforeShellExecution' });
		assert.equal(cellix.permission, 'deny');
		const acceptance = await hookDecision({
			command: 'pnpm --filter @axc-verification/acceptance-api test:acceptance',
			hook_event_name: 'beforeShellExecution',
		});
		assert.equal(acceptance.permission, 'deny');
		const writePackage = await hookDecision({
			command: 'cat > packages/axc/data-sources-mongoose-models/package.json << \'EOF\'\n{\n  "files": ["dist"]\n}\nEOF',
			hook_event_name: 'beforeShellExecution',
		});
		assert.equal(writePackage.permission, 'allow');
		const readBuild = await hookDecision({ command: 'ls packages/axc/domain/dist', hook_event_name: 'beforeShellExecution' });
		assert.equal(readBuild.permission, 'deny');
		const environment = await hookDecision({ command: "printenv | rg -i 'cellix|agent' || true", hook_event_name: 'beforeShellExecution' });
		assert.equal(environment.permission, 'allow');
		const bareSearch = await hookDecision({ command: 'rg health', hook_event_name: 'beforeShellExecution' });
		assert.equal(bareSearch.permission, 'deny');
	});

	it('stops the third denial and the third verify', async () => {
		const workspace = mkdtempSync(join(tmpdir(), 'cellix-repeat-'));
		writeFileSync(join(workspace, 'ocom-write.config.json'), `${JSON.stringify({ read: { '**': true }, write: { '**': true } })}\n`);
		const env = { CELLIX_AGENT_ID: 'task-a' };
		const read = { tool_name: 'Read', tool_input: { path: '.cellix/sessions/task-a.json' }, hook_event_name: 'preToolUse' };
		const verify = { command: 'pnpm run agent-check -- pnpm run verify', hook_event_name: 'beforeShellExecution' };
		try {
			const first = await hookDecision(read, env, workspace);
			const second = await hookDecision(read, env, workspace);
			const third = await hookDecision(read, env, workspace);
			assert.match(first.agent_message, /session file stays closed/);
			assert.match(second.agent_message, /session file stays closed/);
			assert.match(third.agent_message, /Stop/);
			assert.equal((await hookDecision(verify, env, workspace)).permission, 'allow');
			assert.equal((await hookDecision(verify, env, workspace)).permission, 'allow');
			assert.equal((await hookDecision(verify, env, workspace)).permission, 'deny');
		} finally {
			rmSync(workspace, { recursive: true, force: true });
		}
	});

	it('creates the session at startup and leaves the product tree readable', async () => {
		const workspace = mkdtempSync(join(tmpdir(), 'cellix-startup-'));
		const sessionFile = join(workspace, '.cellix', 'sessions', 'task-a.json');
		writeFileSync(join(workspace, 'ocom-write.config.json'), `${JSON.stringify({ read: { '.cellix/**': false, 'packages/axc/**': true, '**': true }, write: { '**': true } })}\n`);
		try {
			const searched = await hookDecision({ tool_name: 'Grep', tool_input: { pattern: 'health', path: 'packages/axc/rest/src' }, hook_event_name: 'preToolUse' }, { CELLIX_AGENT_ID: 'task-a' }, workspace);
			assert.equal(searched.permission, 'allow');
			const read = await hookDecision({ tool_name: 'Read', tool_input: { path: 'packages/axc/rest/src/index.ts' }, hook_event_name: 'preToolUse' }, { CELLIX_AGENT_ID: 'task-a' }, workspace);
			assert.equal(read.permission, 'allow');
			const dumped = await hookDecision({ command: "find packages/axc -name '*.ts' | while read f; do cat $f; done", hook_event_name: 'beforeShellExecution' }, { CELLIX_AGENT_ID: 'task-a' }, workspace);
			assert.equal(dumped.permission, 'deny');
			const started = JSON.parse(readFileSync(sessionFile, 'utf8'));
			assert.equal(started.write, undefined);
			assert.equal(started.read, undefined);
		} finally {
			rmSync(workspace, { recursive: true, force: true });
		}
	});

	it('writes the startup session from sessionStart', async () => {
		const workspace = mkdtempSync(join(tmpdir(), 'cellix-session-start-'));
		const sessionFile = join(workspace, '.cellix', 'sessions', 'task-a.json');
		const child = spawn(process.execPath, [join(root, '.cursor/hooks/cellix-session-start.mjs')], {
			cwd: workspace,
			env: { ...process.env, CELLIX_AGENT_ID: 'task-a', CURSOR_PROJECT_DIR: workspace },
		});
		let out = '';
		child.stdout.setEncoding('utf8');
		child.stdout.on('data', (chunk) => {
			out += chunk;
		});
		child.stdin.end('{}');
		await once(child, 'exit');
		try {
			const reply = JSON.parse(out);
			assert.equal(reply.env.CELLIX_AGENT_ID, 'task-a');
			const started = JSON.parse(readFileSync(sessionFile, 'utf8'));
			assert.equal(started.write, undefined);
			assert.equal(started.read, undefined);
			assert.match(reply.additional_context, /Do not list the tree/);
			assert.equal(readFileSync(join(workspace, '.cellix', 'active-id'), 'utf8').trim(), 'task-a');
		} finally {
			rmSync(workspace, { recursive: true, force: true });
		}
	});

	it('sets an agent id from the conversation when the process has none', async () => {
		const workspace = mkdtempSync(join(tmpdir(), 'cellix-session-mint-'));
		const sessionFile = join(workspace, '.cellix', 'sessions', 'conv-1.json');
		const child = spawn(process.execPath, [join(root, '.cursor/hooks/cellix-session-start.mjs')], {
			cwd: workspace,
			env: { ...process.env, CELLIX_AGENT_ID: '', CURSOR_PROJECT_DIR: workspace },
		});
		let out = '';
		child.stdout.setEncoding('utf8');
		child.stdout.on('data', (chunk) => {
			out += chunk;
		});
		child.stdin.end(JSON.stringify({ conversation_id: 'conv-1' }));
		await once(child, 'exit');
		try {
			const reply = JSON.parse(out);
			assert.equal(reply.env.CELLIX_AGENT_ID, 'conv-1');
			const started = JSON.parse(readFileSync(sessionFile, 'utf8'));
			assert.equal(started.agentId, 'conv-1');
			assert.equal(started.write, undefined);
			assert.equal(readFileSync(join(workspace, '.cellix', 'active-id'), 'utf8').trim(), 'conv-1');
		} finally {
			rmSync(workspace, { recursive: true, force: true });
		}
	});
});

describe('agent-check', () => {
	it('prints the file location from a failed check', () => {
		const result = spawnSync(
			process.execPath,
			['scripts/agent-check.mjs', '--', process.execPath, '--eval', "console.error('packages/axc/rest/src/index.ts:12:5 lint/style/useFilenamingConvention'); console.error('ELIFECYCLE Command failed.'); process.exit(1);"],
			{ cwd: root, encoding: 'utf8' },
		);
		assert.equal(result.status, 1);
		assert.match(result.stderr, /index\.ts:12:5/);
	});

	it('keeps the detail line when the only diagnostic is a summary', () => {
		const result = spawnSync(
			process.execPath,
			['scripts/agent-check.mjs', '--', process.execPath, '--eval', "console.error('Found 5 errors.'); console.error('packages/axc/rest/src/index.ts format'); console.error('ELIFECYCLE Command failed.'); process.exit(1);"],
			{ cwd: root, encoding: 'utf8' },
		);
		assert.equal(result.status, 1);
		assert.match(result.stderr, /index\.ts format/);
	});

	it('prints Expected before the other diagnostics', () => {
		const result = spawnSync(
			process.execPath,
			['scripts/agent-check.mjs', '--', process.execPath, '--eval', "console.error('Found: export class'); console.error('Expected: class CourseReadRepositoryImpl'); console.error('ELIFECYCLE Command failed.'); process.exit(1);"],
			{ cwd: root, encoding: 'utf8' },
		);
		assert.equal(result.status, 1);
		assert.match(result.stderr, /FAIL:.*Expected: class CourseReadRepositoryImpl/);
		const block = result.stderr.slice(result.stderr.indexOf('Error:'));
		assert.ok(block.startsWith('Error:'));
		assert.ok(block.indexOf('Expected:') < block.indexOf('Found:'));
	});
});

describe('wide shell dumps', () => {
	it('rejects a multi-file cat and a nameless find', () => {
		assert.match(wideShellReason('cat a.json; cat b.json; cat c.json') ?? '', /one file/);
		assert.match(wideShellReason('find packages/axc -type f') ?? '', /one file/);
		assert.match(wideShellReason("find packages/axc -name '*.ts' | while read f; do cat $f; done") ?? '', /one file/);
		assert.equal(wideShellReason('find packages/axc -name package.json'), undefined);
		assert.equal(wideShellReason('cat packages/axc/rest/src/index.ts'), undefined);
	});
});
