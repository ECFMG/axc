import { COURSE_FIXTURES, type DataSources } from '@axc/persistence';
import { describe, expect, it, vi } from 'vitest';
import { buildApplicationServicesFactory } from '../../../index.ts';
import { queryCourses } from './query-courses.ts';

const criteria = { q: 'security', modality: 'online', status: 'active', tag: 'ai', page: 2, pageSize: 5, sort: 'updatedAt' } as const;
function sources(search: DataSources['readonlyDataSource']['Catalog']['Course']['CourseReadRepo']['search']): DataSources {
	return { readonlyDataSource: { Catalog: { Course: { CourseReadRepo: { search } } } } };
}
describe('query courses', () => {
	it.each([0, 1, 5, 6, 12])('passes typed criteria and shapes pagination for %i matches', async (totalItems) => {
		const items = totalItems === 0 ? [] : COURSE_FIXTURES.slice(0, 1);
		const search = vi.fn().mockResolvedValue({ items, totalItems });
		const dataSources = sources(search);
		const services = await buildApplicationServicesFactory({ environment: 'test', dataSourcesFactory: { create: () => dataSources } }).forRequest();
		expect(await services.Catalog.Course.queryCourses(criteria)).toEqual({ items, totalItems, page: 2, pageSize: 5, totalPages: Math.ceil(totalItems / 5) });
		expect(search).toHaveBeenCalledExactlyOnceWith(criteria);
	});
	it('propagates repository failure', async () => {
		const error = new Error('storage unavailable');
		const search = vi.fn().mockRejectedValue(error);
		await expect(queryCourses(sources(search))(criteria)).rejects.toBe(error);
	});
});
