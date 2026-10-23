// node --test scripts/trim-output.test.mjs — fake PostToolUse payloads.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { capRead, trim } from './trim-output.mjs';

const run = (input) => execFileSync(process.execPath, [path.join(import.meta.dirname, 'trim-output.mjs')], { input, encoding: 'utf8' });
const bash = (text) => JSON.stringify({ toolName: 'run_terminal_command', toolResult: { type: 'Bash', exit_code: 1, output_for_prompt: text, output_file: '/tmp/x.log' } });
const passes = Array.from({ length: 200 }, (_, i) => `  ✓ case ${i} passed`);

test('short output untouched', () => {
	assert.equal(trim('exit: 0\nok\n'), undefined);
	assert.equal(run(bash('exit: 0\n1\n2\n')), '');
});
test('drops pass/progress lines, keeps errors, header and tail', () => {
	const text = ['exit: 1', ...passes, 'src/a.ts(3,1): error TS2345: bad', ...passes, '  × 1 failed', 'Tests 1 failed | 400 passed'].join('\n');
	const out = JSON.parse(run(bash(text))).hookSpecificOutput.updatedToolOutput;
	assert.match(out, /^exit: 1\n/);
	assert.match(out, /TS2345/);
	assert.match(out, /× 1 failed/);
	assert.doesNotMatch(out, /case 5 passed/);
	assert.match(out, /full output: \/tmp\/x\.log/);
	assert.ok(out.split('\n').length < 20);
});
test('long non-noise output keeps head, errors and tail', () => {
	const lines = Array.from({ length: 300 }, (_, i) => `line ${i}`);
	lines[150] = 'Error: boom';
	const out = trim(['exit: 1', ...lines].join('\n'));
	assert.match(out, /line 8\n… \d+ lines omitted …\nError: boom\nline 270/);
	assert.ok(out.split('\n').length <= 1 + 10 + 1 + 1 + 30);
});
test('fail open on junk or non-shell results', () => {
	assert.equal(run('nope'), '');
	assert.equal(run(JSON.stringify({ toolName: 'read_file', toolResult: { type: 'ReadFile' } })), '');
});
test('read_file: a spec-sized read passes untouched; a huge read is capped with a note', () => {
	const read = (content) => JSON.stringify({ toolName: 'read_file', toolResult: { type: 'ReadFile', FileContent: { path: 'x', content } } });
	assert.equal(run(read('a'.repeat(13000))), '');
	assert.equal(capRead('b'.repeat(16000)), undefined);
	const out = JSON.parse(run(read('c'.repeat(50000)))).hookSpecificOutput.updatedToolOutput;
	assert.equal(typeof out, 'string');
	assert.ok(out.length < 12300, String(out.length));
	assert.match(out, /\[read capped: first 12000 of 50000 chars/);
	const truncated = JSON.parse(run(JSON.stringify({ toolName: 'read_file', toolResult: 'd'.repeat(40000), toolResultTruncated: true }))).hookSpecificOutput.updatedToolOutput;
	assert.match(truncated, /of 40000 chars/);
});
test('hook config: the trimmer runs after shell commands and file reads', () => {
	const hook = JSON.parse(readFileSync(path.join(import.meta.dirname, '../.grok/hooks/trim-output.json'), 'utf8'));
	assert.equal(hook.hooks.PostToolUse[0].matcher, 'run_terminal_command|read_file');
});

test('hook runs when invoked through a symlinked path', () => {
	const dir = mkdtempSync(path.join(tmpdir(), 'mog-to-link-'));
	try {
		symlinkSync(import.meta.dirname, path.join(dir, 'scripts'));
		const text = ['exit: 1', ...passes, 'src/a.ts(3,1): error TS2345: bad', ...passes].join('\n');
		const out = execFileSync(process.execPath, [path.join(dir, 'scripts/trim-output.mjs')], { input: bash(text), encoding: 'utf8' });
		assert.match(JSON.parse(out).hookSpecificOutput.updatedToolOutput, /TS2345/);
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
});
