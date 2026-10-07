import type { CourseSearchCriteria } from '@axc/domain';
import { describe, expect, it } from 'vitest';
import { courseCatalogFixture } from './course-catalog-fixture.ts';
import { buildCourseCatalogFixtureRepository } from './course-catalog-fixture-repository.ts';

const repository = buildCourseCatalogFixtureRepository();

const criteria = (overrides: Partial<CourseSearchCriteria> = {}): CourseSearchCriteria => ({
	keyword: undefined,
	modality: undefined,
	status: undefined,
	tag: undefined,
	page: 1,
	pageSize: 10,
	sort: 'title',
	...overrides,
});

const idsOf = async (overrides: Partial<CourseSearchCriteria> = {}): Promise<string[]> => {
	const matches = await repository.search(criteria(overrides));
	return matches.items.map((course) => course.id);
};

describe('course catalog fixture', () => {
	it('seeds at least twelve courses covering every modality and status', () => {
		expect(courseCatalogFixture.length).toBeGreaterThanOrEqual(12);
		expect(new Set(courseCatalogFixture.map((course) => course.modality))).toStrictEqual(new Set(['online', 'in-person', 'hybrid']));
		expect(new Set(courseCatalogFixture.map((course) => course.status))).toStrictEqual(new Set(['draft', 'active', 'retired']));
		expect(courseCatalogFixture.every((course) => course.tags.length > 0)).toBe(true);
	});
});

describe('course catalog fixture repository', () => {
	it('returns the first page sorted by title with the requested page size', async () => {
		const matches = await repository.search(criteria());

		expect(matches.totalItems).toBe(courseCatalogFixture.length);
		expect(matches.items).toHaveLength(10);
		expect(matches.items.map((course) => course.title).slice(0, 3)).toStrictEqual(['Accessible Frontend Patterns', 'Agentic Harness Engineering', 'AI Security Foundations']);
	});

	it('matches a keyword in the title, the summary, or a tag regardless of case', async () => {
		await expect(idsOf({ keyword: 'security' })).resolves.toStrictEqual(['course-001', 'course-013', 'course-003', 'course-007']);
		await expect(idsOf({ keyword: 'SECURITY' })).resolves.toStrictEqual(['course-001', 'course-013', 'course-003', 'course-007']);
	});

	it('matches a keyword that only appears in the summary', async () => {
		await expect(idsOf({ keyword: 'aggregates' })).resolves.toStrictEqual(['course-004']);
		await expect(idsOf({ keyword: 'legacy workloads' })).resolves.toStrictEqual(['course-014']);
	});

	it('filters by modality', async () => {
		await expect(idsOf({ modality: 'online' })).resolves.toStrictEqual(['course-001', 'course-008', 'course-004', 'course-009', 'course-005', 'course-012']);
		await expect(idsOf({ modality: 'in-person' })).resolves.toHaveLength(4);
		await expect(idsOf({ modality: 'hybrid' })).resolves.toHaveLength(4);
	});

	it('filters by status', async () => {
		await expect(idsOf({ status: 'active' })).resolves.toHaveLength(8);
		await expect(idsOf({ status: 'draft' })).resolves.toStrictEqual(['course-005', 'course-010', 'course-007']);
		await expect(idsOf({ status: 'retired' })).resolves.toStrictEqual(['course-011', 'course-008', 'course-014']);
	});

	it('filters by whole tag regardless of case', async () => {
		await expect(idsOf({ tag: 'ai' })).resolves.toStrictEqual(['course-002', 'course-001', 'course-010']);
		await expect(idsOf({ tag: 'AI' })).resolves.toStrictEqual(['course-002', 'course-001', 'course-010']);
		await expect(idsOf({ tag: 'security' })).resolves.toStrictEqual(['course-001', 'course-013', 'course-003']);
	});

	it('does not treat the tag filter as a substring match', async () => {
		await expect(idsOf({ tag: 'secur' })).resolves.toStrictEqual([]);
	});

	it('combines the keyword, modality, and status filters', async () => {
		await expect(idsOf({ keyword: 'security', modality: 'online', status: 'active' })).resolves.toStrictEqual(['course-001']);
		await expect(idsOf({ keyword: 'security', modality: 'hybrid' })).resolves.toStrictEqual([]);
	});

	it('pages through the catalog without repeating or dropping courses', async () => {
		const firstPage = await repository.search(criteria({ pageSize: 5, page: 1 }));
		const secondPage = await repository.search(criteria({ pageSize: 5, page: 2 }));
		const thirdPage = await repository.search(criteria({ pageSize: 5, page: 3 }));

		expect([firstPage.items.length, secondPage.items.length, thirdPage.items.length]).toStrictEqual([5, 5, 4]);
		expect(firstPage.totalItems).toBe(courseCatalogFixture.length);
		expect(new Set([...firstPage.items, ...secondPage.items, ...thirdPage.items].map((course) => course.id)).size).toBe(courseCatalogFixture.length);
	});

	it('returns an empty page past the end of the catalog', async () => {
		const matches = await repository.search(criteria({ page: 99 }));

		expect(matches.items).toStrictEqual([]);
		expect(matches.totalItems).toBe(courseCatalogFixture.length);
	});

	it('sorts ascending by createdAt and updatedAt', async () => {
		const byCreatedAt = await repository.search(criteria({ sort: 'createdAt', pageSize: 50 }));
		const byUpdatedAt = await repository.search(criteria({ sort: 'updatedAt', pageSize: 50 }));

		expect(byCreatedAt.items.map((course) => course.createdAt)).toStrictEqual([...byCreatedAt.items.map((course) => course.createdAt)].sort());
		expect(byCreatedAt.items[0]?.id).toBe('course-014');
		expect(byUpdatedAt.items.map((course) => course.updatedAt)).toStrictEqual([...byUpdatedAt.items.map((course) => course.updatedAt)].sort());
		expect(byUpdatedAt.items[0]?.id).toBe('course-014');
	});

	it('returns an empty page with a valid total when nothing matches', async () => {
		const matches = await repository.search(criteria({ keyword: 'quantum basket weaving' }));

		expect(matches).toStrictEqual({ items: [], totalItems: 0 });
	});

	it('serves a caller-supplied catalog', async () => {
		const single = courseCatalogFixture.slice(0, 1);
		const matches = await buildCourseCatalogFixtureRepository(single).search(criteria());

		expect(matches).toStrictEqual({ items: single, totalItems: 1 });
	});
});
