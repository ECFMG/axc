import { describePersistenceConventionTests, type PersistenceConventionTestsConfig } from '@cellix/archunit-tests/persistence';

const cellixConfig: PersistenceConventionTestsConfig = {
	persistenceDomainGlob: 'src/datasources/domain/**',
	persistenceReadonlyGlob: 'src/datasources/readonly/**',
	persistenceAllGlob: 'src/**',
};

describePersistenceConventionTests(cellixConfig);
