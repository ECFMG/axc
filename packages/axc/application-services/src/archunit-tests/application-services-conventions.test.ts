import {
	type ApplicationServicesConventionTestsConfig as AxcApplicationServicesConventionTestsConfig,
	describeApplicationServicesConventionTests as describeAxcApplicationServicesConventionTests,
} from '@axc-verification/archunit-tests/application-services';
import { type ApplicationServicesConventionTestsConfig, describeApplicationServicesConventionTests } from '@cellix/archunit-tests/application-services';

const cellixConfig: ApplicationServicesConventionTestsConfig = {
	applicationServicesGlob: '../application-services/src/contexts/**',
	applicationServicesAllGlob: '../application-services/src/**',
};

const axcConfig: AxcApplicationServicesConventionTestsConfig = {
	applicationServicesGlob: '../application-services/src/contexts/**',
	applicationServicesAllGlob: '../application-services/src/**',
};

describeApplicationServicesConventionTests(cellixConfig);
describeAxcApplicationServicesConventionTests(axcConfig);
