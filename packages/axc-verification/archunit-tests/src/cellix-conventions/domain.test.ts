import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { type DomainConventionTestsConfig, describeDomainConventionTests } from '@cellix/archunit-tests/domain';
import { describe, expect, it } from 'vitest';
import { axcPackageDir, runFromPackage } from '../support/package-scope.ts';
import { importedSpecifiers, isProductionSource, listFiles } from '../support/source-files.ts';

const packageDir = axcPackageDir('domain');
const contextsDir = path.join(packageDir, 'src/domain/contexts');

runFromPackage(packageDir);

// Shared CellixJS domain conventions (aggregate/repository/uow/visa file shapes),
// with globs relative to the domain package.
const config: DomainConventionTestsConfig = {
	domainContextsGlob: 'src/domain/contexts/**',
};

describeDomainConventionTests(config);

// AXC-specific checks. The shared suite recognises the `DomainSeedwork.X`
// namespace style only; this package imports seedwork subpaths, so the same
// rules are restated against the imported class names.
describe('axc domain conventions', () => {
	it('classes extending AggregateRoot live in *.aggregate.ts files', async () => {
		const violations: string[] = [];
		for (const file of await listFiles(contextsDir, isProductionSource)) {
			if (/extends\s+(?:DomainSeedwork\.)?AggregateRoot\b/.test(file.content) && !file.path.endsWith('.aggregate.ts')) {
				violations.push(file.relativePath);
			}
		}
		expect(violations, 'aggregate roots must use the .aggregate.ts suffix').toEqual([]);
	});

	it('every aggregate exposes its contracts in sibling files', async () => {
		const violations: string[] = [];
		for (const file of await listFiles(contextsDir, isProductionSource)) {
			if (!file.path.endsWith('.aggregate.ts')) {
				continue;
			}
			const base = file.path.slice(0, -'.aggregate.ts'.length);
			const siblings = await readdir(path.dirname(file.path));
			for (const suffix of ['.repository.ts', '.uow.ts']) {
				if (!siblings.includes(path.basename(`${base}${suffix}`))) {
					violations.push(`${file.relativePath} is missing ${path.basename(base)}${suffix}`);
				}
			}
		}
		expect(violations).toEqual([]);
	});

	it('aggregates with behaviour have a feature file next to them', async () => {
		const violations: string[] = [];
		for (const file of await listFiles(contextsDir, isProductionSource)) {
			if (!file.path.endsWith('.aggregate.ts')) {
				continue;
			}
			const features = await readdir(path.join(path.dirname(file.path), 'features')).catch((): string[] => []);
			if (!features.some((name) => name.endsWith('.feature'))) {
				violations.push(file.relativePath);
			}
		}
		expect(violations, 'each aggregate needs features/*.feature describing its rules').toEqual([]);
	});

	it('domain files do not import infrastructure or delivery packages', async () => {
		const forbidden = ['mongoose', 'mongodb', 'hono', '@azure/', '@axc/persistence', '@axc/rest', '@axc/service-mongoose', '@axc/application-services', 'node:fs', 'node:http'];
		const violations: string[] = [];
		for (const file of await listFiles(path.join(packageDir, 'src'), isProductionSource)) {
			for (const specifier of importedSpecifiers(file.content)) {
				if (forbidden.some((prefix) => specifier === prefix || specifier.startsWith(prefix))) {
					violations.push(`${file.relativePath} imports ${specifier}`);
				}
			}
		}
		expect(violations).toEqual([]);
	});
});
