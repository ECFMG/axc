import { COURSE_MODALITIES, COURSE_STATUSES, type Course, type CourseSearchCriteria, type CourseSearchResult, DEFAULT_COURSE_PAGE, DEFAULT_COURSE_PAGE_SIZE, DEFAULT_COURSE_SORT_FIELD } from '@axc/domain';
import { describe, expect, it } from 'vitest';
import { COURSE_CATALOG_SEED } from './course-seed.ts';
import { createInMemoryCourseReadRepository } from './in-memory-course-read-repository.ts';

const repository = createInMemoryCourseReadRepository();

const criteria = (overrides: Partial<CourseSearchCriteria> = {}): CourseSearchCriteria => ({
	page: DEFAULT_COURSE_PAGE,
	pageSize: DEFAULT_COURSE_PAGE_SIZE,
	sort: DEFAULT_COURSE_SORT_FIELD,
	...overrides,
});

const idsOf = (result: CourseSearchResult) => result.items.map((course) => course.id);

describe('COURSE_CATALOG_SEED', () => {
	it('provides at least twelve courses with unique ids', () => {
		expect(COURSE_CATALOG_SEED.length).toBeGreaterThanOrEqual(12);
		expect(new Set(COURSE_CATALOG_SEED.map((course) => course.id)).size).toBe(COURSE_CATALOG_SEED.length);
	});

	it('covers every modality and every status', () => {
		const modalities = new Set(COURSE_CATALOG_SEED.map((course) => course.modality));
		const statuses = new Set(COURSE_CATALOG_SEED.map((course) => course.status));

		expect([...COURSE_MODALITIES].every((modality) => modalities.has(modality))).toBe(true);
		expect([...COURSE_STATUSES].every((status) => statuses.has(status))).toBe(true);
	});

	it('gives every course tags and parseable ISO-8601 timestamps', () => {
		for (const course of COURSE_CATALOG_SEED) {
			expect(course.tags.length).toBeGreaterThan(0);
			expect(Number.isNaN(Date.parse(course.createdAt))).toBe(false);
			expect(Number.isNaN(Date.parse(course.updatedAt))).toBe(false);
		}
	});

	it('reuses tags across courses so tag filtering is meaningful', () => {
		const tagCounts = new Map<string, number>();
		for (const course of COURSE_CATALOG_SEED) {
			for (const tag of course.tags) {
				const key = tag.toLowerCase();
				tagCounts.set(key, (tagCounts.get(key) ?? 0) + 1);
			}
		}

		expect(tagCounts.get('security')).toBeGreaterThan(1);
		expect(tagCounts.get('ai')).toBeGreaterThan(1);
	});
});

describe('createInMemoryCourseReadRepository', () => {
	it('returns the first page of the seed ordered by title', async () => {
		const result = await repository.search(criteria());

		expect(result.items).toHaveLength(DEFAULT_COURSE_PAGE_SIZE);
		expect(result.page).toBe(1);
		expect(result.pageSize).toBe(10);
		expect(result.totalItems).toBe(COURSE_CATALOG_SEED.length);
		expect(result.totalPages).toBe(Math.ceil(COURSE_CATALOG_SEED.length / DEFAULT_COURSE_PAGE_SIZE));
		expect(idsOf(result).slice(0, 3)).toStrictEqual(['course-009', 'course-004', 'course-001']);
	});

	it('finds seeded courses by keyword across title, summary, and tags', async () => {
		const result = await repository.search(criteria({ keyword: 'SECURITY', pageSize: 50 }));

		// course-001 by title, course-010 by summary, and course-014 by its mixed-case tag.
		expect(idsOf(result)).toContain('course-001');
		expect(idsOf(result)).toContain('course-010');
		expect(idsOf(result)).toContain('course-014');
		expect(result.totalItems).toBe(6);
	});

	it('filters the seed by modality, status, and tag', async () => {
		const online = await repository.search(criteria({ modality: 'online', pageSize: 50 }));
		const retired = await repository.search(criteria({ status: 'retired', pageSize: 50 }));
		const tagged = await repository.search(criteria({ tag: 'ai', pageSize: 50 }));

		expect(online.items.every((course) => course.modality === 'online')).toBe(true);
		expect(online.totalItems).toBe(6);
		expect(retired.items.every((course) => course.status === 'retired')).toBe(true);
		expect(retired.totalItems).toBe(3);
		expect(idsOf(tagged)).toStrictEqual(['course-004', 'course-001', 'course-003']);
	});

	it('combines keyword, modality, and status filters', async () => {
		const result = await repository.search(criteria({ keyword: 'security', modality: 'online', status: 'active', pageSize: 50 }));

		expect(idsOf(result)).toStrictEqual(['course-001']);
	});

	it('pages through the whole seed without repeating or dropping a course', async () => {
		const first = await repository.search(criteria({ page: 1, pageSize: 5 }));
		const second = await repository.search(criteria({ page: 2, pageSize: 5 }));
		const third = await repository.search(criteria({ page: 3, pageSize: 5 }));

		expect(first.items).toHaveLength(5);
		expect(second.items).toHaveLength(5);
		expect(third.items).toHaveLength(COURSE_CATALOG_SEED.length - 10);
		expect(new Set([...idsOf(first), ...idsOf(second), ...idsOf(third)]).size).toBe(COURSE_CATALOG_SEED.length);
		expect(third.totalPages).toBe(3);
	});

	it('sorts the seed ascending by createdAt', async () => {
		const result = await repository.search(criteria({ sort: 'createdAt', pageSize: 50 }));
		const timestamps = result.items.map((course) => Date.parse(course.createdAt));

		expect(timestamps).toStrictEqual([...timestamps].sort((left, right) => left - right));
		expect(result.items[0]?.id).toBe('course-007');
	});

	it('returns an empty page with valid metadata when nothing matches', async () => {
		const result = await repository.search(criteria({ keyword: 'underwater basket weaving' }));

		expect(result.items).toStrictEqual([]);
		expect(result.totalItems).toBe(0);
		expect(result.totalPages).toBe(0);
		expect(result.page).toBe(1);
		expect(result.pageSize).toBe(10);
	});

	it('serves an explicitly supplied catalog and is unaffected by later mutation of it', async () => {
		const supplied: Course[] = [{ id: 'only', title: 'Only Course', summary: 'Sole entry.', modality: 'hybrid', status: 'draft', tags: ['solo'], createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-02T00:00:00.000Z' }];
		const scoped = createInMemoryCourseReadRepository(supplied);

		supplied.push({ id: 'late', title: 'Added Later', summary: 'Should not appear.', modality: 'online', status: 'draft', tags: ['late'], createdAt: '2026-02-01T00:00:00.000Z', updatedAt: '2026-02-01T00:00:00.000Z' });

		expect(idsOf(await scoped.search(criteria()))).toStrictEqual(['only']);
	});
});
