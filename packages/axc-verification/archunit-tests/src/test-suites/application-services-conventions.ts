import { describe, expect, it } from 'vitest';
import { checkAxcApplicationServicesFactoryExports, checkAxcApplicationServicesStructure } from '../checks/application-services-conventions.ts';

export interface ApplicationServicesConventionTestsConfig {
	applicationServicesGlob: string;
	applicationServicesAllGlob: string;
}

export function describeApplicationServicesConventionTests(config: ApplicationServicesConventionTestsConfig): void {
	describe('AXC Application Services Conventions', () => {
		it('application-service implementations must live under src/contexts', async () => {
			const violations = await checkAxcApplicationServicesStructure({
				applicationServicesAllGlob: config.applicationServicesAllGlob,
			});

			expect(violations).toStrictEqual([]);
		}, 30000);

		it('entity indexes must export a factory named after the entity folder', async () => {
			const violations = await checkAxcApplicationServicesFactoryExports({
				applicationServicesGlob: config.applicationServicesGlob,
			});

			expect(violations).toStrictEqual([]);
		}, 30000);
	});
}
