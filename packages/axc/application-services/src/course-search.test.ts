import { beforeEach, describe, expect, it } from 'vitest';
import { COURSE_CATALOG } from './course-catalog.ts';
import { InvalidCourseQueryError, searchCourses } from './course-search.ts';
import { type ApplicationServices, buildApplicationServicesFactory } from './index.ts';

const MODALITY_MESSAGE = 'modality must be one of online, in-person, hybrid.';
const STATUS_MESSAGE = 'status must be one of draft, active, retired.';
const PAGE_MESSAGE = 'page must be an integer greater than or equal to 1.';
const PAGE_SIZE_MESSAGE = 'pageSize must be between 1 and 50.';
const SORT_MESSAGE = 'sort must be one of title, createdAt, updatedAt.';

describe('course catalog search', () => {
	let courses: ApplicationServices['courses'];

	beforeEach(async () => {
		const services = await buildApplicationServicesFactory({ environment: 'test' }).forRequest();
		courses = services.courses;
	});

	it('seeds mixed modalities, statuses, and tags', () => {
		expect(COURSE_CATALOG).toHaveLength(12);
		expect(new Set(COURSE_CATALOG.map((course) => course.id)).size).toBe(12);
		expect(distinct(COURSE_CATALOG.map((course) => course.modality))).toEqual(['hybrid', 'in-person', 'online']);
		expect(distinct(COURSE_CATALOG.map((course) => course.status))).toEqual(['active', 'draft', 'retired']);
		expect(COURSE_CATALOG.some((course) => course.tags.length > 1)).toBe(true);
	});

	it('returns the first page with default pagination and title sort', () => {
		const page = courses.search({});

		expect(page.page).toBe(1);
		expect(page.pageSize).toBe(10);
		expect(page.totalItems).toBe(12);
		expect(page.totalPages).toBe(2);
		expect(page.items).toHaveLength(10);
		expect(page.items.map((item) => item.id)).toEqual(['course-012', 'course-005', 'course-001', 'course-002', 'course-008', 'course-011', 'course-009', 'course-007', 'course-006', 'course-003']);
		expect(page.items[0]).toEqual({
			id: 'course-012',
			title: 'Advanced AI Lab',
			summary: 'Lab exercises for model evaluation.',
			modality: 'hybrid',
			status: 'retired',
			tags: ['ai', 'lab'],
			createdAt: '2026-08-01T00:00:00.000Z',
			updatedAt: '2026-08-15T00:00:00.000Z',
		});
	});

	it('matches a keyword in the title, summary, or tags ignoring case', () => {
		const page = courses.search({ q: 'SECURITY' });
		const byId = Object.fromEntries(page.items.map((item) => [item.id, item]));

		expect(page.items.map((item) => item.id)).toEqual(['course-001', 'course-002', 'course-003', 'course-004']);
		expect(byId['course-002']?.title.toLowerCase()).toContain('security');
		expect(byId['course-002']?.summary.toLowerCase()).not.toContain('security');
		expect(byId['course-002']?.tags.join(' ').toLowerCase()).not.toContain('security');
		expect(byId['course-003']?.summary.toLowerCase()).toContain('security');
		expect(byId['course-003']?.title.toLowerCase()).not.toContain('security');
		expect(byId['course-004']?.tags.map((tag) => tag.toLowerCase())).toContain('security');
		expect(byId['course-004']?.title.toLowerCase()).not.toContain('security');
		expect(byId['course-004']?.summary.toLowerCase()).not.toContain('security');
	});

	it('filters by modality, status, and tag', () => {
		expect(courses.search({ modality: 'online' }).items.every((item) => item.modality === 'online')).toBe(true);
		expect(courses.search({ modality: 'online' }).totalItems).toBe(5);
		expect(courses.search({ modality: ' in-person ' }).totalItems).toBe(3);
		expect(courses.search({ modality: 'hybrid' }).totalItems).toBe(4);
		expect(courses.search({ status: 'active' }).items.every((item) => item.status === 'active')).toBe(true);
		expect(courses.search({ status: 'active' }).totalItems).toBe(6);
		expect(courses.search({ status: 'draft' }).totalItems).toBe(3);
		expect(courses.search({ status: 'retired' }).totalItems).toBe(3);
		expect(courses.search({ tag: 'AI' }).items.map((item) => item.id)).toEqual(['course-012', 'course-005', 'course-001']);
		expect(courses.search({ tag: 'sec' }).items).toEqual([]);
	});

	it('combines keyword, modality, and status filters', () => {
		const page = courses.search({ q: 'security', modality: 'online', status: 'active' });

		expect(page.items.map((item) => item.id)).toEqual(['course-001', 'course-004']);
	});

	it('returns the documented example for the combined catalog query', () => {
		const page = courses.search({
			q: 'security',
			modality: 'online',
			status: 'active',
			tag: 'ai',
			page: '1',
			pageSize: '5',
			sort: 'title',
		});

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
		const first = courses.search({ page: '1', pageSize: '5' });
		const second = courses.search({ page: '2', pageSize: '10' });
		const all = courses.search({ pageSize: '50' });
		const pastEnd = courses.search({ page: '9' });

		expect(first.items).toHaveLength(5);
		expect(first.page).toBe(1);
		expect(first.pageSize).toBe(5);
		expect(first.totalItems).toBe(12);
		expect(first.totalPages).toBe(3);
		expect(second.items.map((item) => item.id)).toEqual(['course-010', 'course-004']);
		expect(second.page).toBe(2);
		expect(second.totalPages).toBe(2);
		expect(all.items).toHaveLength(12);
		expect(all.pageSize).toBe(50);
		expect(all.totalPages).toBe(1);
		expect(pastEnd.items).toEqual([]);
		expect(pastEnd.page).toBe(9);
		expect(pastEnd.totalItems).toBe(12);
		expect(pastEnd.totalPages).toBe(2);
	});

	it('sorts by title, createdAt, and updatedAt', () => {
		const byTitle = courses.search({ sort: 'title', pageSize: '50' });
		const byCreatedAt = courses.search({ sort: 'createdAt', pageSize: '50' });
		const byUpdatedAt = courses.search({ sort: 'updatedAt', pageSize: '50' });

		expect(byTitle.items.map((item) => item.id)).toEqual(
			courses
				.search({})
				.items.concat(courses.search({ page: '2' }).items)
				.map((item) => item.id),
		);
		expect(byCreatedAt.items.map((item) => item.id)).toEqual([
			'course-009',
			'course-011',
			'course-005',
			'course-001',
			'course-003',
			'course-002',
			'course-010',
			'course-006',
			'course-007',
			'course-004',
			'course-008',
			'course-012',
		]);
		expect(byUpdatedAt.items.map((item) => item.id)).toEqual([
			'course-009',
			'course-011',
			'course-003',
			'course-005',
			'course-006',
			'course-002',
			'course-001',
			'course-004',
			'course-010',
			'course-007',
			'course-008',
			'course-012',
		]);
		expect(isNonDecreasing(byCreatedAt.items.map((item) => item.createdAt))).toBe(true);
		expect(isNonDecreasing(byUpdatedAt.items.map((item) => item.updatedAt))).toBe(true);
	});

	it('rejects invalid modality, status, page, pageSize, and sort values', () => {
		expectInvalid(courses, { modality: 'remote' }, [{ field: 'modality', message: MODALITY_MESSAGE }]);
		expectInvalid(courses, { status: 'published' }, [{ field: 'status', message: STATUS_MESSAGE }]);
		expectInvalid(courses, { status: 'Active' }, [{ field: 'status', message: STATUS_MESSAGE }]);
		expectInvalid(courses, { page: '0' }, [{ field: 'page', message: PAGE_MESSAGE }]);
		expectInvalid(courses, { page: 'abc' }, [{ field: 'page', message: PAGE_MESSAGE }]);
		expectInvalid(courses, { page: '-1' }, [{ field: 'page', message: PAGE_MESSAGE }]);
		expectInvalid(courses, { pageSize: '51' }, [{ field: 'pageSize', message: PAGE_SIZE_MESSAGE }]);
		expectInvalid(courses, { pageSize: '0' }, [{ field: 'pageSize', message: PAGE_SIZE_MESSAGE }]);
		expectInvalid(courses, { pageSize: 'abc' }, [{ field: 'pageSize', message: PAGE_SIZE_MESSAGE }]);
		expectInvalid(courses, { sort: 'name' }, [{ field: 'sort', message: SORT_MESSAGE }]);
		expectInvalid(courses, { modality: 'remote', status: 'published', page: '0', pageSize: '51', sort: 'name' }, [
			{ field: 'modality', message: MODALITY_MESSAGE },
			{ field: 'status', message: STATUS_MESSAGE },
			{ field: 'page', message: PAGE_MESSAGE },
			{ field: 'pageSize', message: PAGE_SIZE_MESSAGE },
			{ field: 'sort', message: SORT_MESSAGE },
		]);
	});

	it('returns an empty list when nothing matches', () => {
		expect(courses.search({ q: 'zzzz-not-a-course' })).toEqual({
			items: [],
			page: 1,
			pageSize: 10,
			totalItems: 0,
			totalPages: 0,
		});
		expect(searchCourses([], {})).toEqual({
			items: [],
			page: 1,
			pageSize: 10,
			totalItems: 0,
			totalPages: 0,
		});
	});

	it('ignores unknown query parameters', () => {
		expect(courses.search({ unexpected: 'value' }).totalItems).toBe(12);
	});
});

function expectInvalid(courses: ApplicationServices['courses'], query: Readonly<Record<string, string>>, details: { field: string; message: string }[]): void {
	try {
		courses.search(query);
		expect.fail('expected an invalid course query');
	} catch (error) {
		expect(error).toBeInstanceOf(InvalidCourseQueryError);
		if (!(error instanceof InvalidCourseQueryError)) {
			return;
		}
		expect(error.code).toBe('INVALID_QUERY_PARAMETER');
		expect(error.message).toBe('One or more query parameters are invalid.');
		expect(error.details).toEqual(details);
	}
}

function distinct(values: readonly string[]): string[] {
	return [...new Set(values)].sort();
}

function isNonDecreasing(values: readonly string[]): boolean {
	for (let index = 1; index < values.length; index += 1) {
		const previous = values[index - 1];
		const current = values[index];
		if (previous === undefined || current === undefined || previous > current) {
			return false;
		}
	}
	return true;
}
