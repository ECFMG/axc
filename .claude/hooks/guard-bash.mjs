import { existsSync } from 'node:fs';
import path from 'node:path';
import { block, boundaryHint, readHookInput, repoRoot, toRepoPath, writeViolation } from './lib/harness.mjs';

// PreToolUse (Bash): blocks commands that bypass the toolchain or the quality gates, and
// shell writes into files outside the write boundary. Best-effort; the Stop hook re-checks
// the full diff against the boundary.

const input = await readHookInput();
const command = input.tool_input?.command ?? '';
const sep = String.raw`(^|[\s;&|()\x60])`;

const rules = [
	{ pattern: new RegExp(`${sep}(npm|npx|yarn)(\\s|$)`), reason: 'This repo uses pnpm only. Use `pnpm`, `pnpm exec`, or `pnpm dlx`.' },
	{ pattern: /--no-verify\b|\bHUSKY=0\b/, reason: 'Skipping git hooks bypasses the quality gate. Fix the failure instead.' },
	{ pattern: /\bgit\s+push\b.*(\s-f\b|--force)/, reason: 'Force pushes are not allowed.' },
	{ pattern: /\bpnpm\b.*\s(-w|--workspace-root)\b/, reason: 'The root package.json is outside the write boundary. Add dependencies to the specific workspace package with `pnpm --filter <pkg> add`.' },
	{ pattern: /ignore-scripts|approve-builds|dangerouslyAllowAllBuilds/, reason: 'Dependency lifecycle scripts must stay disabled (.npmrc ignore-scripts=true).' },
];

for (const { pattern, reason } of rules) {
	if (pattern.test(command)) {
		block(`Blocked: ${reason}`);
	}
}

// Shell writes: redirection targets, and path arguments of mutating commands.
const targets = [];
for (const match of command.matchAll(/(?:^|[^0-9&<>])>>?\s*([^\s;&|<>]+)/g)) {
	targets.push(match[1]);
}
for (const segment of command.split(/&&|\|\||[;|]/)) {
	const words = segment
		.trim()
		.split(/\s+/)
		.map((w) => w.replace(/^['"]|['"]$/g, ''));
	const args = words.slice(1).filter((w) => !w.startsWith('-') && /[./]/.test(w));
	if (/^(rm|mv|cp|tee|truncate|ln|touch|mkdir|rmdir)$/.test(words[0] ?? '')) {
		targets.push(...args);
	} else if (/^(sed|perl)$/.test(words[0] ?? '') && words.some((w) => /^-i/.test(w))) {
		// In-place editors: only existing files are targets (skips the script expression).
		targets.push(...args.filter((w) => existsSync(path.resolve(input.cwd ?? repoRoot, w))));
	}
}

for (const target of targets) {
	const cleaned = target.replace(/^['"]|['"]$/g, '');
	if (cleaned.startsWith('/dev/') || /(^|\/)(dist|node_modules|target|reports|coverage|\.turbo)(\/|$)/.test(cleaned)) {
		continue;
	}
	const violation = writeViolation(toRepoPath(cleaned, input.cwd));
	if (violation) {
		block(`Blocked: this command writes to a protected path. ${violation} ${boundaryHint}`);
	}
}
