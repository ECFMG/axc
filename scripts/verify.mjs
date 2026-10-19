import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { treeFingerprint, verifyCacheDir } from './lib/tree-fingerprint.mjs';

// Runs the quality gate with compact output: one line per step, and only the tail of a failing
// step's log. Full logs are written to node_modules/.cache/axc-verify/logs/<step>.log.
// `--fast` runs the inner-loop subset (no build, knip, e18e, acceptance, audit, or Snyk).

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fast = process.argv.includes('--fast');
const turboFlags = ['--ui=stream', '--output-logs=errors-only'];
const failureTailLines = 60;
const ansiPattern = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*[A-Za-z]`, 'g');

const fullSteps = [
	{ name: 'script-policy', cmd: ['node', 'scripts/check-script-policy.mjs'] },
	{ name: 'biome', cmd: ['pnpm', 'exec', 'biome', 'check', '.'] },
	{ name: 'typecheck', cmd: ['pnpm', 'run', 'typecheck', ...turboFlags] },
	{ name: 'build', cmd: ['pnpm', 'run', 'build', ...turboFlags] },
	{ name: 'knip', cmd: ['pnpm', 'exec', 'knip', '--no-config-hints'] },
	{ name: 'e18e', cmd: ['pnpm', 'run', 'e18e'] },
	{ name: 'arch', cmd: ['pnpm', 'run', 'test:arch', ...turboFlags] },
	{ name: 'test', cmd: ['pnpm', 'run', 'test', ...turboFlags] },
	{ name: 'audit', cmd: ['pnpm', 'run', 'audit'], summary: /^│ (critical|high|moderate|low) |^│ (Package|Patched versions) |vulnerabilities found|^Severity:/ },
	{ name: 'snyk', cmd: ['pnpm', 'run', 'snyk'], echo: /^(Snyk|Reason|This is NON-BLOCKING)/ },
];

const fastSteps = [
	{ name: 'biome', cmd: ['pnpm', 'exec', 'biome', 'check', '.'] },
	{ name: 'typecheck', cmd: ['pnpm', 'run', 'typecheck', ...turboFlags] },
	{ name: 'arch', cmd: ['pnpm', 'run', 'test:arch', ...turboFlags] },
	{ name: 'unit', cmd: ['pnpm', 'exec', 'turbo', 'run', 'test', ...turboFlags] },
];

const logDir = path.join(verifyCacheDir(repoRoot), 'logs');
mkdirSync(logDir, { recursive: true });

function runStep(step) {
	return new Promise((resolve) => {
		const started = Date.now();
		const child = spawn(step.cmd[0], step.cmd.slice(1), {
			cwd: repoRoot,
			env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1' },
			stdio: ['ignore', 'pipe', 'pipe'],
		});
		let output = '';
		child.stdout.on('data', (chunk) => {
			output += chunk;
		});
		child.stderr.on('data', (chunk) => {
			output += chunk;
		});
		child.on('close', (code) => {
			const clean = output.replace(ansiPattern, '');
			const logFile = path.join(logDir, `${step.name}.log`);
			writeFileSync(logFile, clean);
			resolve({ ok: code === 0, seconds: ((Date.now() - started) / 1000).toFixed(1), output: clean, logFile });
		});
	});
}

const fingerprint = fast ? undefined : treeFingerprint(repoRoot);
const steps = fast ? fastSteps : fullSteps;
console.log(`verify${fast ? ':fast' : ''}: ${steps.map((s) => s.name).join(' → ')}`);

for (const step of steps) {
	const result = await runStep(step);
	if (result.ok) {
		console.log(`✓ ${step.name} (${result.seconds}s)`);
		if (step.echo) {
			for (const line of result.output.split('\n').filter((l) => step.echo.test(l))) {
				console.log(`  ${line}`);
			}
		}
		continue;
	}
	console.log(`✗ ${step.name} (${result.seconds}s) — full log: ${path.relative(repoRoot, result.logFile)}`);
	const all = result.output.trimEnd().split('\n');
	const lines = step.summary && !process.env.CI ? all.filter((l) => step.summary.test(l)).map((l) => l.replace(/\s*│\s*/g, ' ').trim()) : all;
	const shown = process.env.CI ? lines : lines.slice(-failureTailLines);
	if (shown.length < lines.length) {
		console.log(`  … ${lines.length - shown.length} earlier lines omitted`);
	}
	console.log(shown.join('\n'));
	process.exit(1);
}

if (fingerprint !== undefined) {
	const passDir = path.join(verifyCacheDir(repoRoot), 'passed');
	mkdirSync(passDir, { recursive: true });
	writeFileSync(path.join(passDir, fingerprint), new Date().toISOString());
}
console.log(`verify${fast ? ':fast' : ''}: all steps passed`);
