import { buildApplicationServicesFactory } from '@axc/application-services';
import { describe, expect, it } from 'vitest';
import { createRestApp } from './index.ts';

const course = {
	id: 'course-001',
	title: 'AI Security Foundations',
	summary: 'Introductory course on secure AI-assisted development.',
	modality: 'online' as const,
	status: 'active' as const,
	tags: ['ai', 'security'],
	createdAt: '2026-01-15T00:00:00.000Z',
	updatedAt: '2026-06-01T00:00:00.000Z',
};

const app = createRestApp(buildApplicationServicesFactory({ environment: 'test' }, { list: () => [course] }));

describe('GET /api/courses', () => {
	it('returns the matching page', async () => {
		const response = await app.request('/api/courses?q=security&modality=online&status=active&tag=ai&page=1&pageSize=5&sort=title');

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({
			items: [course],
			page: 1,
			pageSize: 5,
			totalItems: 1,
			totalPages: 1,
		});
	});

	it('returns an empty page when nothing matches', async () => {
		const response = await app.request('/api/courses?q=zzzz-no-such-course');

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({
			items: [],
			page: 1,
			pageSize: 10,
			totalItems: 0,
			totalPages: 0,
		});
	});

	it('returns the invalid query envelope', async () => {
		const response = await app.request('/api/courses?pageSize=51');

		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({
			error: {
				code: 'INVALID_QUERY_PARAMETER',
				message: 'One or more query parameters are invalid.',
				details: [{ field: 'pageSize', message: 'pageSize must be between 1 and 50.' }],
			},
		});
	});
});

describe('GET /health', () => {
	it('still returns the health contract', async () => {
		const response = await app.request('/health');
		const body = (await response.json()) as { status: string; service: string; projectCode: string; environment: string };

		expect(response.status).toBe(200);
		expect(body.status).toBe('ok');
		expect(body.service).toBe('agentCourses-api');
		expect(body.projectCode).toBe('axc');
		expect(body.environment).toBe('test');
	});
});
