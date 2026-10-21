import { readCourseCatalog } from '@axc/persistence';
import { describe, expect, it } from 'vitest';
import { buildApplicationServicesFactory } from './index.ts';
import { type CourseListResult, type CoursePage, type CourseQueryError, type CourseQueryInput, listCourses } from './list-courses.ts';

const titleOrder = ['course-009', 'course-001', 'course-012', 'course-005', 'course-004', 'course-008', 'course-013', 'course-007', 'course-006', 'course-002', 'course-011', 'course-010', 'course-003'];
const createdAtOrder = ['course-006', 'course-008', 'course-010', 'course-004', 'course-013', 'course-012', 'course-001', 'course-002', 'course-009', 'course-003', 'course-005', 'course-007', 'course-011'];
const updatedAtOrder = ['course-008', 'course-006', 'course-010', 'course-004', 'course-013', 'course-012', 'course-003', 'course-005', 'course-002', 'course-007', 'course-001', 'course-011', 'course-009'];

describe('course catalog search', () => {
	it('seeds a mixed catalog of at least 12 courses', () => {
		const courses = readCourseCatalog();
		expect(courses.length).toBe(13);
		expect(new Set(courses.map((course) => course.modality)).size).toBe(3);
		expect(new Set(courses.map((course) => course.status)).size).toBe(3);
		expect(courses.some((course) => course.tags.length > 1)).toBe(true);
	});

	it('returns a copy so callers cannot change the fixture', () => {
		const first = readCourseCatalog();
		const tags = first[0]?.tags as string[] | undefined;
		expect(tags).toBeDefined();
		tags?.push('mutated');
		expect(readCourseCatalog()[0]?.tags).not.toContain('mutated');
	});

	it('returns the default page sorted by title', () => {
		const page = expectPage(listCourses(readCourseCatalog(), query()));
		expect(page.page).toBe(1);
		expect(page.pageSize).toBe(10);
		expect(page.totalItems).toBe(13);
		expect(page.totalPages).toBe(2);
		expect(page.items.map((course) => course.id)).toEqual(titleOrder.slice(0, 10));
		expect(Object.keys(page.items[0] ?? {})).toEqual(['id', 'title', 'summary', 'modality', 'status', 'tags', 'createdAt', 'updatedAt']);
	});

	it('matches the documented example query', () => {
		const page = expectPage(
			listCourses(
				readCourseCatalog(),
				query({
					q: 'security',
					modality: 'online',
					status: 'active',
					tag: 'ai',
					page: '1',
					pageSize: '5',
					sort: 'title',
				}),
			),
		);
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

	it('searches title, summary, and tags case-insensitively', () => {
		const page = expectPage(listCourses(readCourseCatalog(), query({ q: 'SeCuRiTy', pageSize: '50' })));
		expect(page.items.map((course) => course.id)).toEqual(['course-001', 'course-011', 'course-010']);
		expect(page.totalItems).toBe(3);
	});

	it('treats a keyword as a substring and a tag as an exact label', () => {
		const keyword = expectPage(listCourses(readCourseCatalog(), query({ q: 'sec', pageSize: '50' })));
		expect(keyword.items.map((course) => course.id)).toContain('course-001');
		const tag = expectPage(listCourses(readCourseCatalog(), query({ tag: 'sec', pageSize: '50' })));
		expect(tag.items).toEqual([]);
		expect(tag.totalItems).toBe(0);
		expect(tag.totalPages).toBe(0);
	});

	it('filters modality, status, and tag', () => {
		expect(ids(query({ modality: 'online', pageSize: '50' }))).toEqual(['course-009', 'course-001', 'course-005', 'course-013', 'course-006']);
		expect(ids(query({ status: 'active', pageSize: '50' }))).toEqual(['course-009', 'course-001', 'course-012', 'course-004', 'course-013', 'course-002']);
		expect(ids(query({ tag: 'AI' }))).toEqual(['course-001']);
		expect(ids(query({ tag: ' leadership ' }))).toEqual(['course-013']);
	});

	it('combines keyword, modality, and status', () => {
		expect(ids(query({ q: 'security', modality: 'online', status: 'active' }))).toEqual(['course-001']);
		expect(ids(query({ q: 'security', modality: 'hybrid', status: 'active' }))).toEqual([]);
	});

	it('paginates with page and pageSize', () => {
		const first = expectPage(listCourses(readCourseCatalog(), query({ page: '1', pageSize: '5' })));
		expect(first.items).toHaveLength(5);
		expect(first.page).toBe(1);
		expect(first.pageSize).toBe(5);
		expect(first.totalItems).toBe(13);
		expect(first.totalPages).toBe(3);
		expect(first.items.map((course) => course.id)).toEqual(titleOrder.slice(0, 5));

		const second = expectPage(listCourses(readCourseCatalog(), query({ page: '2', pageSize: '10' })));
		expect(second.items.map((course) => course.id)).toEqual(titleOrder.slice(10));
		expect(second.totalPages).toBe(2);

		const beyond = expectPage(listCourses(readCourseCatalog(), query({ page: '4', pageSize: '5' })));
		expect(beyond.items).toEqual([]);
		expect(beyond.page).toBe(4);
		expect(beyond.totalItems).toBe(13);
		expect(beyond.totalPages).toBe(3);
	});

	it('sorts by createdAt and updatedAt ascending', () => {
		expect(ids(query({ sort: 'createdAt', pageSize: '50' }))).toEqual(createdAtOrder);
		expect(ids(query({ sort: 'updatedAt', pageSize: '50' }))).toEqual(updatedAtOrder);
	});

	it('breaks title ties by id', () => {
		const page = expectPage(listCourses([course('b', 'Same', '2026-01-02T00:00:00.000Z'), course('a', 'Same', '2026-01-01T00:00:00.000Z')], query({ sort: 'title' })));
		expect(page.items.map((item) => item.id)).toEqual(['a', 'b']);
	});

	it('returns an empty page when nothing matches', () => {
		const page = expectPage(listCourses(readCourseCatalog(), query({ q: 'zzzz-no-such-course' })));
		expect(page).toEqual({ items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 0 });
	});

	it('rejects invalid modality, status, page, pageSize, and sort', () => {
		expect(expectError(listCourses(readCourseCatalog(), query({ modality: 'weekend' }))).details).toEqual([{ field: 'modality', message: 'modality must be one of online, in-person, or hybrid.' }]);
		expect(expectError(listCourses(readCourseCatalog(), query({ status: 'archived' }))).details).toEqual([{ field: 'status', message: 'status must be one of draft, active, or retired.' }]);
		expect(expectError(listCourses(readCourseCatalog(), query({ page: '0' }))).details).toEqual([{ field: 'page', message: 'page must be an integer greater than or equal to 1.' }]);
		expect(expectError(listCourses(readCourseCatalog(), query({ page: 'abc' }))).details[0]?.field).toBe('page');
		expect(expectError(listCourses(readCourseCatalog(), query({ pageSize: '51' }))).details).toEqual([{ field: 'pageSize', message: 'pageSize must be between 1 and 50.' }]);
		expect(expectError(listCourses(readCourseCatalog(), query({ pageSize: '0' }))).details[0]?.field).toBe('pageSize');
		expect(expectError(listCourses(readCourseCatalog(), query({ sort: 'popularity' }))).details).toEqual([{ field: 'sort', message: 'sort must be one of title, createdAt, or updatedAt.' }]);
	});

	it('rejects repeated parameters, unknown parameters, and empty tags together', () => {
		const error = expectError(listCourses(readCourseCatalog(), query({ modality: ['online', 'hybrid'], page: '-1', tag: ' ', extra: '1', another: '1' })));
		expect(error.code).toBe('INVALID_QUERY_PARAMETER');
		expect(error.message).toBe('One or more query parameters are invalid.');
		expect(error.details).toEqual([
			{ field: 'modality', message: 'modality must be specified once.' },
			{ field: 'tag', message: 'tag must be a non-empty string.' },
			{ field: 'page', message: 'page must be an integer greater than or equal to 1.' },
			{ field: 'another', message: 'another is not a supported query parameter.' },
			{ field: 'extra', message: 'extra is not a supported query parameter.' },
		]);
	});

	it('accepts the largest page size and a blank keyword', () => {
		const page = expectPage(listCourses(readCourseCatalog(), query({ pageSize: '50', q: '   ' })));
		expect(page.items).toHaveLength(13);
		expect(page.pageSize).toBe(50);
		expect(page.totalPages).toBe(1);
	});

	it('lists courses from the application service factory', async () => {
		const services = await buildApplicationServicesFactory({ environment: 'test' }).forRequest();
		const page = expectPage(services.courses.list(query()));
		expect(page.totalItems).toBe(13);
		expect(page.items).toHaveLength(10);
	});
});

function query(input: Record<string, string | readonly string[]> = {}): CourseQueryInput {
	const result: Record<string, readonly string[]> = {};
	for (const [key, value] of Object.entries(input)) {
		result[key] = typeof value === 'string' ? [value] : value;
	}
	return result;
}

function ids(input: CourseQueryInput): string[] {
	return expectPage(listCourses(readCourseCatalog(), input)).items.map((course) => course.id);
}

function expectPage(result: CourseListResult): CoursePage {
	expect(result.ok).toBe(true);
	if (!result.ok) {
		throw new Error('expected a course page');
	}
	return result.page;
}

function expectError(result: CourseListResult): CourseQueryError {
	expect(result.ok).toBe(false);
	if (result.ok) {
		throw new Error('expected an invalid query');
	}
	expect(result.error.code).toBe('INVALID_QUERY_PARAMETER');
	expect(result.error.message).toBe('One or more query parameters are invalid.');
	return result.error;
}

function course(id: string, title: string, createdAt: string) {
	return {
		id,
		title,
		summary: 'Tie break fixture.',
		modality: 'online' as const,
		status: 'active' as const,
		tags: ['fixture'],
		createdAt,
		updatedAt: createdAt,
	};
}
