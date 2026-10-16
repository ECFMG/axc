import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { type DataSourcesMongooseModelsConventionTestsConfig, describeDataSourcesMongooseModelsConventionTests } from '@cellix/archunit-tests/data-sources-mongoose-models';
import { describePersistenceConventionTests, type PersistenceConventionTestsConfig } from '@cellix/archunit-tests/persistence';
import { describe, expect, it } from 'vitest';

// Shared CellixJS persistence conventions: write side under datasources/domain
// (repository, domain adapter, unit of work), read side under datasources/readonly.
const persistenceConfig: PersistenceConventionTestsConfig = {
	persistenceDomainGlob: 'src/datasources/domain/**',
	persistenceReadonlyGlob: 'src/datasources/readonly/**',
	persistenceAllGlob: 'src/**',
};

describePersistenceConventionTests(persistenceConfig);

// Mongoose models are kept inside this package (there is no separate
// data-sources-mongoose-models package in AXC), so the shared model
// conventions are pointed at src/models.
const modelsConfig: DataSourcesMongooseModelsConventionTestsConfig = {
	modelsGlob: 'src/models/**',
	allGlob: 'src/models/**',
};

describeDataSourcesMongooseModelsConventionTests(modelsConfig);

const srcDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

describe('axc persistence conventions', () => {
	it('write-side units of work are built on MongooseSeedwork.MongoUnitOfWork', async () => {
		const violations: string[] = [];
		for (const file of await listSources(path.join(srcDir, 'datasources/domain'))) {
			if (file.path.endsWith('.uow.ts') && !/MongoUnitOfWork/.test(file.content)) {
				violations.push(file.relative);
			}
		}
		expect(violations, 'hand-rolled units of work bypass the seedwork transaction and event handling').toEqual([]);
	});

	it('write-side folders contain repository, domain adapter and unit of work for each aggregate', async () => {
		const violations: string[] = [];
		for (const file of await listSources(path.join(srcDir, 'datasources/domain'))) {
			if (!file.path.endsWith('.uow.ts')) {
				continue;
			}
			const base = path.basename(file.path, '.uow.ts');
			const siblings = await readdir(path.dirname(file.path));
			for (const suffix of ['.repository.ts', '.domain-adapter.ts']) {
				if (!siblings.includes(`${base}${suffix}`)) {
					violations.push(`${file.relative} is missing ${base}${suffix}`);
				}
			}
		}
		expect(violations).toEqual([]);
	});

	it('read-side files do not expose write operations', async () => {
		const violations: string[] = [];
		for (const file of await listSources(path.join(srcDir, 'datasources/readonly'))) {
			if (/\.(?:create|insertMany|updateOne|updateMany|findOneAndUpdate|deleteOne|deleteMany|save)\s*\(/.test(file.content)) {
				violations.push(file.relative);
			}
		}
		expect(violations, 'readonly data sources must only query').toEqual([]);
	});

	it('mongoose model files live in models/<context>/ and end with .model.ts', async () => {
		const violations: string[] = [];
		for (const file of await listSources(path.join(srcDir, 'models'))) {
			if (/mongoose/.test(file.content) && /Schema\s*\(/.test(file.content) && !file.path.endsWith('.model.ts')) {
				violations.push(file.relative);
			}
		}
		expect(violations).toEqual([]);
	});

	it('persistence does not import the delivery or application layers', async () => {
		const forbidden = ['hono', '@axc/rest', '@axc/application-services', '@apps/'];
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
