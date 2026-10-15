import { type DomainConventionTestsConfig, describeDomainConventionTests } from '@cellix/archunit-tests/domain';

const cellixConfig: DomainConventionTestsConfig = {
	domainContextsGlob: 'src/domain/contexts/**',
};

describeDomainConventionTests(cellixConfig);
