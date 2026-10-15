import { buildApplicationServicesFactory } from '@axc/application-services';
import { describe, expect, it, vi } from 'vitest';
import { createRestApp } from './index.ts';

const base = buildApplicationServicesFactory({ environment: 'test' });
const services = await base.forRequest();
const search = vi.fn(services.courses.search);
const forRequest = vi.fn(() => Promise.resolve({ ...services, courses: { search } }));
const app = createRestApp({ forRequest });

describe('GET /api/courses', () => {
	it('applies defaults and returns the JSON contract', async () => {
		const response = await app.request('/api/courses');
		expect(response.status).toBe(200);
		expect(response.headers.get('Content-Type')).toContain('application/json');
		expect(await response.json()).toEqual({ items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 0 });
		expect(search).toHaveBeenLastCalledWith({ page: 1, pageSize: 10, sort: 'title' });
	});
	it('passes typed filters, trims free text and forwards authorization', async () => {
		const response = await app.request('/api/courses?q=%20security%20&modality=online&status=active&tag=%20AI%20&page=2&pageSize=50&sort=updatedAt', { headers: { Authorization: 'sample' } });
		expect(response.status).toBe(200);
		expect(search).toHaveBeenLastCalledWith({ q: 'security', modality: 'online', status: 'active', tag: 'AI', page: 2, pageSize: 50, sort: 'updatedAt' });
		expect(forRequest).toHaveBeenLastCalledWith('sample');
	});
	it('treats empty text filters as absent', async () => {
		expect((await app.request('/api/courses?q=%20&tag=')).status).toBe(200);
		expect(search).toHaveBeenLastCalledWith({ page: 1, pageSize: 10, sort: 'title' });
	});
	it.each([
		['modality', 'remote'],
		['modality', 'Online'],
		['modality', ''],
		['status', 'published'],
		['status', ''],
		['sort', 'id'],
		['sort', ''],
		['page', '0'],
		['page', '-1'],
		['page', '1.5'],
		['page', 'abc'],
		['page', ''],
		['page', '1e2'],
		['page', 'Infinity'],
		['page', '9007199254740992'],
		['pageSize', '0'],
		['pageSize', '51'],
		['pageSize', '-1'],
		['pageSize', '2.5'],
		['pageSize', 'abc'],
		['pageSize', ''],
		['pageSize', '1e1'],
		['unknown', 'value'],
	])('rejects %s=%s before calling services', async (field, value) => {
		const calls = forRequest.mock.calls.length;
		const response = await app.request(`/api/courses?${field}=${encodeURIComponent(value)}`);
		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({ error: { code: 'INVALID_QUERY_PARAMETER', message: 'One or more query parameters are invalid.', details: [{ field, message: expect.any(String) }] } });
		expect(forRequest.mock.calls.length).toBe(calls);
	});
	it.each(['q', 'modality', 'status', 'tag', 'page', 'pageSize', 'sort'])('rejects repeated %s parameters', async (field) => {
		const response = await app.request(`/api/courses?${field}=a&${field}=b`);
		expect(response.status).toBe(400);
		expect(await response.json()).toMatchObject({ error: { details: expect.arrayContaining([{ field, message: 'Query parameter must appear only once.' }]) } });
	});
	it('reports multiple invalid fields consistently', async () => {
		const response = await app.request('/api/courses?page=0&pageSize=51');
		expect(await response.json()).toEqual({
			error: {
				code: 'INVALID_QUERY_PARAMETER',
				message: 'One or more query parameters are invalid.',
				details: [
					{ field: 'page', message: 'page must be between 1 and 9007199254740991.' },
					{ field: 'pageSize', message: 'pageSize must be between 1 and 50.' },
				],
			},
		});
	});
	it('allows other enum values and the smallest page size', async () => {
		expect((await app.request('/api/courses?modality=in-person&status=retired&pageSize=1&sort=createdAt')).status).toBe(200);
		expect((await app.request('/api/courses?modality=hybrid&status=draft')).status).toBe(200);
	});
});
