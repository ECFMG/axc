import { describe, expect, it } from 'vitest';
import { buildApplicationServicesFactory, COURSE_CATALOG, type CourseQueryErrorBody, type CourseSearchCriteria, type CourseSearchResult, parseCourseQuery, searchCourses } from './index.ts';

const criteria = (overrides: Partial<CourseSearchCriteria> = {}): CourseSearchCriteria => ({
	q: undefined,
	modality: undefined,
	status: undefined,
	tag: undefined,
	page: 1,
	pageSize: 10,
	sort: 'title',
	...overrides,
});

const search = (query: Record<string, string>): CourseSearchResult => {
	const parsed = parseCourseQuery(query);
	if (!parsed.ok) {
		throw new Error(`unexpected validation failure: ${JSON.stringify(parsed.error)}`);
	}
	return searchCourses(parsed.criteria);
};

const errorFor = (query: Record<string, string>): CourseQueryErrorBody => {
	const parsed = parseCourseQuery(query);
	if (parsed.ok) {
		throw new Error('expected validation failure');
	}
	return parsed.error;
};

// title collation places 'Agentic' before 'AI', so compare id sets rather than page order.
const ids = (result: CourseSearchResult): string[] => result.items.map((course) => course.id).sort();

describe('course catalog fixtures', () => {
	it('provides at least 12 courses with mixed modality, status, and tags', () => {
		expect(COURSE_CATALOG.length).toBeGreaterThanOrEqual(12);
		expect(new Set(COURSE_CATALOG.map((course) => course.modality))).toEqual(new Set(['online', 'in-person', 'hybrid']));
		expect(new Set(COURSE_CATALOG.map((course) => course.status))).toEqual(new Set(['draft', 'active', 'retired']));
		expect(new Set(COURSE_CATALOG.flatMap((course) => course.tags)).size).toBeGreaterThan(5);
		for (const course of COURSE_CATALOG) {
			expect(course).toMatchObject({ id: expect.any(String), title: expect.any(String), summary: expect.any(String) });
			expect(course.tags.length).toBeGreaterThan(0);
			expect(course.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
			expect(course.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
		}
	});
});

describe('course search defaults', () => {
	it('applies page 1, pageSize 10, and title sort', () => {
		const parsed = parseCourseQuery({});
		expect(parsed).toEqual({ ok: true, criteria: criteria() });
	});

	it('returns the first page with pagination metadata', () => {
		const result = search({});
		expect(result.items).toHaveLength(10);
		expect(result.page).toBe(1);
		expect(result.pageSize).toBe(10);
		expect(result.totalItems).toBe(COURSE_CATALOG.length);
		expect(result.totalPages).toBe(2);
	});
});

describe('course keyword search', () => {
	it('matches title, summary, and tags case-insensitively', () => {
		const result = search({ q: 'SeCuRiTy' });
		// course-001 title + tag, course-006 summary (uppercase), course-010 mixed-case tag, course-011 tag
		expect(ids(result)).toEqual(['course-001', 'course-006', 'course-010', 'course-011']);
	});

	it('ignores surrounding whitespace and empty keywords', () => {
		expect(ids(search({ q: '  kubernetes  ' }))).toEqual(['course-007']);
		expect(search({ q: '' }).totalItems).toBe(COURSE_CATALOG.length);
	});
});

describe('course filters', () => {
	it('filters by modality', () => {
		const result = search({ modality: 'online' });
		expect(result.items.every((course) => course.modality === 'online')).toBe(true);
		expect(result.totalItems).toBe(5);
	});

	it('filters by status', () => {
		const result = search({ status: 'active' });
		expect(result.items.every((course) => course.status === 'active')).toBe(true);
		expect(result.totalItems).toBe(6);
	});

	it('filters by tag case-insensitively', () => {
		expect(ids(search({ tag: 'ai' }))).toEqual(['course-001', 'course-002', 'course-003']);
		expect(ids(search({ tag: 'SECURITY' }))).toEqual(['course-001', 'course-006', 'course-010', 'course-011']);
	});

	it('combines q, modality, and status', () => {
		expect(ids(search({ q: 'security', modality: 'online', status: 'active' }))).toEqual(['course-001']);
	});

	it('returns an empty page with valid metadata when nothing matches', () => {
		const result = search({ q: 'underwater basket weaving' });
		expect(result).toEqual({ items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 0 });
	});
});

describe('course pagination', () => {
	it('honours page and pageSize', () => {
		const first = search({ page: '1', pageSize: '5' });
		const last = search({ page: '3', pageSize: '5' });
		expect(first.items).toHaveLength(5);
		expect(first.totalPages).toBe(3);
		expect(last.items).toHaveLength(2);
		expect(ids(first)).not.toContain(ids(last)[0]);
	});

	it('returns an empty page past the end of the result set', () => {
		const result = search({ page: '99' });
		expect(result.items).toEqual([]);
		expect(result.totalItems).toBe(COURSE_CATALOG.length);
	});

	it('accepts the maximum pageSize', () => {
		expect(search({ pageSize: '50' }).pageSize).toBe(50);
	});
});

describe('course sorting', () => {
	it('sorts by title by default', () => {
		const titles = search({}).items.map((course) => course.title);
		expect(titles).toEqual([...titles].sort((a, b) => a.localeCompare(b)));
	});

	it('sorts by createdAt and updatedAt ascending', () => {
		const created = search({ sort: 'createdAt', pageSize: '50' }).items.map((course) => course.createdAt);
		const updated = search({ sort: 'updatedAt', pageSize: '50' }).items.map((course) => course.updatedAt);
		expect(created).toEqual([...created].sort());
		expect(updated).toEqual([...updated].sort());
		expect(created[0]).toBe('2025-09-18T00:00:00.000Z');
	});
});

describe('course query validation', () => {
	it('rejects invalid enum values with a consistent error body', () => {
		expect(errorFor({ modality: 'telepathic' })).toEqual({
			error: {
				code: 'INVALID_QUERY_PARAMETER',
				message: 'One or more query parameters are invalid.',
				details: [{ field: 'modality', message: 'modality must be one of online, in-person, hybrid.' }],
			},
		});
		expect(errorFor({ status: 'paused' }).error.details).toEqual([{ field: 'status', message: 'status must be one of draft, active, retired.' }]);
		expect(errorFor({ sort: 'price' }).error.details).toEqual([{ field: 'sort', message: 'sort must be one of title, createdAt, updatedAt.' }]);
	});

	it('rejects invalid pagination values', () => {
		expect(errorFor({ page: '0' }).error.details).toEqual([{ field: 'page', message: 'page must be an integer greater than or equal to 1.' }]);
		expect(errorFor({ page: 'two' }).error.details[0]?.field).toBe('page');
		expect(errorFor({ page: '1.5' }).error.details[0]?.field).toBe('page');
		expect(errorFor({ pageSize: '51' }).error.details).toEqual([{ field: 'pageSize', message: 'pageSize must be between 1 and 50.' }]);
		expect(errorFor({ pageSize: '0' }).error.details[0]?.field).toBe('pageSize');
		expect(errorFor({ pageSize: '-1' }).error.details[0]?.field).toBe('pageSize');
	});

	it('reports every invalid parameter in one response', () => {
		expect(errorFor({ modality: 'nope', status: 'nope', sort: 'nope', page: '0', pageSize: '99' }).error.details.map((detail) => detail.field)).toEqual(['modality', 'status', 'sort', 'page', 'pageSize']);
	});
});

describe('course application service', () => {
	it('is exposed on the application services factory', async () => {
		const services = await buildApplicationServicesFactory({ environment: 'test' }).forRequest();
		expect(services.courses.search(criteria({ pageSize: 1 })).totalItems).toBe(COURSE_CATALOG.length);
	});
});
