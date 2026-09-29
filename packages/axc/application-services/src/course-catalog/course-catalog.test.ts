import { describe, expect, it } from 'vitest';
import type { Course } from './course.ts';
import { courseCatalogFixture } from './course-catalog-fixture.ts';
import { createInMemoryCourseCatalogRepository } from './course-catalog-repository.ts';
import { type CourseSearchOutcome, createCourseCatalogApplicationService } from './course-catalog-service.ts';
import type { CourseSearchResult } from './course-search-criteria.ts';

const service = createCourseCatalogApplicationService(createInMemoryCourseCatalogRepository(courseCatalogFixture));

/** Fails the test with the validation detail rather than a bare undefined access when a query is unexpectedly rejected. */
const succeeds = (outcome: CourseSearchOutcome): CourseSearchResult => {
	if (outcome.status !== 'ok') {
		throw new Error(`expected a successful search, got ${JSON.stringify(outcome.error)}`);
	}
	return outcome.result;
};

const search = async (query: Record<string, string>): Promise<CourseSearchResult> => succeeds(await service.search(query));

const ids = (result: CourseSearchResult): string[] => result.items.map((course) => course.id);

const titles = (result: CourseSearchResult): string[] => result.items.map((course) => course.title);

describe('course catalog fixture', () => {
	it('seeds at least twelve courses with mixed modality, status, and tags', () => {
		expect(courseCatalogFixture.length).toBeGreaterThanOrEqual(12);
		expect(new Set(courseCatalogFixture.map((course) => course.modality))).toStrictEqual(new Set(['online', 'in-person', 'hybrid']));
		expect(new Set(courseCatalogFixture.map((course) => course.status))).toStrictEqual(new Set(['draft', 'active', 'retired']));
		expect(new Set(courseCatalogFixture.flatMap((course) => course.tags)).size).toBeGreaterThan(5);
	});

	it('exposes unique ids and ISO timestamps on every course', () => {
		expect(new Set(courseCatalogFixture.map((course) => course.id)).size).toBe(courseCatalogFixture.length);
		for (const course of courseCatalogFixture) {
			expect(course.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
			expect(course.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
		}
	});
});

describe('course catalog search', () => {
	it('returns the first page sorted by title with the default page size', async () => {
		const result = await search({});

		expect(result.page).toBe(1);
		expect(result.pageSize).toBe(10);
		expect(result.totalItems).toBe(courseCatalogFixture.length);
		expect(result.totalPages).toBe(Math.ceil(courseCatalogFixture.length / 10));
		expect(result.items).toHaveLength(10);
		expect(titles(result)).toStrictEqual([...titles(result)].sort((left, right) => left.toLowerCase().localeCompare(right.toLowerCase())));
	});

	it('matches the keyword against the title case-insensitively', async () => {
		const result = await search({ q: 'KUBERNETES' });

		expect(ids(result)).toStrictEqual(['course-012']);
	});

	it('matches the keyword against the summary case-insensitively', async () => {
		const result = await search({ q: 'stride' });

		expect(ids(result)).toStrictEqual(['course-009']);
	});

	it('matches the keyword against tags case-insensitively', async () => {
		const result = await search({ q: 'FinOps' });

		expect(ids(result)).toStrictEqual(['course-004']);
	});

	it('matches a keyword that appears in title, summary, and tags across different courses', async () => {
		const result = await search({ q: 'security', pageSize: '50' });

		// course-001 by title and tag, course-005 by summary ("Security defects"), course-009 by tag.
		expect(ids(result)).toStrictEqual(['course-001', 'course-005', 'course-009']);
	});

	it('filters by modality', async () => {
		const result = await search({ modality: 'online', pageSize: '50' });

		expect(result.items.length).toBeGreaterThan(0);
		expect(result.items.every((course) => course.modality === 'online')).toBe(true);
		expect(result.totalItems).toBe(result.items.length);
	});

	it('filters by status', async () => {
		const result = await search({ status: 'active', pageSize: '50' });

		expect(result.items.length).toBeGreaterThan(0);
		expect(result.items.every((course) => course.status === 'active')).toBe(true);
	});

	it('filters by tag case-insensitively and on whole tags only', async () => {
		const result = await search({ tag: 'AI', pageSize: '50' });

		expect(ids(result)).toStrictEqual(['course-001', 'course-002', 'course-008', 'course-014']);
		expect(result.items.every((course) => course.tags.includes('ai'))).toBe(true);
	});

	it('does not treat a tag filter as a substring match', async () => {
		const result = await search({ tag: 'secur', pageSize: '50' });

		expect(result.items).toStrictEqual([]);
	});

	it('combines q, modality, and status', async () => {
		const result = await search({ q: 'ai', modality: 'online', status: 'active', pageSize: '50' });

		expect(ids(result)).toStrictEqual(['course-001', 'course-002']);
	});

	it('combines tag and status filters', async () => {
		const result = await search({ tag: 'architecture', status: 'retired', pageSize: '50' });

		expect(ids(result)).toStrictEqual(['course-013']);
	});

	it('paginates without overlapping between pages', async () => {
		const first = await search({ page: '1', pageSize: '5' });
		const second = await search({ page: '2', pageSize: '5' });

		expect(first.items).toHaveLength(5);
		expect(second.items).toHaveLength(5);
		expect(first.pageSize).toBe(5);
		expect(second.page).toBe(2);
		expect(first.totalItems).toBe(courseCatalogFixture.length);
		expect(first.totalPages).toBe(Math.ceil(courseCatalogFixture.length / 5));
		expect(ids(first).some((id) => ids(second).includes(id))).toBe(false);
	});

	it('returns an empty page past the end of the result set', async () => {
		const result = await search({ page: '99', pageSize: '5' });

		expect(result.items).toStrictEqual([]);
		expect(result.page).toBe(99);
		expect(result.totalItems).toBe(courseCatalogFixture.length);
	});

	it('sorts by createdAt ascending', async () => {
		const result = await search({ sort: 'createdAt', pageSize: '50' });

		expect(result.items.map((course) => course.createdAt)).toStrictEqual([...result.items.map((course) => course.createdAt)].sort());
		expect(result.items[0]?.id).toBe('course-001');
	});

	it('sorts by updatedAt ascending', async () => {
		const result = await search({ sort: 'updatedAt', pageSize: '50' });

		expect(result.items.map((course) => course.updatedAt)).toStrictEqual([...result.items.map((course) => course.updatedAt)].sort());
	});

	it('returns an empty page with valid metadata when nothing matches', async () => {
		const result = await search({ q: 'underwater basket weaving' });

		expect(result.items).toStrictEqual([]);
		expect(result.totalItems).toBe(0);
		expect(result.totalPages).toBe(0);
		expect(result.page).toBe(1);
		expect(result.pageSize).toBe(10);
	});

	it('returns the invalid query envelope instead of a result when validation fails', async () => {
		const outcome = await service.search({ modality: 'virtual', pageSize: '500' });

		expect(outcome.status).toBe('invalid');
		if (outcome.status !== 'invalid') {
			return;
		}
		expect(outcome.error.error.code).toBe('INVALID_QUERY_PARAMETER');
		expect(outcome.error.error.details.map((detail) => detail.field)).toStrictEqual(['modality', 'pageSize']);
	});

	it('is isolated from later mutation of the seed array', async () => {
		const seed: Course[] = [...courseCatalogFixture];
		const isolated = createCourseCatalogApplicationService(createInMemoryCourseCatalogRepository(seed));
		seed.length = 0;

		expect(succeeds(await isolated.search({ pageSize: '50' })).totalItems).toBe(courseCatalogFixture.length);
	});
});
