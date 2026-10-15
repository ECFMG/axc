import { describe, expect, it, vi } from 'vitest';
import { createRestApp } from '../../../index.ts';

describe('GET /api/courses', () => {
	const result = { items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 0 };
	const queryCourses = vi.fn().mockResolvedValue(result);
	const factory = { forRequest: vi.fn().mockResolvedValue({ Catalog: { Course: { queryCourses } } }) };
	const app = createRestApp(factory);
	it('returns the application result as JSON', async () => {
		const response = await app.request('/api/courses');
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual(result);
		expect(queryCourses).toHaveBeenCalledWith({ page: 1, pageSize: 10, sort: 'title' });
	});
	it('forwards authorization through the existing factory', async () => {
		await app.request('/api/courses', { headers: { Authorization: 'Bearer local' } });
		expect(factory.forRequest).toHaveBeenCalledWith('Bearer local');
	});
	it('returns a consistent 400 and all validation errors before invoking services', async () => {
		factory.forRequest.mockClear();
		const response = await app.request('/api/courses?pageSize=51&status=bad');
		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({
			error: {
				code: 'INVALID_QUERY_PARAMETER',
				message: 'One or more query parameters are invalid.',
				details: expect.arrayContaining([
					{ field: 'pageSize', message: 'pageSize must be between 1 and 50.' },
					{ field: 'status', message: expect.any(String) },
				]),
			},
		});
		expect(factory.forRequest).not.toHaveBeenCalled();
	});
});
