import type { CourseSearchCriteria } from '@axc/domain';
import { describe, expect, it } from 'vitest';
import { courseFixture } from './course-fixture.ts';
import { createInMemoryCourseRepository } from './course-repository.ts';

const repository = createInMemoryCourseRepository();
const criteria = (overrides: Partial<CourseSearchCriteria> = {}): CourseSearchCriteria => ({ page: 1, pageSize: 10, sort: 'title', ...overrides });

describe('in-memory course repository', () => {
	it('ships at least 12 fixture courses with mixed modality, status and tags', () => {
		expect(courseFixture.length).toBeGreaterThanOrEqual(12);
		expect(new Set(courseFixture.map((course) => course.modality))).toStrictEqual(new Set(['online', 'in-person', 'hybrid']));
		expect(new Set(courseFixture.map((course) => course.status))).toStrictEqual(new Set(['draft', 'active', 'retired']));
		expect(new Set(courseFixture.flatMap((course) => course.tags)).size).toBeGreaterThan(5);
	});

	it('paginates the matches and reports the unpaginated total', async () => {
		const page = await repository.search(criteria({ pageSize: 5, page: 2 }));
		expect(page.items).toHaveLength(5);
		expect(page.totalItems).toBe(courseFixture.length);
		expect(page.items[0]?.id).toBe('course-006');
	});

	it('sorts by the requested field', async () => {
		const byCreatedAt = await repository.search(criteria({ sort: 'createdAt', pageSize: 50 }));
		const created = byCreatedAt.items.map((course) => course.createdAt);
		expect([...created].sort()).toStrictEqual(created);
	});

	it('applies filters before pagination', async () => {
		const page = await repository.search(criteria({ modality: 'online', status: 'active' }));
		expect(page.items.map((course) => course.id)).toStrictEqual(['course-001', 'course-002', 'course-011']);
		expect(page.totalItems).toBe(3);
	});

	it('returns an empty page when nothing matches', async () => {
		const page = await repository.search(criteria({ q: 'underwater basket weaving' }));
		expect(page.items).toStrictEqual([]);
		expect(page.totalItems).toBe(0);
	});
});
