import type { ApplicationServicesFactory } from '@axc/application-services';
import { describe, expect, it, vi } from 'vitest';
import { createRestApp } from '../../../index.ts';

function setup() {
	const result = { items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 0 };
	const queryCourses = vi.fn().mockResolvedValue(result);
	const forRequest = vi.fn().mockResolvedValue({ Catalog: { Course: { queryCourses } } });
	const factory: ApplicationServicesFactory = { forRequest };
	return { app: createRestApp(factory), result, queryCourses, forRequest };
}
describe('GET /api/courses', () => {
	it('maps the result to a JSON 200 response with default criteria', async () => {
		const { app, result, queryCourses, forRequest } = setup();
		const response = await app.request('/api/courses');
		expect(response.status).toBe(200);
		expect(response.headers.get('content-type')).toContain('application/json');
		expect(await response.json()).toEqual(result);
		expect(queryCourses).toHaveBeenCalledExactlyOnceWith({ page: 1, pageSize: 10, sort: 'title' });
		expect(forRequest).toHaveBeenCalledExactlyOnceWith();
	});
	it('passes all typed criteria and the authorization header', async () => {
		const { app, queryCourses, forRequest } = setup();
		await app.request('/api/courses?q=security&modality=online&status=active&tag=AI&page=2&pageSize=5&sort=createdAt', { headers: { Authorization: 'sample' } });
		expect(queryCourses).toHaveBeenCalledExactlyOnceWith({ q: 'security', modality: 'online', status: 'active', tag: 'AI', page: 2, pageSize: 5, sort: 'createdAt' });
		expect(forRequest).toHaveBeenCalledExactlyOnceWith('sample');
	});
	it.each(['modality=remote', 'status=unknown', 'page=0', 'pageSize=51', 'sort=id', 'q=a&q=b', 'unknown=1'])('returns the consistent 400 contract for %s', async (query) => {
		const { app, queryCourses, forRequest } = setup();
		const response = await app.request(`/api/courses?${query}`);
		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({
			error: { code: 'INVALID_QUERY_PARAMETER', message: 'One or more query parameters are invalid.', details: expect.arrayContaining([{ field: query.split('=')[0], message: expect.any(String) }]) },
		});
		expect(queryCourses).not.toHaveBeenCalled();
		expect(forRequest).not.toHaveBeenCalled();
	});
});
