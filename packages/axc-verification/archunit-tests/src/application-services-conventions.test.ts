import { type ApplicationServicesConventionTestsConfig, describeApplicationServicesConventionTests } from '@cellix/archunit-tests/application-services';

const config: ApplicationServicesConventionTestsConfig = {
	applicationServicesGlob: '../../axc/application-services/src/contexts/**',
	applicationServicesAllGlob: '../../axc/application-services/src/**',
};

describeApplicationServicesConventionTests(config);
