// Builds .grok/rules/mog-patterns.md (preloaded by Grok at session start) from the pattern source files, so the
// agent never spends an orientation round reading them. `node scripts/grok-rules.mjs --check` fails when stale.
import { readFileSync, realpathSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const PATTERNS_FILE = '.grok/rules/mog-patterns.md';
export const PATTERNS = ['packages/axc-verification/acceptance-api/src/step-definitions/healthcheck.steps.ts', 'packages/axc-verification/acceptance-api/src/questions.ts', 'packages/axc/application-services/src/health.test.ts'];

export function render(root) {
	const parts = PATTERNS.map((file) => `## \`${file}\`\n\n\`\`\`ts\n${readFileSync(path.join(root, file), 'utf8').trimEnd()}\n\`\`\``);
	return `# mog patterns (generated: scripts/grok-rules.mjs)\n\n${parts.join('\n\n')}\n`;
}

// realpath + file URL: a symlinked or space-containing path must still run main, not no-op.
if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
	const root = path.resolve(import.meta.dirname, '..');
	const want = render(root);
	if (process.argv.includes('--check')) {
		if (readFileSync(path.join(root, PATTERNS_FILE), 'utf8') !== want) {
			console.log(`${PATTERNS_FILE} is stale — run node scripts/grok-rules.mjs`);
			process.exit(1);
		}
	} else writeFileSync(path.join(root, PATTERNS_FILE), want);
}
