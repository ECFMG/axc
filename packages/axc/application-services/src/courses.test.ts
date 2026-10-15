import { loadCourseCatalog } from '@axc/persistence';
import { describe, expect, it } from 'vitest';
import { type CourseQueryParameters, searchCourses } from './courses.ts';
import { buildApplicationServicesFactory } from './index.ts';

const titleOrder = ['course-005', 'course-001', 'course-004', 'course-007', 'course-011', 'course-012', 'course-008', 'course-006', 'course-003', 'course-010', 'course-002', 'course-009'];

describe('course catalog', () => {
	it('seeds at least 12 courses with mixed modality, status, and tags', () => {
		const courses = loadCourseCatalog();
		expect(courses.length).toBeGreaterThanOrEqual(12);
		expect(new Set(courses.map((course) => course.modality)).size).toBe(3);
		expect(new Set(courses.map((course) => course.status)).size).toBe(3);
		expect(new Set(courses.flatMap((course) => course.tags)).size).toBeGreaterThan(3);
	});
});

describe('course search', () => {
	it('returns the first page sorted by title with default pagination', () => {
		const page = expectPage({});
		expect(page.page).toBe(1);
		expect(page.pageSize).toBe(10);
		expect(page.totalItems).toBe(12);
		expect(page.totalPages).toBe(2);
		expect(page.items.map((course) => course.id)).toEqual(titleOrder.slice(0, 10));
	});

	it('is exposed on the application services factory', async () => {
		const services = await buildApplicationServicesFactory({ environment: 'test' }).forRequest();
		expect(services.courses.search({})).toEqual(searchCourses({}));
	});

	it('matches a keyword in the title, summary, or tags regardless of case', () => {
		expect(expectPage(params({ q: 'SECURITY' })).items.map((course) => course.id)).toEqual(['course-001', 'course-004', 'course-011', 'course-003', 'course-002']);
		expect(expectPage(params({ q: 'facilitation' })).items.map((course) => course.id)).toEqual(['course-006']);
		expect(expectPage(params({ q: 'drills' })).items.map((course) => course.id)).toEqual(['course-011']);
		expect(expectPage(params({ q: 'AUDIT' })).items.map((course) => course.id)).toEqual(['course-004']);
	});

	it('filters by modality, status, and tag', () => {
		const online = expectPage(params({ modality: 'online' }));
		expect(online.items.map((course) => course.id)).toEqual(['course-005', 'course-001', 'course-004', 'course-008']);
		expect(online.items.every((course) => course.modality === 'online')).toBe(true);

		const active = expectPage(params({ status: 'active' }));
		expect(active.items.map((course) => course.id)).toEqual(['course-005', 'course-001', 'course-007', 'course-011', 'course-002']);
		expect(active.items.every((course) => course.status === 'active')).toBe(true);

		expect(expectPage(params({ tag: 'AI' })).items.map((course) => course.id)).toEqual(['course-005', 'course-001']);
	});

	it('combines keyword, modality, and status filters', () => {
		const page = expectPage(params({ q: 'security', modality: 'online', status: 'active', tag: 'ai', page: '1', pageSize: '5', sort: 'title' }));
		expect(page).toEqual({
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

	it('paginates with page and pageSize', () => {
		const first = expectPage(params({ page: '1', pageSize: '5' }));
		expect(first.items).toHaveLength(5);
		expect(first.items.map((course) => course.id)).toEqual(titleOrder.slice(0, 5));
		expect(first.totalItems).toBe(12);
		expect(first.totalPages).toBe(3);

		const last = expectPage(params({ page: '2', pageSize: '10' }));
		expect(last.items.map((course) => course.id)).toEqual(['course-002', 'course-009']);
		expect(last.page).toBe(2);
		expect(last.totalPages).toBe(2);

		const wide = expectPage(params({ pageSize: '50' }));
		expect(wide.items).toHaveLength(12);
		expect(wide.totalPages).toBe(1);

		const beyond = expectPage(params({ page: '9', pageSize: '10' }));
		expect(beyond.items).toEqual([]);
		expect(beyond.page).toBe(9);
		expect(beyond.totalItems).toBe(12);
		expect(beyond.totalPages).toBe(2);
	});

	it('sorts by createdAt and updatedAt', () => {
		expect(expectPage(params({ sort: 'createdAt', pageSize: '50' })).items.map((course) => course.id)).toEqual([
			'course-004',
			'course-001',
			'course-003',
			'course-005',
			'course-002',
			'course-007',
			'course-012',
			'course-008',
			'course-006',
			'course-010',
			'course-009',
			'course-011',
		]);
		expect(expectPage(params({ sort: 'updatedAt', pageSize: '50' })).items.map((course) => course.updatedAt)).toEqual([
			'2026-02-01T00:00:00.000Z',
			'2026-03-15T00:00:00.000Z',
			'2026-04-02T00:00:00.000Z',
			'2026-04-10T00:00:00.000Z',
			'2026-05-02T00:00:00.000Z',
			'2026-06-01T00:00:00.000Z',
			'2026-06-15T00:00:00.000Z',
			'2026-07-01T00:00:00.000Z',
			'2026-07-20T00:00:00.000Z',
			'2026-08-01T00:00:00.000Z',
			'2026-08-15T00:00:00.000Z',
			'2026-09-01T00:00:00.000Z',
		]);
	});

	it('returns an empty page when nothing matches', () => {
		expect(expectPage(params({ q: 'zzzz-no-such-course' }))).toEqual({
			items: [],
			page: 1,
			pageSize: 10,
			totalItems: 0,
			totalPages: 0,
		});
	});

	it('rejects invalid modality, status, page, pageSize, and sort values', () => {
		expect(expectInvalid(params({ modality: 'remote' })).details).toEqual([{ field: 'modality', message: 'modality must be one of online, in-person, hybrid.' }]);
		expect(expectInvalid(params({ status: 'published' })).details).toEqual([{ field: 'status', message: 'status must be one of draft, active, retired.' }]);
		expect(expectInvalid(params({ page: '0' })).details).toEqual([{ field: 'page', message: 'page must be an integer greater than or equal to 1.' }]);
		expect(expectInvalid(params({ page: 'abc' })).details).toEqual([{ field: 'page', message: 'page must be an integer greater than or equal to 1.' }]);
		expect(expectInvalid(params({ pageSize: '51' }))).toEqual({
			code: 'INVALID_QUERY_PARAMETER',
			message: 'One or more query parameters are invalid.',
			details: [{ field: 'pageSize', message: 'pageSize must be between 1 and 50.' }],
		});
		expect(expectInvalid(params({ pageSize: '0' })).details).toEqual([{ field: 'pageSize', message: 'pageSize must be between 1 and 50.' }]);
		expect(expectInvalid(params({ sort: 'popularity' })).details).toEqual([{ field: 'sort', message: 'sort must be one of title, createdAt, updatedAt.' }]);
	});

	it('rejects unknown and repeated query parameters together', () => {
		expect(expectInvalid(params({ modality: 'nope', pageSize: '99', extra: '1', page: ['1', '2'] })).details).toEqual([
			{ field: 'modality', message: 'modality must be one of online, in-person, hybrid.' },
			{ field: 'page', message: 'page must be provided once.' },
			{ field: 'pageSize', message: 'pageSize must be between 1 and 50.' },
			{ field: 'extra', message: 'Unknown query parameter.' },
		]);
	});
});

function params(input: Record<string, string | readonly string[]>): CourseQueryParameters {
	const query: Record<string, readonly string[]> = {};
	for (const [field, value] of Object.entries(input)) {
		query[field] = typeof value === 'string' ? [value] : value;
	}
	return query;
}

function expectPage(query: CourseQueryParameters) {
	const outcome = searchCourses(query);
	expect(outcome.status).toBe('ok');
	if (outcome.status !== 'ok') {
		throw new Error('expected a successful course page');
	}
	return outcome.body;
}

function expectInvalid(query: CourseQueryParameters) {
	const outcome = searchCourses(query);
	expect(outcome.status).toBe('invalid');
	if (outcome.status !== 'invalid') {
		throw new Error('expected an invalid query response');
	}
	return outcome.error.error;
}
