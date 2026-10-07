import { describe, expect, it } from 'vitest';
import { checkAxcPersistenceFactoryExports, checkAxcPersistenceForbiddenImports, checkAxcPersistenceStructure } from '../checks/persistence-conventions.ts';

export interface PersistenceConventionTestsConfig {
	persistenceDomainGlob: string;
	persistenceReadonlyGlob: string;
	persistenceAllGlob: string;
}

export function describePersistenceConventionTests(config: PersistenceConventionTestsConfig): void {
	describe('AXC Persistence Conventions', () => {
		it('persistence implementation files must live under src/datasources or src/models', () => {
			expect(
				checkAxcPersistenceStructure({
					persistenceAllGlob: config.persistenceAllGlob,
				}),
			).toStrictEqual([]);
		}, 30000);

		it('entity indexes must export the expected persistence factories', () => {
			expect(
				checkAxcPersistenceFactoryExports({
					persistenceDomainGlob: config.persistenceDomainGlob,
					persistenceReadonlyGlob: config.persistenceReadonlyGlob,
				}),
			).toStrictEqual([]);
		}, 30000);

		it('persistence must not import application-services or rest', () => {
			expect(
				checkAxcPersistenceForbiddenImports({
					persistenceAllGlob: config.persistenceAllGlob,
				}),
			).toStrictEqual([]);
		}, 30000);
	});
}
