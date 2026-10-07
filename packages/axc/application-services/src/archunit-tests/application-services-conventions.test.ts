import {
	type ApplicationServicesConventionTestsConfig as AxcApplicationServicesConventionTestsConfig,
	describeApplicationServicesConventionTests as describeAxcApplicationServicesConventionTests,
} from '@axc-verification/archunit-tests/application-services';
import { type ApplicationServicesConventionTestsConfig, describeApplicationServicesConventionTests } from '@cellix/archunit-tests/application-services';

const cellixConfig: ApplicationServicesConventionTestsConfig = {
	applicationServicesGlob: '**/src/contexts/**',
	applicationServicesAllGlob: '**/src/**',
};

const axcConfig: AxcApplicationServicesConventionTestsConfig = {
	applicationServicesGlob: 'src/contexts/**',
	applicationServicesAllGlob: 'src/**',
};

describeApplicationServicesConventionTests(cellixConfig);
describeAxcApplicationServicesConventionTests(axcConfig);
