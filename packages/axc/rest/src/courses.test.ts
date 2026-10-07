import { buildApplicationServicesFactory } from '@axc/application-services';
import { Course, type CourseCatalog } from '@axc/domain';
import { describe, expect, it } from 'vitest';
import { createRestApp } from './index.ts';

const catalog: CourseCatalog = {
	listCourses: () =>
		Promise.resolve([
			new Course({
				id: 'course-001',
				title: 'AI Security Foundations',
				summary: 'Introductory course on secure AI-assisted development.',
				modality: 'online',
				status: 'active',
				tags: ['ai', 'security'],
				createdAt: '2026-01-15T00:00:00.000Z',
				updatedAt: '2026-06-01T00:00:00.000Z',
			}),
		]),
};

const app = createRestApp(buildApplicationServicesFactory({ environment: 'test' }, catalog));

describe('GET /api/courses', () => {
	it('returns 200 and the course page', async () => {
		const response = await app.request('/api/courses?q=security&modality=online&status=active&tag=ai');

		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual({
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
			pageSize: 10,
			totalItems: 1,
			totalPages: 1,
		});
	});

	it('returns 200 and an empty page when nothing matches', async () => {
		const response = await app.request('/api/courses?q=zzzz-no-such-course');

		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toMatchObject({ items: [], totalItems: 0, totalPages: 0 });
	});

	it('returns 400 for an invalid pageSize', async () => {
		const response = await app.request('/api/courses?pageSize=51');

		expect(response.status).toBe(400);
		await expect(response.json()).resolves.toEqual({
			error: {
				code: 'INVALID_QUERY_PARAMETER',
				message: 'One or more query parameters are invalid.',
				details: [{ field: 'pageSize', message: 'pageSize must be between 1 and 50.' }],
			},
		});
	});
});
