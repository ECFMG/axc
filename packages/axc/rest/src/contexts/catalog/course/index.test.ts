import { buildApplicationServicesFactory } from '@axc/application-services';
import { describe, expect, it, vi } from 'vitest';
import { createRestApp } from '../../../index.ts';

function setup() {
	const getAll = vi.fn().mockResolvedValue([]);
	const factory = buildApplicationServicesFactory({ environment: 'test', dataSources: { readonlyDataSource: { Catalog: { Course: { CourseReadRepo: { getAll } } } } } });
	const forRequest = vi.spyOn(factory, 'forRequest');
	return { app: createRestApp(factory), getAll, forRequest };
}
describe('GET /api/courses', () => {
	it('maps a successful query to the exact response contract', async () => {
		const { app, getAll, forRequest } = setup();
		const response = await app.request('/api/courses');
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 0 });
		expect(getAll).toHaveBeenCalledOnce();
		expect(forRequest).toHaveBeenCalledWith();
	});
	it('passes all validated parameters as typed application input', async () => {
		const { app, forRequest } = setup();
		const services = await forRequest();
		const queryCourses = vi.spyOn(services.Catalog.Course, 'queryCourses');
		forRequest.mockResolvedValue(services);
		const response = await app.request('/api/courses?q=+Security+&tag=AI&modality=hybrid&status=draft&page=2&pageSize=5&sort=updatedAt');
		expect(response.status).toBe(200);
		expect(queryCourses).toHaveBeenCalledWith({ q: 'Security', tag: 'AI', modality: 'hybrid', status: 'draft', page: 2, pageSize: 5, sort: 'updatedAt' });
		expect(await response.json()).toMatchObject({ page: 2, pageSize: 5 });
	});
	it('forwards the authorization header through existing request wiring', async () => {
		const { app, forRequest } = setup();
		await app.request('/api/courses', { headers: { Authorization: 'Bearer test' } });
		expect(forRequest).toHaveBeenCalledWith('Bearer test');
	});
	it('returns the consistent validation error without calling services', async () => {
		const { app, getAll, forRequest } = setup();
		const response = await app.request('/api/courses?pageSize=51');
		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({ error: { code: 'INVALID_QUERY_PARAMETER', message: 'One or more query parameters are invalid.', details: [{ field: 'pageSize', message: 'pageSize must be between 1 and 50.' }] } });
		expect(getAll).not.toHaveBeenCalled();
		expect(forRequest).not.toHaveBeenCalled();
	});
	it('retains the health route', async () => {
		const response = await setup().app.request('/health');
		expect(response.status).toBe(200);
		expect(await response.json()).toMatchObject({ status: 'ok', environment: 'test' });
	});
});
