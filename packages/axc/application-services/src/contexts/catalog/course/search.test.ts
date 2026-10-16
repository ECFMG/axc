import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect, vi } from 'vitest';
import { buildApplicationServicesFactory } from '../../../index.ts';

const feature = await loadFeature(new URL('./features/search.feature', import.meta.url).pathname);
describeFeature(feature, ({ Scenario }) => {
	Scenario('Delegates typed criteria to the read repository', ({ Given, When, Then }) => {
		const criteria = { q: 'security', modality: 'online', status: 'active', tag: 'ai', page: 2, pageSize: 5, sort: 'updatedAt' } as const;
		const result = { items: [], page: 2, pageSize: 5, totalItems: 0, totalPages: 0 };
		const search = vi.fn().mockResolvedValue(result);
		let actual: unknown;
		Given('a course read repository', () => {
			/* Dependencies are initialized for this scenario above. */
		});
		When('the application searches the catalog', async () => {
			const factory = buildApplicationServicesFactory({ environment: 'test', dataSources: { readonlyDataSource: { Catalog: { Course: { CourseReadRepository: { search } } } } } });
			const services = await factory.forRequest();
			actual = await services.courses.search(criteria);
		});
		Then('the repository result is returned unchanged', () => {
			expect(search).toHaveBeenCalledExactlyOnceWith(criteria);
			expect(actual).toBe(result);
		});
	});
});
