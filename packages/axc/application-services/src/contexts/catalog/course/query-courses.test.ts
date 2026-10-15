import { expect, it, vi } from 'vitest';
import { buildApplicationServicesFactory } from '../../../index.ts';
import { queryCourses } from './query-courses.ts';

it('delegates typed criteria and returns repository metadata unchanged', async () => {
	const criteria = { q: 'security', modality: 'online' as const, status: 'active' as const, tag: 'ai', page: 2, pageSize: 5, sort: 'updatedAt' as const };
	const result = { items: [], page: 2, pageSize: 5, totalItems: 0, totalPages: 0 };
	const search = vi.fn().mockResolvedValue(result);
	const dataSources = { readonlyDataSource: { Catalog: { Course: { CourseReadRepo: { search } } } } };
	expect(await queryCourses(dataSources)(criteria)).toBe(result);
	const services = await buildApplicationServicesFactory({ environment: 'test', dataSources }).forRequest();
	expect(await services.Catalog.Course.queryCourses(criteria)).toBe(result);
	expect(search).toHaveBeenCalledWith(criteria);
});
it('propagates repository failures', async () => {
	const search = vi.fn().mockRejectedValue(new Error('unavailable'));
	await expect(queryCourses({ readonlyDataSource: { Catalog: { Course: { CourseReadRepo: { search } } } } })({ page: 1, pageSize: 10, sort: 'title' })).rejects.toThrow('unavailable');
});
