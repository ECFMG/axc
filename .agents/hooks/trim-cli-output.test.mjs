import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { replacementFor, trimCommandOutput } from './trim-cli-output.mjs';

function vitestLog() {
	const passing = Array.from({ length: 180 }, (_, index) => ` ✓ src/pass-${index}.test.ts (4 tests) 3ms`);
	return [
		' RUN  v3.2.4',
		'',
		...passing,
		' ❯ src/enrollment.test.ts (2 tests | 1 failed) 12ms',
		'   × rejects a missing course',
		'     → expected 404 to be 400',
		'   ✓ accepts a valid request 2ms',
		'',
		' Test Files  1 failed | 180 passed (181)',
		'      Tests  1 failed | 720 passed (721)',
		'   Duration  4.21s',
		'',
	].join('\n');
}

function turboLog() {
	const hits = Array.from({ length: 80 }, (_, index) => `@axc/pkg-${index}:test: cache hit, replaying logs abc${index}`);
	return [...hits, "@axc/rest:build: src/index.ts(4,1): error TS2304: Cannot find name 'Course'.", '', ' Tasks:    8 successful, 9 total', 'Cached:    8 cached, 9 total', '  Time:    2.4s', 'Failed:    @axc/rest#build'].join(
		'\n',
	);
}

test('leaves short shell output unchanged', () => {
	const text = 'exit: 0\n## nrn-xai-3\n';
	assert.equal(trimCommandOutput(text, 'git status -sb'), null);
});

test('drops passing tests and keeps the failure with the summary', () => {
	const trimmed = trimCommandOutput(vitestLog(), 'pnpm exec vitest run src/enrollment.test.ts');
	assert.ok(trimmed);
	assert.match(trimmed, /trimmed CLI output/);
	assert.match(trimmed, /rejects a missing course/);
	assert.match(trimmed, /expected 404 to be 400/);
	assert.match(trimmed, /Test Files {2}1 failed/);
	assert.match(trimmed, /Duration {2}4\.21s/);
	assert.doesNotMatch(trimmed, /src\/pass-40\.test\.ts/);
	assert.ok(trimmed.length < 2_000);
});

test('keeps compiler diagnostics and the task summary from a cached turbo log', () => {
	const trimmed = trimCommandOutput(turboLog(), 'pnpm exec turbo run test build');
	assert.ok(trimmed);
	assert.match(trimmed, /error TS2304/);
	assert.match(trimmed, /Failed:\s+@axc\/rest#build/);
	assert.match(trimmed, /Tasks:\s+8 successful/);
	assert.doesNotMatch(trimmed, /cache hit, replaying logs abc10/);
});

test('keeps the first and last diagnostics when every line is an error', () => {
	const lines = Array.from({ length: 300 }, (_, index) => `src/file-${index}.ts(1,1): error TS2322: Type 'string' is not assignable to type 'number'.`);
	const trimmed = trimCommandOutput(lines.join('\n'), 'pnpm exec tsc --build');
	assert.ok(trimmed);
	assert.match(trimmed, /src\/file-0\.ts/);
	assert.match(trimmed, /src\/file-299\.ts/);
	assert.match(trimmed, /lines omitted/);
	assert.ok(trimmed.length < 12_000);
});

test('strips ANSI only when that saves a meaningful amount', () => {
	const noisy = `\u001B[32m${'✓ src/ok.test.ts (1 test) 1ms\n'.repeat(200)}\u001B[0m`;
	const trimmed = trimCommandOutput(`${noisy}Test Files  200 passed`, 'pnpm test');
	assert.ok(trimmed);
	assert.doesNotMatch(trimmed, /\u001B/);
});

test('log-trims a git diff command whose output is a test log', () => {
	const trimmed = trimCommandOutput(vitestLog(), 'git diff');
	assert.ok(trimmed);
	assert.match(trimmed, /rejects a missing course/);
	assert.doesNotMatch(trimmed, /omitted diffs for/);
	assert.doesNotMatch(trimmed, /src\/pass-40\.test\.ts/);
});

test('keeps a short git diff intact and truncates a long one by file', () => {
	const shortDiff = 'diff --git a/src/a.ts b/src/a.ts\n+export const a = 1;\n';
	assert.equal(trimCommandOutput(shortDiff, 'git diff'), null);

	const file = (name) => `diff --git a/${name} b/${name}\n--- a/${name}\n+++ b/${name}\n@@ -1 +1 @@\n-${'x'.repeat(400)}\n+${'y'.repeat(400)}\n`;
	const files = Array.from({ length: 20 }, (_, index) => file(`src/file-${index}.ts`)).join('');
	const trimmed = trimCommandOutput(files, 'git diff -- packages/axc');
	assert.ok(trimmed);
	assert.match(trimmed, /diff --git a\/src\/file-0\.ts/);
	assert.match(trimmed, /omitted diffs for \d+ files/);
	assert.match(trimmed, /src\/file-19\.ts/);
	assert.doesNotMatch(trimmed, /diff --git a\/src\/file-19\.ts/);
});

test('keeps a moderate diff stat and windows a very long one', () => {
	const line = (index) => ` packages/axc/file-${index}.ts | 2 +-`;
	assert.equal(trimCommandOutput(Array.from({ length: 80 }, (_, index) => line(index)).join('\n'), 'git diff --stat'), null);

	const trimmed = trimCommandOutput(Array.from({ length: 400 }, (_, index) => line(index)).join('\n'), 'git diff --stat');
	assert.ok(trimmed);
	assert.match(trimmed, /file-0\.ts/);
	assert.match(trimmed, /file-399\.ts/);
	assert.match(trimmed, /lines omitted/);
	assert.doesNotMatch(trimmed, /omitted diffs for/);
});

test('edits output_for_prompt and preserves the exit code', () => {
	const replacement = replacementFor({
		toolName: 'run_terminal_command',
		toolInput: { command: 'pnpm test' },
		toolResult: {
			type: 'Bash',
			command: 'pnpm test',
			exit_code: 1,
			current_dir: '/repo',
			output_for_prompt: vitestLog(),
		},
	});
	assert.equal(replacement.exit_code, 1);
	assert.equal(replacement.current_dir, '/repo');
	assert.equal(replacement.type, 'Bash');
	assert.match(replacement.output_for_prompt, /rejects a missing course/);
});

test('trims pre_formatted and leaves the other text fields', () => {
	const raw = vitestLog();
	const replacement = replacementFor({
		toolName: 'Bash',
		toolInput: { command: 'pnpm test' },
		toolResult: {
			type: 'Bash',
			pre_formatted: raw,
			stdout: raw,
			exit_code: 1,
		},
	});
	assert.match(replacement.pre_formatted, /trimmed CLI output/);
	assert.equal(replacement.stdout, raw);
	assert.equal(replacement.exit_code, 1);
});

test('ignores non-shell tools and output under the size threshold', () => {
	assert.equal(replacementFor({ toolName: 'read_file', toolInput: { command: 'pnpm test' }, toolResult: vitestLog() }), null);
	assert.equal(replacementFor({ toolName: 'run_terminal_command', toolInput: { command: 'git status' }, toolResult: '## nrn-xai-3\n' }), null);
});

test('the hook prints a PostToolUse replacement and fails open on bad input', () => {
	const event = {
		toolName: 'run_terminal_command',
		toolInput: { command: 'pnpm test' },
		toolResult: vitestLog(),
	};
	const script = fileURLToPath(new URL('./trim-cli-output.mjs', import.meta.url));
	const success = spawnSync(process.execPath, [script], {
		input: JSON.stringify(event),
		encoding: 'utf8',
	});
	assert.equal(success.status, 0);
	const parsed = JSON.parse(success.stdout);
	assert.equal(parsed.hookSpecificOutput.hookEventName, 'PostToolUse');
	assert.match(parsed.hookSpecificOutput.updatedToolOutput, /rejects a missing course/);

	const failure = spawnSync(process.execPath, [script], {
		input: '{',
		encoding: 'utf8',
	});
	assert.equal(failure.status, 0);
	assert.equal(failure.stdout, '');
});
