import { type PersistenceConventionTestsConfig as AxcPersistenceConventionTestsConfig, describePersistenceConventionTests as describeAxcPersistenceConventionTests } from '@axc-verification/archunit-tests/persistence';
import { describePersistenceConventionTests, type PersistenceConventionTestsConfig } from '@cellix/archunit-tests/persistence';

const cellixConfig: PersistenceConventionTestsConfig = {
	persistenceDomainGlob: '**/src/datasources/domain/**',
	persistenceReadonlyGlob: '**/src/datasources/readonly/**',
	persistenceAllGlob: '**/src/**',
};

const axcConfig: AxcPersistenceConventionTestsConfig = {
	persistenceDomainGlob: 'src/datasources/domain/**',
	persistenceReadonlyGlob: 'src/datasources/readonly/**',
	persistenceAllGlob: 'src/**',
};

describePersistenceConventionTests(cellixConfig);
describeAxcPersistenceConventionTests(axcConfig);
