import { describe, expect, it } from 'vitest';
import { COURSE_FIXTURES, type CourseQuery, parseCourseQuery, searchCourses } from './courses.ts';
import { buildApplicationServicesFactory } from './index.ts';

const defaults = { page: 1, pageSize: 10, sort: 'title' } as const;
const search = (overrides: Partial<CourseQuery> = {}) => searchCourses(COURSE_FIXTURES, { ...defaults, ...overrides });
const ids = (query: Partial<CourseQuery> = {}) => search(query).items.map((course) => course.id);

function parsed(params: Record<string, string>): CourseQuery {
	const result = parseCourseQuery(params);
	if (!result.ok) {
		throw new Error(`expected a valid query, got ${JSON.stringify(result.errors)}`);
	}
	return result.query;
}

describe('course fixtures', () => {
	it('seeds at least 12 courses with mixed modality, status and tags', () => {
		expect(COURSE_FIXTURES.length).toBeGreaterThanOrEqual(12);
		expect(new Set(COURSE_FIXTURES.map((course) => course.modality))).toEqual(new Set(['online', 'in-person', 'hybrid']));
		expect(new Set(COURSE_FIXTURES.map((course) => course.status))).toEqual(new Set(['draft', 'active', 'retired']));
		expect(new Set(COURSE_FIXTURES.flatMap((course) => course.tags)).size).toBeGreaterThan(5);
		for (const course of COURSE_FIXTURES) {
			expect(course).toMatchObject({ id: expect.any(String), title: expect.any(String), summary: expect.any(String), tags: expect.any(Array) });
			expect(course.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
			expect(course.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
		}
	});

	it('exposes ids that are unique', () => {
		expect(new Set(COURSE_FIXTURES.map((course) => course.id)).size).toBe(COURSE_FIXTURES.length);
	});
});

describe('searchCourses defaults', () => {
	it('returns the first page sorted by title with pagination metadata', () => {
		const page = search();
		expect(page.page).toBe(1);
		expect(page.pageSize).toBe(10);
		expect(page.totalItems).toBe(12);
		expect(page.totalPages).toBe(2);
		expect(page.items).toHaveLength(10);
		expect(page.items[0]?.title).toBe('AI Security Foundations');
		expect(page.items.map((course) => course.title)).toEqual([...page.items].sort((left, right) => left.title.localeCompare(right.title)).map((course) => course.title));
	});
});

describe('keyword search', () => {
	it('matches title, summary and tags case-insensitively', () => {
		expect(ids({ q: 'security' })).toEqual(['course-001', 'course-004', 'course-010', 'course-012']);
		expect(ids({ q: 'SECURITY' })).toEqual(ids({ q: 'security' }));
	});

	it('matches on summary text only', () => {
		expect(ids({ q: 'mainframe' })).toEqual(['course-008']);
	});

	it('matches on a tag only', () => {
		expect(ids({ q: 'finops' })).toEqual(['course-003']);
	});
});

describe('filters', () => {
	it('filters by modality', () => {
		expect(ids({ modality: 'online' })).toEqual(['course-001', 'course-002', 'course-005', 'course-007', 'course-010']);
		expect(ids({ modality: 'hybrid' })).toEqual(['course-003', 'course-006', 'course-009']);
		expect(ids({ modality: 'in-person' })).toEqual(['course-004', 'course-008', 'course-011', 'course-012']);
	});

	it('filters by status', () => {
		expect(ids({ status: 'active' })).toEqual(['course-001', 'course-002', 'course-003', 'course-004', 'course-006', 'course-010']);
		expect(ids({ status: 'draft' })).toHaveLength(4);
		expect(ids({ status: 'retired' })).toEqual(['course-008', 'course-012']);
	});

	it('filters by tag case-insensitively', () => {
		expect(ids({ tag: 'ai' })).toEqual(['course-001', 'course-002', 'course-007']);
		expect(ids({ tag: 'AI' })).toEqual(ids({ tag: 'ai' }));
	});

	it('matches a whole tag rather than a prefix', () => {
		expect(ids({ tag: 'sec' })).toEqual([]);
	});

	it('combines q, modality and status', () => {
		expect(ids({ q: 'security', modality: 'online', status: 'active' })).toEqual(['course-001', 'course-010']);
	});

	it('combines every filter', () => {
		expect(ids({ q: 'security', modality: 'online', status: 'active', tag: 'ai' })).toEqual(['course-001']);
	});
});

describe('pagination', () => {
	it('slices by page and pageSize', () => {
		const page = search({ page: 2, pageSize: 5 });
		expect(page.items.map((course) => course.id)).toEqual(['course-006', 'course-007', 'course-008', 'course-009', 'course-010']);
		expect(page).toMatchObject({ page: 2, pageSize: 5, totalItems: 12, totalPages: 3 });
	});

	it('returns an empty page past the end of the result set', () => {
		expect(search({ page: 99, pageSize: 5 }).items).toEqual([]);
	});
});

describe('sorting', () => {
	it('sorts by createdAt ascending', () => {
		const sorted = ids({ sort: 'createdAt' });
		expect(sorted[0]).toBe('course-008');
		expect(sorted[1]).toBe('course-012');
	});

	it('sorts by updatedAt ascending', () => {
		const items = search({ sort: 'updatedAt' }).items.map((course) => course.updatedAt);
		expect(items).toEqual([...items].sort());
	});
});

describe('no matches', () => {
	it('returns an empty page with valid metadata rather than an error', () => {
		expect(search({ q: 'quantum-basket-weaving' })).toEqual({ items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 0 });
	});
});

describe('parseCourseQuery', () => {
	it('applies defaults when no parameters are supplied', () => {
		expect(parsed({})).toEqual({ page: 1, pageSize: 10, sort: 'title' });
	});

	it('accepts every supported parameter', () => {
		expect(parsed({ q: 'security', modality: 'online', status: 'active', tag: 'ai', page: '1', pageSize: '5', sort: 'title' })).toEqual({
			q: 'security',
			modality: 'online',
			status: 'active',
			tag: 'ai',
			page: 1,
			pageSize: 5,
			sort: 'title',
		});
	});

	it('treats blank values as absent', () => {
		expect(parsed({ q: '  ', tag: '' })).toEqual({ page: 1, pageSize: 10, sort: 'title' });
	});

	it('accepts the maximum pageSize', () => {
		expect(parsed({ pageSize: '50' }).pageSize).toBe(50);
	});

	it.each([
		['modality', 'remote', 'modality must be one of online, in-person, hybrid.'],
		['status', 'archived', 'status must be one of draft, active, retired.'],
		['sort', 'rating', 'sort must be one of title, createdAt, updatedAt.'],
		['page', '0', 'page must be an integer greater than or equal to 1.'],
		['page', 'abc', 'page must be an integer greater than or equal to 1.'],
		['page', '1.5', 'page must be an integer greater than or equal to 1.'],
		['pageSize', '0', 'pageSize must be between 1 and 50.'],
		['pageSize', '51', 'pageSize must be between 1 and 50.'],
		['pageSize', 'many', 'pageSize must be between 1 and 50.'],
	])('rejects %s=%s', (field, value, message) => {
		const result = parseCourseQuery({ [field]: value });
		expect(result.ok).toBe(false);
		if (result.ok) {
			throw new Error('expected a validation failure');
		}
		expect(result.errors).toEqual([{ field, message }]);
	});

	it('reports every invalid parameter at once', () => {
		const result = parseCourseQuery({ modality: 'remote', pageSize: '51' });
		expect(result.ok).toBe(false);
		if (result.ok) {
			throw new Error('expected a validation failure');
		}
		expect(result.errors.map((error) => error.field)).toEqual(['modality', 'pageSize']);
	});
});

describe('application services wiring', () => {
	it('exposes the seeded catalog through the courses service', async () => {
		const services = await buildApplicationServicesFactory({ environment: 'test' }).forRequest();
		expect(services.courses.search(parsed({ modality: 'hybrid' }))).toMatchObject({ totalItems: 3, page: 1, pageSize: 10 });
	});
});
