// node --test scripts/write-guard.test.mjs — fake PreToolUse payloads against the real rules file.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { test } from 'node:test';
import { check, loadRules } from './write-guard.mjs';

const root = path.resolve(import.meta.dirname, '..');
const rules = loadRules(root);
const sh = (command) => check({ toolName: 'run_terminal_command', toolInput: { command } }, rules, root);
const edit = (file_path, toolName = 'search_replace') => check({ toolName, toolInput: { file_path } }, rules, root);

test('shell: deny rules match on every line', () => {
	assert.match(sh('pnpm add left-pad'), /dependency/);
	assert.match(sh('echo ok\ngit reset --hard'), /irreversibly/);
	assert.match(sh('ls\n  git -C ../x config core.bare true'), /git config/);
	assert.equal(sh('git config --get core.bare'), undefined);
	assert.equal(sh('pnpm install --frozen-lockfile && git status'), undefined);
});
test('shell: quoted heredoc bodies are inert', () => {
	assert.equal(sh("cat > notes.md <<'EOF'\ngit reset --hard\nEOF"), undefined);
	assert.match(sh("cat <<'EOF'\nx\nEOF\ngit reset --hard"), /irreversibly/);
});
test('writes: boundary + path deny', () => {
	assert.equal(edit('packages/axc/rest/src/features/x.ts'), undefined);
	assert.equal(edit(path.join(root, 'apps/docs/docs/x.md'), 'write'), undefined);
	assert.match(edit('pnpm-lock.yaml'), /Lockfile/);
	assert.match(edit('scripts/x.mjs'), /outside allowed/);
	assert.match(edit('packages/axc/rest/dist/x.js', 'Edit'), /Generated/);
	assert.equal(check({ toolName: 'read_file', toolInput: { target_file: 'pnpm-lock.yaml' } }, rules, root), undefined);
});
test('cli: deny JSON on stdout (Grok + Claude shapes), silent allow, fail open', () => {
	const run = (input) => execFileSync(process.execPath, [path.join(import.meta.dirname, 'write-guard.mjs')], { input, encoding: 'utf8' });
	const out = JSON.parse(run(JSON.stringify({ tool_name: 'Bash', tool_input: { command: 'sudo ls' }, workspaceRoot: root })));
	assert.equal(out.decision, 'deny');
	assert.equal(out.hookSpecificOutput.permissionDecision, 'deny');
	assert.equal(run(JSON.stringify({ toolName: 'run_terminal_command', toolInput: { command: 'ls' }, workspaceRoot: root })), '');
	assert.equal(run('not json'), '');
});
