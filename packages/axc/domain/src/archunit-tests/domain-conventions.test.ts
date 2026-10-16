import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { type DomainConventionTestsConfig, describeDomainConventionTests } from '@cellix/archunit-tests/domain';
import { describe, expect, it } from 'vitest';

// Shared CellixJS domain conventions (aggregate/repository/uow/visa file shapes).
const config: DomainConventionTestsConfig = {
	domainContextsGlob: 'src/domain/contexts/**',
};

describeDomainConventionTests(config);

// AXC-specific checks. The shared suite recognises the `DomainSeedwork.X`
// namespace style only; this package imports seedwork subpaths, so the same
// rules are restated against the imported class names.
const contextsDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../domain/contexts');

describe('axc domain conventions', () => {
	it('classes extending AggregateRoot live in *.aggregate.ts files', async () => {
		const violations: string[] = [];
		for (const file of await listSources(contextsDir)) {
			if (/extends\s+(?:DomainSeedwork\.)?AggregateRoot\b/.test(file.content) && !file.path.endsWith('.aggregate.ts')) {
				violations.push(file.relative);
			}
		}
		expect(violations, 'aggregate roots must use the .aggregate.ts suffix').toEqual([]);
	});

	it('every aggregate exposes its contracts in sibling files', async () => {
		const violations: string[] = [];
		for (const file of await listSources(contextsDir)) {
			if (!file.path.endsWith('.aggregate.ts')) {
				continue;
			}
			const base = file.path.slice(0, -'.aggregate.ts'.length);
			const siblings = await readdir(path.dirname(file.path));
			for (const suffix of ['.repository.ts', '.uow.ts']) {
				if (!siblings.includes(path.basename(`${base}${suffix}`))) {
					violations.push(`${file.relative} is missing ${path.basename(base)}${suffix}`);
				}
			}
		}
		expect(violations).toEqual([]);
	});

	it('aggregates with behaviour have a feature file next to them', async () => {
		const violations: string[] = [];
		for (const file of await listSources(contextsDir)) {
			if (!file.path.endsWith('.aggregate.ts')) {
				continue;
			}
			const features = await readdir(path.join(path.dirname(file.path), 'features')).catch(() => []);
			if (!features.some((name) => name.endsWith('.feature'))) {
				violations.push(file.relative);
			}
		}
		expect(violations, 'each aggregate needs features/*.feature describing its rules').toEqual([]);
	});

	it('domain files do not import infrastructure or delivery packages', async () => {
		const forbidden = ['mongoose', 'mongodb', 'hono', '@azure/', '@axc/persistence', '@axc/rest', '@axc/service-mongoose', '@axc/application-services', 'node:fs', 'node:http'];
		const violations: string[] = [];
		for (const file of await listSources(path.resolve(contextsDir, '..'))) {
			for (const specifier of importSpecifiers(file.content)) {
				if (forbidden.some((prefix) => specifier === prefix || specifier.startsWith(`${prefix}/`) || specifier.startsWith(prefix))) {
					violations.push(`${file.relative} imports ${specifier}`);
				}
			}
		}
		expect(violations).toEqual([]);
	});
});

interface Source {
	path: string;
	relative: string;
	content: string;
}

async function listSources(root: string): Promise<Source[]> {
	const result: Source[] = [];
	const entries = await readdir(root, { withFileTypes: true }).catch(() => []);
	for (const entry of entries) {
		const entryPath = path.join(root, entry.name);
		if (entry.isDirectory()) {
			result.push(...(await listSources(entryPath)));
		} else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')) {
			result.push({ path: entryPath, relative: path.relative(root, entryPath), content: await readFile(entryPath, 'utf8') });
		}
	}
	return result;
}

const importSpecifiers = (content: string): string[] => [...content.matchAll(/from\s*['"]([^'"]+)['"]/g)].map((match) => match[1] as string);
