import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import type { Domain } from '@axc/domain';
import { expect, vi } from 'vitest';
import { search } from './search.ts';

const feature = await loadFeature('./src/contexts/catalog/course/features/search.feature');
describeFeature(feature, ({ Scenario }) => {
	const criteria: Domain.Contexts.Catalog.Course.CourseSearchCriteria = { q: 'security', modality: 'online', status: 'active', tag: 'ai', page: 2, pageSize: 5, sort: 'updatedAt' };
	Scenario('Pass typed criteria to the read repository', ({ When, Then }) => {
		const result = { items: [], page: 2, pageSize: 5, totalItems: 0, totalPages: 0 };
		const repository = { search: vi.fn().mockResolvedValue(result) };
		let actual: unknown;
		When('the catalog is searched with typed criteria', async () => {
			actual = await search({ readonlyDataSource: { Catalog: { Course: repository } } })(criteria);
		});
		Then('the read repository receives the criteria and its result is returned', () => {
			expect(repository.search).toHaveBeenCalledWith(criteria);
			expect(actual).toBe(result);
		});
	});
	Scenario('Propagate repository failure', ({ When, Then }) => {
		const failure = new Error('Storage unavailable');
		let actual: unknown;
		When('the read repository cannot search the catalog', async () => {
			actual = await search({ readonlyDataSource: { Catalog: { Course: { search: vi.fn().mockRejectedValue(failure) } } } })(criteria).catch((error: unknown) => error);
		});
		Then('the application service rejects with that failure', () => {
			expect(actual).toBe(failure);
		});
	});
});
