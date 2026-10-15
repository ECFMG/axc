import type { DataSources } from '@axc/persistence';
import { describe, expect, it, vi } from 'vitest';
import { buildApplicationServicesFactory } from '../../../index.ts';
import { queryCourses } from './query-courses.ts';

describe('queryCourses', () => {
	it('passes typed criteria unchanged to the repository through the factory', async () => {
		const criteria = { q: 'security', modality: 'online' as const, status: 'active' as const, tag: 'ai', page: 2, pageSize: 5, sort: 'updatedAt' as const };
		const result = { items: [], page: 2, pageSize: 5, totalItems: 0, totalPages: 0 };
		const search = vi.fn().mockResolvedValue(result);
		const dataSources: DataSources = { readonlyDataSource: { Catalog: { Course: { CourseReadRepo: { search } } } } };
		const forRequest = vi.fn(() => dataSources);
		const factory = buildApplicationServicesFactory({ environment: 'test', dataSourcesFactory: { forRequest } });
		const services = await factory.forRequest();
		expect(await services.Catalog.Course.queryCourses(criteria)).toBe(result);
		expect(search).toHaveBeenCalledExactlyOnceWith(criteria);
		expect(forRequest).toHaveBeenCalledOnce();
	});
	it('propagates repository failures', async () => {
		const error = new Error('repository unavailable');
		const dataSources: DataSources = { readonlyDataSource: { Catalog: { Course: { CourseReadRepo: { search: vi.fn().mockRejectedValue(error) } } } } };
		await expect(queryCourses(dataSources)({ page: 1, pageSize: 10, sort: 'title' })).rejects.toBe(error);
	});
});
