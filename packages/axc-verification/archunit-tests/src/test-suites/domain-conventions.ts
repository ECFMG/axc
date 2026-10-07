import { describe, expect, it } from 'vitest';
import { checkAxcDomainStructure } from '../checks/domain-conventions.ts';

export interface DomainConventionTestsConfig {
	domainAllGlob: string;
}

export function describeDomainConventionTests(config: DomainConventionTestsConfig): void {
	describe('AXC Domain Conventions', () => {
		it('domain implementation files must live under src/domain', () => {
			expect(
				checkAxcDomainStructure({
					domainAllGlob: config.domainAllGlob,
				}),
			).toStrictEqual([]);
		}, 30000);
	});
}
