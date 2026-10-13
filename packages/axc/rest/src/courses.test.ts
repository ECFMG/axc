import { buildApplicationServicesFactory } from '@axc/application-services';
import { describe, expect, it } from 'vitest';
import { createRestApp } from './index.ts';

const app = createRestApp(buildApplicationServicesFactory({ environment: 'test' }));

describe('GET /api/courses', () => {
	it('keeps the healthcheck available', async () => {
		const response = await app.request('/health');
		expect(response.status).toBe(200);
	});

	it('returns a paginated catalog', async () => {
		const body = await getCourses('/api/courses');

		expect(body.status).toBe(200);
		expect(body.page).toMatchObject({ page: 1, pageSize: 10, totalItems: 13, totalPages: 2 });
		expect(body.page.items).toHaveLength(10);
		expect(body.page.items[0]?.id).toBe('course-002');
	});

	it('applies keyword, modality, and status filters', async () => {
		const body = await getCourses('/api/courses?q=SECURITY&modality=online&status=active');

		expect(body.status).toBe(200);
		expect(body.page.items.map((item) => item.id)).toEqual(['course-001', 'course-004']);
	});

	it('sorts by createdAt', async () => {
		const body = await getCourses('/api/courses?sort=createdAt');

		expect(body.status).toBe(200);
		expect(body.page.items[0]?.id).toBe('course-010');
	});

	it('returns an empty page when nothing matches', async () => {
		const body = await getCourses('/api/courses?q=zzzz-not-a-course');

		expect(body.status).toBe(200);
		expect(body.page).toMatchObject({ items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 0 });
	});

	it('returns 400 for invalid query parameters', async () => {
		const response = await app.request('/api/courses?pageSize=51&modality=classroom');
		const errorBody: unknown = await response.json();

		expect(response.status).toBe(400);
		expect(errorBody).toEqual({
			error: {
				code: 'INVALID_QUERY_PARAMETER',
				message: 'One or more query parameters are invalid.',
				details: [
					{ field: 'modality', message: 'modality must be one of online, in-person, hybrid.' },
					{ field: 'pageSize', message: 'pageSize must be between 1 and 50.' },
				],
			},
		});
	});
});

interface CoursePageBody {
	items: Array<{ id: string }>;
	page: number;
	pageSize: number;
	totalItems: number;
	totalPages: number;
}

async function getCourses(path: string): Promise<{ status: number; page: CoursePageBody }> {
	const response = await app.request(path);
	const page = (await response.json()) as CoursePageBody;
	return { status: response.status, page };
}
