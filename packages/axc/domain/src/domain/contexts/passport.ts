import type { CatalogVisa } from './catalog/catalog.visa.ts';

export interface Passport {
	catalog: {
		forCourse(entity: unknown): CatalogVisa;
	};
}

export const PassportFactory = {
	forSystem(): Passport {
		return {
			catalog: {
				forCourse: () => ({
					determineIf: (check: (permissions: { canManageCourse: boolean }) => boolean) => check({ canManageCourse: true }),
				}),
			},
		};
	},
};
