import { type ApplicationServicesConventionTestsConfig, describeApplicationServicesConventionTests } from '@cellix/archunit-tests/application-services';

const cellixConfig: ApplicationServicesConventionTestsConfig = {
	applicationServicesGlob: 'src/contexts/**',
	applicationServicesAllGlob: 'src/**',
};

describeApplicationServicesConventionTests(cellixConfig);
