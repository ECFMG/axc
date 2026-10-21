import { type DependencyRulesTestsConfig, describeDependencyRulesTests } from '@cellix/archunit-tests/general';

// Cellix dependency-rule suite, kept for parity with CellixJS. Its archunit file graph only sees
// this package's tsconfig and does not follow workspace imports into dist/, so the enforced
// layer boundaries live in axc-layer-rules.test.ts.

const config: DependencyRulesTestsConfig = {
	appsGlob: '../../../apps/**',
	packagesGlob: '../../**',
	domainFolder: '../../axc/domain',
	persistenceFolder: '../../axc/persistence',
	applicationServicesFolder: '../../axc/application-services',
	restFolder: '../../axc/rest',
	infrastructurePattern: '../../axc/service-mongoose/**',
	restInfrastructurePattern: '../../axc/service-mongoose/**',
};

describeDependencyRulesTests(config);
