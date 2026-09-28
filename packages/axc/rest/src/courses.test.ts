import { buildApplicationServicesFactory, type CourseListResult } from '@axc/application-services';
import { describe, expect, it } from 'vitest';
import { createRestApp } from './index.ts';

const app = createRestApp(buildApplicationServicesFactory({ environment: 'test' }));

async function getJson<T>(path: string) {
	const response = await app.request(path);
	return {
		status: response.status,
		body: (await response.json()) as T,
	};
}

describe('GET /api/courses', () => {
	it('returns the default paginated catalog', async () => {
		const { status, body } = await getJson<CourseListResult>('/api/courses');

		expect(status).toBe(200);
		expect(body.page).toBe(1);
		expect(body.pageSize).toBe(10);
		expect(body.items.length).toBeLessThanOrEqual(10);
		expect(body.totalItems).toBeGreaterThanOrEqual(12);
	});

	it('returns HTTP 400 with a consistent error body for invalid parameters', async () => {
		const { status, body } = await getJson<unknown>('/api/courses?pageSize=51&sort=popularity');

		expect(status).toBe(400);
		expect(body).toEqual({
			error: {
				code: 'INVALID_QUERY_PARAMETER',
				message: 'One or more query parameters are invalid.',
				details: [
					{ field: 'sort', message: 'sort must be one of: title, createdAt, updatedAt.' },
					{ field: 'pageSize', message: 'pageSize must be between 1 and 50.' },
				],
			},
		});
	});

	it('returns 200 with empty items when nothing matches', async () => {
		const { status, body } = await getJson<CourseListResult>('/api/courses?q=no-such-course-zzzz');

		expect(status).toBe(200);
		expect(body.items).toEqual([]);
		expect(body.totalItems).toBe(0);
		expect(body.page).toBe(1);
		expect(body.pageSize).toBe(10);
	});
});
