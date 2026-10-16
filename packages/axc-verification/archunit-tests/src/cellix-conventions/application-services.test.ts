import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { type ApplicationServicesConventionTestsConfig, describeApplicationServicesConventionTests } from '@cellix/archunit-tests/application-services';
import { describe, expect, it } from 'vitest';
import { axcPackageDir, runFromPackage } from '../support/package-scope.ts';
import { importedSpecifiers, isProductionSource, listFiles } from '../support/source-files.ts';

const packageDir = axcPackageDir('application-services');
const srcDir = path.join(packageDir, 'src');

runFromPackage(packageDir);

// Shared CellixJS application-service conventions: curried factories taking
// data sources, one ApplicationService interface per aggregate, mutations via
// withScopedTransaction, queries via readonlyDataSource, no mongoose imports.
const config: ApplicationServicesConventionTestsConfig = {
	applicationServicesGlob: 'src/contexts/**',
	applicationServicesAllGlob: 'src/**',
};

describeApplicationServicesConventionTests(config);

describe('axc application-services conventions', () => {
	it('application services do not import delivery, persistence implementations or mongoose', async () => {
		const forbidden = ['hono', '@axc/rest', '@axc/service-mongoose', 'mongoose', 'mongodb', '@apps/'];
		const violations: string[] = [];
		for (const file of await listFiles(srcDir, isProductionSource)) {
			for (const specifier of importedSpecifiers(file.content)) {
				if (forbidden.some((prefix) => specifier.startsWith(prefix))) {
					violations.push(`${file.relativePath} imports ${specifier}`);
				}
			}
		}
		expect(violations).toEqual([]);
	});

	it('each use case under contexts has a feature file describing it', async () => {
		const violations: string[] = [];
		for (const file of await listFiles(path.join(srcDir, 'contexts'), isProductionSource)) {
			const name = path.basename(file.path, '.ts');
			if (name === 'index' || file.path.includes('/features/')) {
				continue;
			}
			const features = await readdir(path.join(path.dirname(file.path), 'features')).catch((): string[] => []);
			if (!features.includes(`${name}.feature`)) {
				violations.push(`${file.relativePath} has no features/${name}.feature`);
			}
		}
		expect(violations, 'application services are specified with a feature file per use case').toEqual([]);
	});
});
