import { buildApplicationServicesFactory } from '@axc/application-services';
import { describe, expect, it } from 'vitest';
import { createRestApp } from './index.ts';

interface CourseListResponse {
	items: Array<{
		id: string;
		title: string;
		summary: string;
		modality: string;
		status: string;
		tags: string[];
		createdAt: string;
		updatedAt: string;
	}>;
	page: number;
	pageSize: number;
	totalItems: number;
	totalPages: number;
}

interface CourseErrorResponse {
	error: {
		code: string;
		message: string;
		details: Array<{ field: string; message: string }>;
	};
}

function app() {
	return createRestApp(buildApplicationServicesFactory({ environment: 'test' }));
}

describe('GET /api/courses', () => {
	it('returns the default paginated catalog', async () => {
		const response = await app().request('/api/courses');
		expect(response.status).toBe(200);

		const body = (await response.json()) as CourseListResponse;
		expect(body.page).toBe(1);
		expect(body.pageSize).toBe(10);
		expect(body.items).toHaveLength(10);
		expect(body.totalItems).toBeGreaterThanOrEqual(12);
		expect(body.totalPages).toBe(Math.ceil(body.totalItems / 10));
		expect(body.items[0]?.id).toBeDefined();
		expect(body.items[0]?.title).toBeDefined();
	});

	it('filters by keyword, modality, and status together', async () => {
		const response = await app().request('/api/courses?q=security&modality=online&status=active');
		expect(response.status).toBe(200);

		const body = (await response.json()) as CourseListResponse;
		expect(body.items.length).toBeGreaterThan(0);
		for (const course of body.items) {
			const haystack = `${course.title} ${course.summary} ${course.tags.join(' ')}`.toLowerCase();
			expect(haystack.includes('security')).toBe(true);
			expect(course.modality).toBe('online');
			expect(course.status).toBe('active');
		}
	});

	it('returns HTTP 400 for invalid query parameters', async () => {
		const response = await app().request('/api/courses?modality=remote&pageSize=99');
		expect(response.status).toBe(400);

		const body = (await response.json()) as CourseErrorResponse;
		expect(body.error.code).toBe('INVALID_QUERY_PARAMETER');
		expect(body.error.message).toBe('One or more query parameters are invalid.');
		expect(body.error.details.map((detail) => detail.field)).toStrictEqual(['modality', 'pageSize']);
	});

	it('returns an empty items array when nothing matches', async () => {
		const response = await app().request('/api/courses?q=zzzz-no-such-course');
		expect(response.status).toBe(200);

		const body = (await response.json()) as CourseListResponse;
		expect(body.items).toStrictEqual([]);
		expect(body.totalItems).toBe(0);
		expect(body.page).toBe(1);
		expect(body.pageSize).toBe(10);
	});
});
