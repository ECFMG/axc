import { courseCatalog, type EnrollmentRequest } from '@axc/domain';
import { describe, expect, it } from 'vitest';
import type { CoursePage } from './courses.ts';
import { buildApplicationServicesFactory, type ServiceResult } from './index.ts';

describe('course search', () => {
	it('returns the first page of 10 courses sorted by title', async () => {
		const page = await search({});
		expect(page.page).toBe(1);
		expect(page.pageSize).toBe(10);
		expect(page.totalItems).toBe(12);
		expect(page.totalPages).toBe(2);
		expect(page.items).toHaveLength(10);
		expect(page.items[0]?.title).toBe('Accessibility Fundamentals');
	});

	it('matches q against title, summary, and tags without case sensitivity', async () => {
		const page = await search({ q: 'SECURITY' });
		expect(page.items.map((course) => course.id).sort()).toEqual(['course-001', 'course-002', 'course-006', 'course-009', 'course-010', 'course-011']);
	});

	it('filters by modality, status, and tag', async () => {
		const online = await search({ modality: 'online' });
		expect(online.items.map((course) => course.id).sort()).toEqual(['course-001', 'course-004', 'course-005', 'course-008', 'course-011']);
		expect(online.items.every((course) => course.modality === 'online')).toBe(true);

		const active = await search({ status: 'active' });
		expect(active.items.map((course) => course.id).sort()).toEqual(['course-001', 'course-002', 'course-005', 'course-006', 'course-007', 'course-010', 'course-011']);

		const ai = await search({ tag: 'AI' });
		expect(ai.items.map((course) => course.id).sort()).toEqual(['course-001', 'course-007']);
	});

	it('combines q, modality, and status', async () => {
		const page = await search({ q: 'security', modality: 'online', status: 'active' });
		expect(page.items.map((course) => course.id).sort()).toEqual(['course-001', 'course-011']);
	});

	it('paginates with page and pageSize', async () => {
		const page = await search({ page: '2', pageSize: '5' });
		expect(page.page).toBe(2);
		expect(page.pageSize).toBe(5);
		expect(page.totalItems).toBe(12);
		expect(page.totalPages).toBe(3);
		expect(page.items.map((course) => course.title)).toEqual(['Draft Workshop', 'Hybrid Leadership', 'Hybrid Security Review', 'Incident Response', 'Platform Engineering']);
	});

	it('sorts by createdAt', async () => {
		const page = await search({ sort: 'createdAt', pageSize: '3' });
		expect(page.items.map((course) => course.id)).toEqual(['course-008', 'course-004', 'course-001']);
	});

	it('returns an empty page when nothing matches', async () => {
		const page = await search({ q: 'zzzzzzzz' });
		expect(page.items).toEqual([]);
		expect(page.page).toBe(1);
		expect(page.pageSize).toBe(10);
		expect(page.totalItems).toBe(0);
		expect(page.totalPages).toBe(0);
	});

	it('rejects invalid query parameters', async () => {
		const invalid = await searchResult({ modality: 'classroom', status: 'archived', page: '0', sort: 'name' });
		expect(invalid.ok).toBe(false);
		if (!invalid.ok) {
			expect(invalid.error.status).toBe(400);
			expect(invalid.error.code).toBe('INVALID_QUERY_PARAMETER');
			expect(invalid.error.message).toBe('One or more query parameters are invalid.');
			expect(invalid.error.details.map((detail) => detail.field).sort()).toEqual(['modality', 'page', 'sort', 'status']);
		}

		const pageSize = await searchResult({ pageSize: '51' });
		expect(pageSize.ok).toBe(false);
		if (!pageSize.ok) {
			expect(pageSize.error.details).toEqual([{ field: 'pageSize', message: 'pageSize must be between 1 and 50.' }]);
		}

		const unknown = await searchResult({ extra: '1' });
		expect(unknown.ok).toBe(false);
		if (!unknown.ok) {
			expect(unknown.error.details[0]?.field).toBe('extra');
		}
	});
});

async function search(query: Record<string, string>): Promise<CoursePage> {
	const result = await searchResult(query);
	expect(result.ok).toBe(true);
	if (!result.ok) {
		throw new Error('expected a course page');
	}
	return result.value;
}

function searchResult(query: Record<string, string>): Promise<ServiceResult<CoursePage>> {
	return services().then((application) => application.courses.search(query));
}

function services() {
	return buildApplicationServicesFactory(
		{ environment: 'test' },
		{
			courses: {
				list: () => Promise.resolve(courseCatalog.map((course) => structuredClone(course))),
				getById: (id) => {
					const found = courseCatalog.find((course) => course.id === id);
					return Promise.resolve(found === undefined ? undefined : structuredClone(found));
				},
			},
			enrollmentRequests: {
				list: () => Promise.resolve([]),
				getById: () => Promise.resolve(undefined),
				save: (item: EnrollmentRequest) => Promise.resolve(item),
			},
		},
	).forRequest();
}
