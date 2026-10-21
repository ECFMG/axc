// node --test scripts/trim-output.test.mjs — fake PostToolUse payloads.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { test } from 'node:test';
import { trim } from './trim-output.mjs';

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
