import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const infra = ['mongoose', 'mongodb', '@cellix/mongoose-seedwork', '@axc/service-mongoose'];

interface ImportRule {
	name: string;
	target: string;
	banned: string[];
	fix: string;
}

const rules: ImportRule[] = [
	{
		name: 'domain imports no delivery, persistence or service code',
		target: 'packages/axc/domain/src',
		banned: ['hono', '@azure/', ...infra, '@axc/rest', '@axc/persistence', '@axc/application-services'],
		fix: 'keep domain pure; depend on it from the outer layers instead',
	},
	{
		name: 'REST imports no persistence or infra',
		target: 'packages/axc/rest/src',
		banned: [...infra, '@axc/persistence'],
		fix: 'call an @axc/application-services function and map its result to HTTP',
	},
	{
		name: 'application-services imports no infra or HTTP',
		target: 'packages/axc/application-services/src',
		banned: [...infra, 'hono', '@axc/rest'],
		fix: 'take data access as an injected dependency; keep HTTP in @axc/rest',
	},
	{
		name: 'apps/api composition root imports no infra, persistence or HTTP directly',
		target: 'apps/api/src/index.ts',
		banned: ['mongoose', 'mongodb', '@cellix/mongoose-seedwork', '@axc/persistence', '@axc/domain', 'hono', '@azure/functions'],
		fix: 'wire services via @axc/application-services and @axc/rest (infra via serviceRegistry), not raw imports',
	},
];

describe('AXC import boundaries', () => {
	for (const rule of rules) {
		it(rule.name, async () => {
			const files = await listTypeScriptFiles(path.join(repoRoot, rule.target));
			expect(files.length, `${rule.target}: rule "${rule.name}" matched 0 files — fix: update the path in axc-import-boundaries.test.ts`).toBeGreaterThan(0);
			const packageRoot = path.join(repoRoot, rule.target.split('/src')[0] ?? rule.target);
			const violations: string[] = [];
			for (const file of files) {
				for (const specifier of importSpecifiers(await readFile(file, 'utf8'))) {
					if (specifier.startsWith('.') && path.relative(packageRoot, path.resolve(path.dirname(file), specifier)).startsWith('..')) {
						violations.push(`${path.relative(repoRoot, file)} imports '${specifier}' — rule: no relative imports outside its package — fix: import the package by name (@axc/...)`);
					}
					const hit = rule.banned.find((ban) => (ban.endsWith('/') ? specifier.startsWith(ban) : specifier === ban || specifier.startsWith(`${ban}/`)));
					if (hit) violations.push(`${path.relative(repoRoot, file)} imports '${specifier}' — rule: ${rule.name} — fix: ${rule.fix}`);
				}
			}
			expect(violations).toStrictEqual([]);
		});
	}
	it('detects static, dynamic and require imports', () => {
		expect(importSpecifiers(`import a from 'x';\nimport 'y';\nconst c = await import("z");\nrequire('w');\nexport { d } from './d.ts';`)).toStrictEqual(['x', 'y', 'z', 'w', './d.ts']);
	});
});

function importSpecifiers(source: string): string[] {
	return [...source.matchAll(/(?:\bfrom|\bimport|\brequire\(|\bimport\()\s*['"]([^'"]+)['"]/g)].map((match) => match[1] ?? '');
}

async function listTypeScriptFiles(target: string): Promise<string[]> {
	if (target.endsWith('.ts')) return [target];
	const entries = await readdir(target, { withFileTypes: true }).catch(() => []);
	const nested = await Promise.all(entries.map((entry) => (entry.isDirectory() ? listTypeScriptFiles(path.join(target, entry.name)) : Promise.resolve(entry.name.endsWith('.ts') ? [path.join(target, entry.name)] : []))));
	return nested.flat();
}
