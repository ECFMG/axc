// node --test scripts/write-guard.test.mjs — fake PreToolUse payloads against the real rules file.
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
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
	assert.match(sh('mkdir -p packages/axc/rest/src/features'), /no new folders/i);
	assert.equal(sh('mkdir -p /tmp/x'), undefined);
	assert.equal(sh('pnpm install --frozen-lockfile && git status'), undefined);
});
test('shell: quoted heredoc bodies are inert', () => {
	assert.equal(sh("cat > notes.md <<'EOF'\ngit reset --hard\nEOF"), undefined);
	assert.match(sh("cat <<'EOF'\nx\nEOF\ngit reset --hard"), /irreversibly/);
});
test('writes: boundary + path deny', () => {
	assert.equal(edit('packages/axc/rest/src/x.ts'), undefined);
	assert.equal(edit(path.join(root, 'apps/docs/docs/x.md'), 'write'), undefined);
	assert.match(edit('pnpm-lock.yaml'), /Lockfile/);
	assert.match(edit('scripts/x.mjs'), /outside allowed/);
	assert.match(edit('packages/axc/rest/dist/x.js', 'Edit'), /Generated/);
	assert.match(edit('packages/axc/rest/src/features/x.ts', 'write'), /no new folders/i);
	assert.equal(edit('packages/axc/rest/src/x.routes.ts', 'write'), undefined);
	assert.equal(edit('packages/axc-verification/acceptance-api/src/features/x.feature', 'write'), undefined);
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

// Shell writes to protected paths — same table for this guard and the Copilot guard (.github/hooks/write-boundary.py).
const py = (command) => {
	const r = spawnSync('python3', [path.join(root, '.github/hooks/write-boundary.py')], { input: JSON.stringify({ toolName: 'bash', toolArgs: { command } }), encoding: 'utf8' });
	return r.error ? null : r.stdout ? JSON.parse(r.stdout).permissionDecisionReason : undefined;
};
const heredoc = (body) => `python3 - <<'EOF'\n${body}\nEOF`;
const denied = [
	'echo x > pnpm-workspace.yaml',
	'echo x >>package.json',
	'cat a | tee -a biome.json',
	"sed -i '' 's/a/b/' pnpm-workspace.yaml",
	'sed -i.bak -e s/x/y/ knip.json',
	"perl -pi -e 's/a/b/' package.json",
	'cp /tmp/x pnpm-workspace.yaml',
	'cp /tmp/pnpm-workspace.yaml .',
	'mv package.json /tmp/',
	'dd if=/dev/zero of=biome.json',
	'ls && truncate -s 0 package.json',
	'printf x > packages/axc/rest/dist/x.js',
	heredoc("p = 'pnpm-workspace.yaml'\ns = open(p).read()\nopen(p, 'w').write(s)"),
	heredoc("from pathlib import Path\nPath('package.json').write_text('{}')"),
	`node -e "require('fs').writeFileSync('biome.json', '{}')"`,
	`python3 -c "open('pnpm-workspace.yaml', 'a').write('x')"`,
];
const allowed = [
	'cat pnpm-workspace.yaml',
	"grep -n 'storybook' pnpm-workspace.yaml package.json",
	"sed -n '1,20p' package.json",
	'cp pnpm-workspace.yaml /tmp/ws.yaml',
	'{ pnpm exec turbo run typecheck; } >/tmp/check.log 2>&1 || { tail -n 30 /tmp/check.log; false; }',
	'echo x > packages/axc/rest/src/x.ts',
	'pnpm run knip 2>/dev/null | tail -3',
	`python3 -c "import json; print(json.load(open('package.json'))['name'])"`,
	`node -e "console.log(require('./package.json').name)"`,
	"cat > packages/axc/rest/src/x.ts <<'EOF'\nconst s = 'pnpm-workspace.yaml' > 'x';\nEOF",
	'git tag -m "move a > b in package.json" t1',
];
test('shell: writes to protected paths are denied, reads allowed (both guards)', () => {
	const pyOk = py('ls') !== null;
	for (const c of denied) {
		assert.match(sh(c) ?? '', /protected path/, `node should deny: ${c}`);
		if (pyOk) assert.match(py(c) ?? '', /protected path|generated/i, `python should deny: ${c}`);
	}
	for (const c of allowed) {
		assert.equal(sh(c), undefined, `node should allow: ${c}`);
		if (pyOk) assert.equal(py(c), undefined, `python should allow: ${c}`);
	}
});
test('shell: git config reads allowed; writes and git init denied (both guards)', () => {
	const reads = [
		'git config core.bare',
		'git config --get core.bare',
		'git -C ../x config --get-all remote.origin.url',
		'git config --global --get user.name',
		'git config --list --show-origin',
		'git config -l',
		'git config get core.bare',
		'git config core.bare 2>/dev/null && echo ok',
		'echo "$(git config user.name)"',
	];
	const writes = [
		'git config core.bare true',
		'git config --global user.name x',
		'git config --system core.editor vi',
		'git -C ../x config core.bare false',
		'git config --unset core.bare',
		'git config --add a.b c',
		'git config set core.bare true',
		'git config -e',
		'ls; git config user.email a@b',
		'git init',
		'git init -q /tmp/x',
	];
	const pyOk = py('ls') !== null;
	for (const c of reads) {
		assert.equal(sh(c), undefined, `node should allow: ${c}`);
		if (pyOk) assert.equal(py(c), undefined, `python should allow: ${c}`);
	}
	for (const c of writes) {
		assert.match(sh(c) ?? '', /git config/, `node should deny: ${c}`);
		if (pyOk) assert.match(py(c) ?? '', /git config/, `python should deny: ${c}`);
	}
});

test('shell: agent commit / verify are denied (Stop hook owns them), both guards', () => {
	const pyOk = py('ls') !== null;
	for (const c of ['git commit -qm x', 'git add -A && git commit -m x', 'git -C . commit -m x', 'pnpm run verify', 'pnpm verify 2>&1 | tail', 'npm run verify']) {
		assert.match(sh(c) ?? '', /Stop hook/, `node should deny: ${c}`);
		if (pyOk) assert.match(py(c) ?? '', /Stop hook/, `python should deny: ${c}`);
	}
	for (const c of ['node scripts/stop-gate.mjs run', 'git log -1 --format=%s', "cat > n.md <<'EOF'\ngit commit\nEOF"]) {
		assert.equal(sh(c), undefined, `node should allow: ${c}`);
		if (pyOk) assert.equal(py(c), undefined, `python should allow: ${c}`);
	}
});

test('shell: ad-hoc checks are denied (Stop hook verifies), both guards; hook fallback, builds and reads allowed', () => {
	const pyOk = py('ls') !== null;
	const denied = [
		'vitest run',
		'npx vitest run src/a.test.ts',
		'source ~/.nvm/nvm.sh && nvm use && pnpm --filter @axc/application-services exec vitest run --silent',
		'pnpm exec biome check --write packages/axc',
		'pnpm dlx knip',
		'pnpm exec knip --workspace packages/axc/rest',
		'npx tsc --noEmit',
		'tsc --noEmit -p packages/axc/rest',
		'pnpm --filter @axc/rest run typecheck',
		'pnpm --filter=@axc/rest typecheck',
		'pnpm -F @axc/rest test',
		'pnpm run test',
		'pnpm test:arch',
		'pnpm lint',
		'npm run typecheck',
		'pnpm exec turbo run typecheck test --filter=[HEAD] --output-logs=errors-only',
		'turbo run test',
		'cd packages/axc/rest && pnpm typecheck',
	];
	const allowed = [
		'node scripts/stop-gate.mjs run',
		'source ~/.nvm/nvm.sh && nvm use && node scripts/stop-gate.mjs run',
		'pnpm install --frozen-lockfile',
		'pnpm --filter @axc/application-services run build',
		'pnpm exec turbo run build',
		'grep -rn "pnpm test" docs',
		'ls node_modules/.bin/vitest',
		'git log --oneline -3',
		'cat packages/axc/rest/src/index.ts',
		"rg -n 'typecheck' turbo.json",
	];
	for (const c of denied) {
		assert.equal(sh(c), 'BLOCKED (write-boundary): Stop hook verifies; just stop.', `node should deny: ${c}`);
		if (pyOk) assert.match(py(c) ?? '', /Stop hook verifies; just stop\./, `python should deny: ${c}`);
	}
	for (const c of allowed) {
		assert.equal(sh(c), undefined, `node should allow: ${c}`);
		if (pyOk) assert.equal(py(c), undefined, `python should allow: ${c}`);
	}
});
