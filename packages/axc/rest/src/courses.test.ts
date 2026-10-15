import { buildApplicationServicesFactory } from '@axc/application-services';
import { describe, expect, it, vi } from 'vitest';
import { parseCourseQuery } from './courses.ts';
import { createRestApp } from './index.ts';

const app = createRestApp(buildApplicationServicesFactory({ environment: 'test' }, { getAll: () => Promise.resolve([]) }));
const parse = (query: string) => parseCourseQuery(new URLSearchParams(query));

describe('course query validation', () => {
	it.each(['', 'q=&tag=%20&modality=%20&status=&sort=%20&page=&pageSize=%20'])('defaults absent or blank inputs: %s', (query) => {
		expect(parse(query)).toEqual({ success: true, input: { page: 1, pageSize: 10, sort: 'title' } });
	});
	it('trims keyword and tag', () => {
		expect(parse('q=%20AI%20&tag=%20SECURITY%20')).toMatchObject({ success: true, input: { q: 'AI', tag: 'SECURITY' } });
	});
	it.each(['online', 'in-person', 'hybrid'])('accepts modality %s', (modality) => expect(parse(`modality=${modality}`)).toMatchObject({ success: true, input: { modality } }));
	it.each(['draft', 'active', 'retired'])('accepts status %s', (status) => expect(parse(`status=${status}`)).toMatchObject({ success: true, input: { status } }));
	it.each(['title', 'createdAt', 'updatedAt'])('accepts sort %s', (sort) => expect(parse(`sort=${sort}`)).toMatchObject({ success: true, input: { sort } }));
	it.each(['page=1', 'page=9007199254740991', 'pageSize=1', 'pageSize=50'])('accepts numeric boundary %s', (query) => expect(parse(query)).toMatchObject({ success: true }));
	it.each([
		'modality=remote',
		'modality=ONLINE',
		'modality=%20online',
		'status=archived',
		'status=Active',
		'sort=-title',
		'sort=TITLE',
		...['0', '-1', '1.5', '1e2', '2x', '%201', '1%20', '%2B1', '01', '9007199254740992', 'Infinity', 'NaN'].flatMap((value) => [`page=${value}`, `pageSize=${value}`]),
		'pageSize=51',
		'pageSize=9007199254740991',
		'unknown=x',
		'q=a&q=b',
		'page=1&page=2',
	])('returns a consistent 400 for %s', async (query) => {
		const response = await app.request(`/api/courses?${query}`);
		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({
			error: { code: 'INVALID_QUERY_PARAMETER', message: 'One or more query parameters are invalid.', details: expect.arrayContaining([{ field: expect.any(String), message: expect.any(String) }]) },
		});
	});
	it('collects independent validation errors', () => {
		expect(parse('modality=bad&status=bad&page=0&pageSize=51&sort=bad')).toMatchObject({ success: false, details: [{ field: 'modality' }, { field: 'status' }, { field: 'sort' }, { field: 'page' }, { field: 'pageSize' }] });
	});
	it('uses the documented pageSize error', async () => {
		const response = await app.request('/api/courses?pageSize=51');
		expect(await response.json()).toMatchObject({ error: { details: [{ field: 'pageSize', message: 'pageSize must be between 1 and 50.' }] } });
	});
	it('maps empty search results to 200 and pagination metadata', async () => {
		const response = await app.request('/api/courses?page=2&pageSize=5');
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ items: [], page: 2, pageSize: 5, totalItems: 0, totalPages: 0 });
	});
	it('passes typed queries and the authorization header to request services', async () => {
		const search = vi.fn().mockResolvedValue({ items: [], page: 1, pageSize: 5, totalItems: 0, totalPages: 0 });
		const forRequest = vi.fn().mockResolvedValue({ courses: { search } });
		const response = await createRestApp({ forRequest }).request('/api/courses?q=AI&modality=online&status=active&tag=security&pageSize=5&sort=updatedAt', { headers: { Authorization: 'Bearer sample' } });
		expect(response.status).toBe(200);
		expect(forRequest).toHaveBeenCalledWith('Bearer sample');
		expect(search).toHaveBeenCalledWith({ q: 'AI', modality: 'online', status: 'active', tag: 'security', page: 1, pageSize: 5, sort: 'updatedAt' });
	});
	it('does not create services for invalid requests', async () => {
		const forRequest = vi.fn();
		await createRestApp({ forRequest }).request('/api/courses?page=0');
		expect(forRequest).not.toHaveBeenCalled();
	});
});
