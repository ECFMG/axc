import { describeApplicationServicesConventionTests } from '@cellix/archunit-tests/application-services';
import { describeDataSourcesMongooseModelsConventionTests } from '@cellix/archunit-tests/data-sources-mongoose-models';
import { describeDomainConventionTests } from '@cellix/archunit-tests/domain';
import { checkMemberOrdering } from '@cellix/archunit-tests/general';
import { describePersistenceConventionTests } from '@cellix/archunit-tests/persistence';
import { projectFiles } from 'archunit';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { packageDirectory } from './support/workspace.ts';

// The Cellix convention suites resolve files through the tsconfig.json found from the current
// directory, so each layer's suite runs from inside that layer package. Globs are relative to it.

function fromPackage(relativeDir: string, register: () => void): void {
	describe(relativeDir, () => {
		const previous = process.cwd();
		beforeAll(() => {
			process.chdir(packageDirectory(relativeDir));
		});
		afterAll(() => {
			process.chdir(previous);
		});
		register();
	});
}

for (const relativeDir of ['apps/api', 'packages/axc/domain', 'packages/axc/persistence', 'packages/axc/service-mongoose', 'packages/axc/application-services', 'packages/axc/rest']) {
	fromPackage(relativeDir, () => {
		it('has no import cycles', async () => {
			expect(await projectFiles().inFolder('src/**').should().haveNoCycles().check()).toStrictEqual([]);
		});
	});
}

fromPackage('packages/axc/domain', () => {
	describeDomainConventionTests({ domainContextsGlob: 'src/domain/contexts/**' });

	it('domain classes follow the Cellix member ordering', async () => {
		expect(await checkMemberOrdering({ sourceGlobs: ['src/**'] })).toStrictEqual([]);
	});
});

fromPackage('packages/axc/persistence', () => {
	describePersistenceConventionTests({
		persistenceDomainGlob: 'src/datasources/domain/**',
		persistenceReadonlyGlob: 'src/datasources/readonly/**',
		persistenceAllGlob: 'src/**',
	});

	it('persistence classes follow the Cellix member ordering', async () => {
		expect(await checkMemberOrdering({ sourceGlobs: ['src/**'] })).toStrictEqual([]);
	});
});

fromPackage('packages/axc/service-mongoose', () => {
	describeDataSourcesMongooseModelsConventionTests({ modelsGlob: 'src/models/**', allGlob: 'src/**' });
});

fromPackage('packages/axc/application-services', () => {
	describeApplicationServicesConventionTests({ applicationServicesGlob: 'src/contexts/**', applicationServicesAllGlob: 'src/**' });
});
