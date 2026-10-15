import type { ApplicationServicesFactory } from '@axc/application-services';
import { describe, expect, it, vi } from 'vitest';
import { createRestApp } from './index.ts';

function setup() {
	const search = vi.fn().mockResolvedValue({ items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 0 });
	const forRequest = vi.fn<ApplicationServicesFactory['forRequest']>().mockResolvedValue({ courses: { search }, health: { getStatus: vi.fn() } });
	return { app: createRestApp({ forRequest }), search, forRequest };
}

describe('GET /api/courses', () => {
	it('passes defaults to the service and maps the result to JSON', async () => {
		const { app, search, forRequest } = setup();
		const response = await app.request('/api/courses');
		expect(response.status).toBe(200);
		expect(response.headers.get('content-type')).toContain('application/json');
		expect(await response.json()).toEqual({ items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 0 });
		expect(search).toHaveBeenCalledWith({ page: 1, pageSize: 10, sort: 'title' });
		expect(forRequest).toHaveBeenCalledWith();
	});
	it('parses all supplied values and forwards authorization', async () => {
		const { app, search, forRequest } = setup();
		expect((await app.request('/api/courses?q=%20Security%20&modality=hybrid&status=draft&tag=AI&page=2&pageSize=50&sort=updatedAt', { headers: { Authorization: 'Bearer sample' } })).status).toBe(200);
		expect(search).toHaveBeenCalledWith({ q: 'Security', modality: 'hybrid', status: 'draft', tag: 'AI', page: 2, pageSize: 50, sort: 'updatedAt' });
		expect(forRequest).toHaveBeenCalledWith('Bearer sample');
	});
	it.each([
		['modality=remote', 'modality'],
		['modality=', 'modality'],
		['status=published', 'status'],
		['status=Active', 'status'],
		['sort=-title', 'sort'],
		['sort=', 'sort'],
		['page=0', 'page'],
		['page=-1', 'page'],
		['page=1.5', 'page'],
		['page=abc', 'page'],
		['page=', 'page'],
		['page=1e2', 'page'],
		['page=9007199254740992', 'page'],
		['pageSize=0', 'pageSize'],
		['pageSize=51', 'pageSize'],
		['pageSize=-1', 'pageSize'],
		['pageSize=2.5', 'pageSize'],
		['pageSize=NaN', 'pageSize'],
		['pageSize=', 'pageSize'],
		['q=%20', 'q'],
		['tag=', 'tag'],
		['unknown=x', 'unknown'],
		['page=1&page=2', 'page'],
		['q=a&q=b', 'q'],
	])('rejects %s consistently before accessing services', async (query, field) => {
		const { app, forRequest } = setup();
		const response = await app.request(`/api/courses?${query}`);
		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({ error: { code: 'INVALID_QUERY_PARAMETER', message: 'One or more query parameters are invalid.', details: expect.arrayContaining([{ field, message: expect.any(String) }]) } });
		expect(forRequest).not.toHaveBeenCalled();
	});
	it('reports all invalid fields with the documented pageSize message', async () => {
		const { app } = setup();
		const response = await app.request('/api/courses?page=0&pageSize=51');
		expect(await response.json()).toEqual({
			error: {
				code: 'INVALID_QUERY_PARAMETER',
				message: 'One or more query parameters are invalid.',
				details: [
					{ field: 'page', message: 'page must be a positive safe integer.' },
					{ field: 'pageSize', message: 'pageSize must be between 1 and 50.' },
				],
			},
		});
	});
});
