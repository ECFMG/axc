import type { Domain } from '@axc/domain';
import type { DataSources } from '@axc/persistence';
import { describe, expect, it, vi } from 'vitest';
import { buildApplicationServicesFactory } from '../../../index.ts';

describe('catalog application service', () => {
	it('uses the injected read repository and forwards the query and response', async () => {
		const query: Domain.Contexts.Catalog.Course.CourseSearchQuery = { q: 'security', modality: 'online', status: 'active', tag: 'ai', page: 2, pageSize: 5, sort: 'updatedAt' };
		const result = { items: [], page: 2, pageSize: 5, totalItems: 0, totalPages: 0 };
		const search = vi.fn().mockResolvedValue(result);
		const dataSources: DataSources = { readonlyDataSource: { Catalog: { Course: { CourseReadRepo: { search } } } } };
		const withSystemPassport = vi.fn(() => dataSources);
		const services = await buildApplicationServicesFactory({ environment: 'test', dataSourcesFactory: { withSystemPassport } }).forRequest();
		expect(await services.Catalog.Course.queryCourses(query)).toBe(result);
		expect(withSystemPassport).toHaveBeenCalledOnce();
		expect(search).toHaveBeenCalledExactlyOnceWith(query);
	});
});
