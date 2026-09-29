import { COURSE_MODALITIES, COURSE_STATUSES, type CourseSearchCriteria, DEFAULT_COURSE_PAGE, DEFAULT_COURSE_PAGE_SIZE, DEFAULT_COURSE_SORT_FIELD } from '@axc/domain';
import { describe, expect, it } from 'vitest';
import { COURSE_SEED_DATA } from './course-seed-data.ts';
import { InMemoryCourseReadRepository } from './in-memory-course-read-repository.ts';

const criteria = (overrides: Partial<CourseSearchCriteria> = {}): CourseSearchCriteria => ({
	keyword: undefined,
	modality: undefined,
	status: undefined,
	tag: undefined,
	page: DEFAULT_COURSE_PAGE,
	pageSize: DEFAULT_COURSE_PAGE_SIZE,
	sort: DEFAULT_COURSE_SORT_FIELD,
	...overrides,
});

describe('COURSE_SEED_DATA', () => {
	it('provides at least twelve courses', () => {
		expect(COURSE_SEED_DATA.length).toBeGreaterThanOrEqual(12);
	});

	it('has unique ids', () => {
		expect(new Set(COURSE_SEED_DATA.map((course) => course.id)).size).toBe(COURSE_SEED_DATA.length);
	});

	it('covers every modality and every status', () => {
		const modalities = new Set(COURSE_SEED_DATA.map((course) => course.modality));
		const statuses = new Set(COURSE_SEED_DATA.map((course) => course.status));

		expect([...modalities].sort()).toStrictEqual([...COURSE_MODALITIES].sort());
		expect([...statuses].sort()).toStrictEqual([...COURSE_STATUSES].sort());
	});

	it('gives every course a tag and ISO-8601 timestamps', () => {
		for (const course of COURSE_SEED_DATA) {
			expect(course.tags.length).toBeGreaterThan(0);
			expect(new Date(course.createdAt).toISOString()).toBe(course.createdAt);
			expect(new Date(course.updatedAt).toISOString()).toBe(course.updatedAt);
		}
	});
});

describe('InMemoryCourseReadRepository', () => {
	it('defaults to the seed catalog', async () => {
		const result = await new InMemoryCourseReadRepository().search(criteria());

		expect(result.totalItems).toBe(COURSE_SEED_DATA.length);
		expect(result.items).toHaveLength(DEFAULT_COURSE_PAGE_SIZE);
	});

	it('filters by modality', async () => {
		const result = await new InMemoryCourseReadRepository().search(criteria({ modality: 'online', pageSize: 50 }));

		expect(result.items.length).toBeGreaterThan(0);
		expect(result.items.every((course) => course.modality === 'online')).toBe(true);
	});

	it('filters by status', async () => {
		const result = await new InMemoryCourseReadRepository().search(criteria({ status: 'retired', pageSize: 50 }));

		expect(result.items.length).toBeGreaterThan(0);
		expect(result.items.every((course) => course.status === 'retired')).toBe(true);
	});

	it('filters by tag regardless of the casing used in the fixture', async () => {
		const result = await new InMemoryCourseReadRepository().search(criteria({ tag: 'security', pageSize: 50 }));

		expect(result.items.map((course) => course.id)).toStrictEqual(['course-001', 'course-010', 'course-007', 'course-003', 'course-014']);
	});

	it('searches the supplied catalog rather than the seed catalog', async () => {
		const repository = new InMemoryCourseReadRepository([]);

		await expect(repository.search(criteria())).resolves.toStrictEqual({ items: [], page: 1, pageSize: DEFAULT_COURSE_PAGE_SIZE, totalItems: 0, totalPages: 0 });
	});
});
