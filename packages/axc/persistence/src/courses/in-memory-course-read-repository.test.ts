import { COURSE_MODALITIES, COURSE_STATUSES, DEFAULT_COURSE_PAGE, DEFAULT_COURSE_PAGE_SIZE, DEFAULT_COURSE_SORT_FIELD } from '@axc/domain';
import { describe, expect, it } from 'vitest';
import { courseSeedData } from './course-seed-data.ts';
import { createInMemoryCourseReadRepository } from './in-memory-course-read-repository.ts';

const defaultCriteria = { page: DEFAULT_COURSE_PAGE, pageSize: DEFAULT_COURSE_PAGE_SIZE, sort: DEFAULT_COURSE_SORT_FIELD } as const;

describe('course seed data', () => {
	it('provides at least twelve courses with unique ids', () => {
		expect(courseSeedData.length).toBeGreaterThanOrEqual(12);
		expect(new Set(courseSeedData.map((course) => course.id)).size).toBe(courseSeedData.length);
	});

	it('covers every modality and every status', () => {
		expect(new Set(courseSeedData.map((course) => course.modality))).toStrictEqual(new Set(COURSE_MODALITIES));
		expect(new Set(courseSeedData.map((course) => course.status))).toStrictEqual(new Set(COURSE_STATUSES));
	});

	it('gives every course at least one tag and ISO-8601 timestamps', () => {
		for (const course of courseSeedData) {
			expect(course.tags.length).toBeGreaterThan(0);
			expect(new Date(course.createdAt).toISOString()).toBe(course.createdAt);
			expect(new Date(course.updatedAt).toISOString()).toBe(course.updatedAt);
		}
	});

	it('shares tags across more than one course so tag filtering is meaningful', () => {
		const tagCounts = new Map<string, number>();
		for (const course of courseSeedData) {
			for (const tag of course.tags) {
				tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
			}
		}
		expect([...tagCounts.values()].some((count) => count > 1)).toBe(true);
	});
});

describe('createInMemoryCourseReadRepository', () => {
	it('serves the seed catalog with default pagination', async () => {
		const page = await createInMemoryCourseReadRepository().search(defaultCriteria);

		expect(page.totalItems).toBe(courseSeedData.length);
		expect(page.items.length).toBe(DEFAULT_COURSE_PAGE_SIZE);
		expect(page.totalPages).toBe(Math.ceil(courseSeedData.length / DEFAULT_COURSE_PAGE_SIZE));
	});

	it('applies filters supplied in the criteria', async () => {
		const page = await createInMemoryCourseReadRepository().search({ ...defaultCriteria, modality: 'online', status: 'active' });

		expect(page.items.length).toBeGreaterThan(0);
		for (const course of page.items) {
			expect(course.modality).toBe('online');
			expect(course.status).toBe('active');
		}
	});

	it('serves an explicitly supplied catalog instead of the seed data', async () => {
		const repository = createInMemoryCourseReadRepository([
			{ id: 'only', title: 'Only Course', summary: 'The one and only.', modality: 'hybrid', status: 'draft', tags: ['solo'], createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
		]);
		const page = await repository.search(defaultCriteria);

		expect(page.items.map((course) => course.id)).toStrictEqual(['only']);
		expect(page.totalItems).toBe(1);
	});
});
