import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { type ApplicationServicesConventionTestsConfig, describeApplicationServicesConventionTests } from '@cellix/archunit-tests/application-services';
import { describe, expect, it } from 'vitest';

// Shared CellixJS application-service conventions: curried factories taking
// data sources, one ApplicationService interface per aggregate, mutations via
// withScopedTransaction, queries via readonlyDataSource, no mongoose imports.
const config: ApplicationServicesConventionTestsConfig = {
	applicationServicesGlob: 'src/contexts/**',
	applicationServicesAllGlob: 'src/**',
};

describeApplicationServicesConventionTests(config);

const srcDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

describe('axc application-services conventions', () => {
	it('application services do not import delivery, persistence implementations or mongoose', async () => {
		const forbidden = ['hono', '@axc/rest', '@axc/service-mongoose', 'mongoose', 'mongodb', '@apps/'];
		const violations: string[] = [];
		for (const file of await listSources(srcDir)) {
			for (const specifier of importSpecifiers(file.content)) {
				if (forbidden.some((prefix) => specifier.startsWith(prefix))) {
					violations.push(`${file.relative} imports ${specifier}`);
				}
			}
		}
		expect(violations).toEqual([]);
	});

	it('each use case under contexts has a feature file describing it', async () => {
		const violations: string[] = [];
		for (const file of await listSources(path.join(srcDir, 'contexts'))) {
			const name = path.basename(file.path, '.ts');
			if (name === 'index' || file.path.includes('/features/')) {
				continue;
			}
			const features = await readdir(path.join(path.dirname(file.path), 'features')).catch(() => []);
			if (!features.includes(`${name}.feature`)) {
				violations.push(`${file.relative} has no features/${name}.feature`);
			}
		}
		expect(violations, 'application services are specified with a feature file per use case').toEqual([]);
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
			if (entry.name !== 'archunit-tests') {
				result.push(...(await listSources(entryPath)));
			}
		} else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')) {
			result.push({ path: entryPath, relative: path.relative(srcDir, entryPath), content: await readFile(entryPath, 'utf8') });
		}
	}
	return result;
}

const importSpecifiers = (content: string): string[] => [...content.matchAll(/from\s*['"]([^'"]+)['"]/g)].map((match) => match[1] as string);
