import type { Course } from '@axc/domain';
import { createInMemoryCourseReadRepository, seededCourses } from '@axc/persistence';
import { describe, expect, it } from 'vitest';
import { DEFAULT_COURSE_PAGE, DEFAULT_COURSE_PAGE_SIZE, INVALID_QUERY_PARAMETER_CODE, MAX_COURSE_PAGE_SIZE, searchCourses } from './courses.ts';
import { buildApplicationServicesFactory } from './index.ts';

describe('course catalog search', () => {
	it('returns a paginated list with default page and page size', async () => {
		const services = await buildApplicationServicesFactory({ environment: 'test' }).forRequest();
		const result = services.courses.search({});

		expect(result.ok).toBe(true);
		if (!result.ok) {
			return;
		}

		expect(result.value.page).toBe(DEFAULT_COURSE_PAGE);
		expect(result.value.pageSize).toBe(DEFAULT_COURSE_PAGE_SIZE);
		expect(result.value.items).toHaveLength(DEFAULT_COURSE_PAGE_SIZE);
		expect(result.value.totalItems).toBe(seededCourses.length);
		expect(result.value.totalItems).toBeGreaterThanOrEqual(12);
		expect(result.value.totalPages).toBe(Math.ceil(seededCourses.length / DEFAULT_COURSE_PAGE_SIZE));
		expect(result.value.items.map((course) => course.title)).toEqual([...result.value.items].map((course) => course.title).sort((left, right) => left.localeCompare(right, 'en')));
	});

	it('matches q case-insensitively across title, summary, and tags', () => {
		const catalog = createInMemoryCourseReadRepository([
			course({ id: 'title-hit', title: 'SECURITY workshop', summary: 'unrelated', tags: ['ops'] }),
			course({ id: 'summary-hit', title: 'Other', summary: 'contains Security here', tags: ['ops'] }),
			course({ id: 'tag-hit', title: 'Other', summary: 'unrelated', tags: ['SecUriTy'] }),
			course({ id: 'miss', title: 'Unrelated', summary: 'nope', tags: ['ops'] }),
		]);

		const result = searchCourses(catalog, { q: 'security' });
		expect(result.ok).toBe(true);
		if (!result.ok) {
			return;
		}

		expect(result.value.items.map((item) => item.id)).toEqual(['summary-hit', 'tag-hit', 'title-hit']);
	});

	it('filters by modality, status, and tag', () => {
		const byModality = searchCourses(createInMemoryCourseReadRepository(), { modality: 'online' });
		const byStatus = searchCourses(createInMemoryCourseReadRepository(), { status: 'active' });
		const byTag = searchCourses(createInMemoryCourseReadRepository(), { tag: 'AI' });

		expect(byModality.ok && byModality.value.items.every((course) => course.modality === 'online')).toBe(true);
		expect(byStatus.ok && byStatus.value.items.every((course) => course.status === 'active')).toBe(true);
		expect(byTag.ok && byTag.value.items.every((course) => course.tags.some((tag) => tag.toLocaleLowerCase() === 'ai'))).toBe(true);
		expect(byTag.ok && byTag.value.totalItems).toBeGreaterThan(0);
	});

	it('applies combined q, modality, and status filters', () => {
		const result = searchCourses(createInMemoryCourseReadRepository(), { q: 'ai', modality: 'online', status: 'active' });
		expect(result.ok).toBe(true);
		if (!result.ok) {
			return;
		}

		expect(result.value.items.length).toBeGreaterThan(0);
		for (const course of result.value.items) {
			expect(course.modality).toBe('online');
			expect(course.status).toBe('active');
			const haystack = `${course.title} ${course.summary} ${course.tags.join(' ')}`.toLocaleLowerCase();
			expect(haystack.includes('ai')).toBe(true);
		}
	});

	it('paginates with page and pageSize', () => {
		const first = searchCourses(createInMemoryCourseReadRepository(), { page: '1', pageSize: '5', sort: 'title' });
		const second = searchCourses(createInMemoryCourseReadRepository(), { page: '2', pageSize: '5', sort: 'title' });
		expect(first.ok && second.ok).toBe(true);
		if (!first.ok || !second.ok) {
			return;
		}

		expect(first.value.items).toHaveLength(5);
		expect(second.value.items).toHaveLength(5);
		expect(first.value.page).toBe(1);
		expect(first.value.pageSize).toBe(5);
		expect(first.value.totalItems).toBe(seededCourses.length);
		expect(first.value.totalPages).toBe(Math.ceil(seededCourses.length / 5));
		expect(first.value.items.map((course) => course.id)).not.toEqual(second.value.items.map((course) => course.id));
	});

	it('sorts by createdAt ascending', () => {
		const result = searchCourses(createInMemoryCourseReadRepository(), { sort: 'createdAt', pageSize: '50' });
		expect(result.ok).toBe(true);
		if (!result.ok) {
			return;
		}

		const createdAt = result.value.items.map((course) => course.createdAt);
		expect(createdAt).toEqual([...createdAt].sort((left, right) => left.localeCompare(right)));
	});

	it('returns 400 details for invalid enum, page, pageSize, and sort', () => {
		const result = searchCourses(createInMemoryCourseReadRepository(), {
			modality: 'remote',
			status: 'published',
			page: '0',
			pageSize: String(MAX_COURSE_PAGE_SIZE + 1),
			sort: 'popularity',
		});

		expect(result.ok).toBe(false);
		if (result.ok) {
			return;
		}

		expect(result.error.code).toBe(INVALID_QUERY_PARAMETER_CODE);
		expect(result.error.message).toBe('One or more query parameters are invalid.');
		expect(result.error.details.map((detail) => detail.field)).toEqual(['modality', 'status', 'page', 'pageSize', 'sort']);
	});

	it('rejects non-numeric page and pageSize', () => {
		const result = searchCourses(createInMemoryCourseReadRepository(), { page: 'first', pageSize: 'ten' });
		expect(result.ok).toBe(false);
		if (result.ok) {
			return;
		}

		expect(result.error.details.map((detail) => detail.field)).toEqual(['page', 'pageSize']);
	});

	it('returns an empty list with pagination metadata when nothing matches', () => {
		const result = searchCourses(createInMemoryCourseReadRepository(), { q: 'no-such-course-token' });
		expect(result.ok).toBe(true);
		if (!result.ok) {
			return;
		}

		expect(result.value.items).toEqual([]);
		expect(result.value.page).toBe(1);
		expect(result.value.pageSize).toBe(10);
		expect(result.value.totalItems).toBe(0);
		expect(result.value.totalPages).toBe(0);
	});
});

function course(overrides: Partial<Course> & Pick<Course, 'id' | 'title' | 'summary' | 'tags'>): Course {
	return {
		modality: 'online',
		status: 'active',
		createdAt: '2026-01-01T00:00:00.000Z',
		updatedAt: '2026-01-01T00:00:00.000Z',
		...overrides,
	};
}
