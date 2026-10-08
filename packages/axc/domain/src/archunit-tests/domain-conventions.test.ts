import { type DomainConventionTestsConfig as AxcDomainConventionTestsConfig, describeDomainConventionTests as describeAxcDomainConventionTests } from '@axc-verification/archunit-tests/domain';
import { type DomainConventionTestsConfig, describeDomainConventionTests } from '@cellix/archunit-tests/domain';

const cellixConfig: DomainConventionTestsConfig = {
	domainContextsGlob: 'src/domain/contexts/**',
};

const axcConfig: AxcDomainConventionTestsConfig = {
	domainAllGlob: 'src/**',
};

describeDomainConventionTests(cellixConfig);
describeAxcDomainConventionTests(axcConfig);
