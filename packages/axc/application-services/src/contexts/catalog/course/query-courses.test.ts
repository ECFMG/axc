import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import type { Domain } from '@axc/domain';
import type { DataSources } from '@axc/persistence';
import { expect, vi } from 'vitest';
import * as operations from './query-courses.ts';

const feature = await loadFeature(new URL('./features/query-courses.feature', import.meta.url).pathname);
const search = vi.fn<(criteria: Domain.Contexts.Catalog.Course.CourseSearchCriteria) => Promise<Domain.Contexts.Catalog.Course.CourseSearchResult>>();
const dataSources: DataSources = { readonlyDataSource: { Catalog: { Course: { CourseReadRepo: { search } } } } };
describeFeature(feature, ({ Scenario }) => {
	Scenario('Query and page repository results', ({ Then }) => {
		Then('criteria are forwarded and totals are calculated', async () => {
			const query = operations.queryCourses(dataSources);
			for (const totalItems of [0, 1, 5, 6, 12]) {
				const criteria: Domain.Contexts.Catalog.Course.CourseSearchCriteria = { q: 'security', modality: 'online', status: 'active', tag: 'ai', page: 2, pageSize: 5, sort: 'updatedAt' };
				const items: Domain.Contexts.Catalog.Course.CourseEntityReference[] = [];
				search.mockResolvedValueOnce({ items, totalItems });
				expect(await query(criteria)).toEqual({ items, totalItems, page: 2, pageSize: 5, totalPages: Math.ceil(totalItems / 5) });
				expect(search).toHaveBeenLastCalledWith(criteria);
			}
		});
	});
	Scenario('Repository failures', ({ Then }) => {
		Then('repository failures propagate to delivery', async () => {
			search.mockRejectedValueOnce(new Error('database unavailable'));
			await expect(operations.queryCourses(dataSources)({ page: 1, pageSize: 10, sort: 'title' })).rejects.toThrow('database unavailable');
		});
	});
});
