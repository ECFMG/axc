import { buildApplicationServicesFactory } from '@axc/application-services';
import { describe, expect, it } from 'vitest';
import { createRestApp } from './index.ts';

const app = createRestApp(buildApplicationServicesFactory({ environment: 'test' }));

async function getJson(path: string): Promise<{ status: number; body: unknown }> {
	const response = await app.request(path);
	return { status: response.status, body: await response.json() };
}

describe('GET /api/courses', () => {
	it('returns the documented course for the example query', async () => {
		const response = await getJson('/api/courses?q=security&modality=online&status=active&tag=ai&page=1&pageSize=5&sort=title');

		expect(response.status).toBe(200);
		expect(response.body).toEqual({
			items: [
				{
					id: 'course-001',
					title: 'AI Security Foundations',
					summary: 'Introductory course on secure AI-assisted development.',
					modality: 'online',
					status: 'active',
					tags: ['ai', 'security'],
					createdAt: '2026-01-15T00:00:00.000Z',
					updatedAt: '2026-06-01T00:00:00.000Z',
				},
			],
			page: 1,
			pageSize: 5,
			totalItems: 1,
			totalPages: 1,
		});
	});

	it('uses default pagination when query parameters are omitted', async () => {
		const response = await getJson('/api/courses');

		expect(response.status).toBe(200);
		expect(response.body).toMatchObject({
			page: 1,
			pageSize: 10,
			totalItems: 12,
			totalPages: 2,
		});
		expect((response.body as { items: unknown[] }).items).toHaveLength(10);
	});

	it('returns an empty list when no course matches', async () => {
		const response = await getJson('/api/courses?q=zzzz-not-a-course');

		expect(response.status).toBe(200);
		expect(response.body).toEqual({
			items: [],
			page: 1,
			pageSize: 10,
			totalItems: 0,
			totalPages: 0,
		});
	});

	it('returns 400 for an invalid pageSize', async () => {
		const response = await getJson('/api/courses?pageSize=51');

		expect(response.status).toBe(400);
		expect(response.body).toEqual({
			error: {
				code: 'INVALID_QUERY_PARAMETER',
				message: 'One or more query parameters are invalid.',
				details: [{ field: 'pageSize', message: 'pageSize must be between 1 and 50.' }],
			},
		});
	});

	it('returns 400 when a query parameter is repeated', async () => {
		const response = await getJson('/api/courses?page=1&page=2');

		expect(response.status).toBe(400);
		expect(response.body).toEqual({
			error: {
				code: 'INVALID_QUERY_PARAMETER',
				message: 'One or more query parameters are invalid.',
				details: [{ field: 'page', message: 'page must be provided at most once.' }],
			},
		});
	});

	it('returns 400 for an unsupported query parameter', async () => {
		const response = await getJson('/api/courses?foo=bar');

		expect(response.status).toBe(400);
		expect(response.body).toEqual({
			error: {
				code: 'INVALID_QUERY_PARAMETER',
				message: 'One or more query parameters are invalid.',
				details: [{ field: 'foo', message: 'foo is not a supported query parameter.' }],
			},
		});
	});
});

describe('GET /health', () => {
	it('still returns the health contract', async () => {
		const response = await getJson('/health');

		expect(response.status).toBe(200);
		expect(response.body).toMatchObject({
			status: 'ok',
			service: 'agentCourses-api',
			projectCode: 'axc',
			environment: 'test',
		});
	});
});
