import type { ApplicationServicesFactory } from '@axc/application-services';
import { describe, expect, it, vi } from 'vitest';
import { createRestApp } from './index.ts';

function setup() {
	const queryCourses = vi.fn().mockResolvedValue({ items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 0 });
	const forRequest = vi.fn<ApplicationServicesFactory['forRequest']>().mockResolvedValue({ health: { getStatus: vi.fn() }, Catalog: { Course: { queryCourses } } });
	return { app: createRestApp({ forRequest }), queryCourses, forRequest };
}
describe('GET /api/courses', () => {
	it.each(['', '?q=%20&tag=%09&modality=&status=%20&page=&pageSize=&sort='])('applies defaults to omitted or blank inputs %s', async (query) => {
		const { app, queryCourses } = setup();
		const response = await app.request(`/api/courses${query}`);
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 0 });
		expect(queryCourses).toHaveBeenCalledWith({ page: 1, pageSize: 10, sort: 'title' });
	});
	it('parses all inputs and passes authorization to the factory', async () => {
		const { app, queryCourses, forRequest } = setup();
		const response = await app.request('/api/courses?q=Security&modality=online&status=active&tag=AI&page=2&pageSize=5&sort=updatedAt', { headers: { Authorization: 'Bearer sample' } });
		expect(response.status).toBe(200);
		expect(forRequest).toHaveBeenCalledWith('Bearer sample');
		expect(queryCourses).toHaveBeenCalledWith({ q: 'Security', modality: 'online', status: 'active', tag: 'AI', page: 2, pageSize: 5, sort: 'updatedAt' });
	});
	it.each([
		'modality=online',
		'modality=in-person',
		'modality=hybrid',
		'status=draft',
		'status=active',
		'status=retired',
		'sort=title',
		'sort=createdAt',
		'sort=updatedAt',
		'page=1',
		'page=9007199254740991',
		'pageSize=1',
		'pageSize=50',
	])('accepts %s', async (query) => {
		expect((await setup().app.request(`/api/courses?${query}`)).status).toBe(200);
	});
	it.each([
		'modality=remote',
		'modality=Online',
		'status=published',
		'status=ACTIVE',
		'sort=-title',
		'sort=unknown',
		'page=0',
		'page=-1',
		'page=1.5',
		'page=1e2',
		'page=1x',
		'page=%201',
		'page=%2B1',
		'page=9007199254740992',
		'page=Infinity',
		'pageSize=0',
		'pageSize=-1',
		'pageSize=51',
		'pageSize=1.5',
		'pageSize=1e1',
		'pageSize=10x',
		'pageSize=%2010',
		'pageSize=9007199254740992',
	])('rejects %s consistently before service invocation', async (query) => {
		const { app, queryCourses, forRequest } = setup();
		const response = await app.request(`/api/courses?${query}`);
		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({ error: { code: 'INVALID_QUERY_PARAMETER', message: 'One or more query parameters are invalid.', details: [{ field: query.split('=')[0], message: expect.any(String) }] } });
		expect(queryCourses).not.toHaveBeenCalled();
		expect(forRequest).not.toHaveBeenCalled();
	});
	it('ignores unknown names and uses the first repeated value', async () => {
		const { app, queryCourses } = setup();
		expect((await app.request('/api/courses?unknown=value&page=2&page=3')).status).toBe(200);
		expect(queryCourses).toHaveBeenCalledWith({ page: 2, pageSize: 10, sort: 'title' });
	});
	it('collects all invalid field details', async () => {
		const response = await setup().app.request('/api/courses?modality=no&status=no&page=0&pageSize=51&sort=no');
		const body = await response.json();
		expect(body.error.details.map((detail: { field: string }) => detail.field).sort()).toEqual(['modality', 'page', 'pageSize', 'sort', 'status']);
		expect(body.error.details).toContainEqual({ field: 'pageSize', message: 'pageSize must be between 1 and 50.' });
	});
});
