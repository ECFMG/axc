import { buildApplicationServicesFactory } from '@axc/application-services';
import { describe, expect, it, vi } from 'vitest';
import { createRestApp } from '../../../index.ts';

function setup() {
	const result = { items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 0 };
	const search = vi.fn().mockResolvedValue(result);
	const factory = buildApplicationServicesFactory({ environment: 'test', dataSourcesFactory: { create: () => ({ readonlyDataSource: { Catalog: { Course: { CourseReadRepo: { search } } } } }) } });
	const forRequest = vi.spyOn(factory, 'forRequest');
	return { app: createRestApp(factory), search, forRequest, result };
}
describe('GET /api/courses', () => {
	it('returns the query result as JSON with default criteria', async () => {
		const { app, search, result } = setup();
		const response = await app.request('/api/courses');
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual(result);
		expect(search).toHaveBeenCalledExactlyOnceWith({ page: 1, pageSize: 10, sort: 'title' });
	});
	it('passes parsed filters and the request authorization header', async () => {
		const { app, search, forRequest } = setup();
		const response = await app.request('/api/courses?q=Security&modality=online&status=active&tag=AI&page=2&pageSize=5&sort=updatedAt', { headers: { Authorization: 'test-value' } });
		expect(response.status).toBe(200);
		expect(forRequest).toHaveBeenCalledWith('test-value');
		expect(search).toHaveBeenCalledWith({ q: 'Security', modality: 'online', status: 'active', tag: 'AI', page: 2, pageSize: 5, sort: 'updatedAt' });
	});
	it.each(['modality=remote', 'status=deleted', 'page=0', 'pageSize=51', 'sort=unknown', 'page=1&page=2', 'unknown=x'])('rejects %s before calling services', async (query) => {
		const { app, search, forRequest } = setup();
		const response = await app.request(`/api/courses?${query}`);
		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({ error: { code: 'INVALID_QUERY_PARAMETER', message: 'One or more query parameters are invalid.', details: [{ field: query.split('=')[0], message: expect.any(String) }] } });
		expect(search).not.toHaveBeenCalled();
		expect(forRequest).not.toHaveBeenCalled();
	});
});
