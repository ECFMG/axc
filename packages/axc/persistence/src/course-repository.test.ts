import type { CourseSearchCriteria } from '@axc/domain';
import { describe, expect, it } from 'vitest';
import { InMemoryCourseRepository } from './course-repository.ts';

const repository = new InMemoryCourseRepository();
const criteria = (overrides: Partial<CourseSearchCriteria> = {}): CourseSearchCriteria => ({ page: 1, pageSize: 10, sort: 'title', ...overrides });

describe('in-memory course repository', () => {
	it('paginates with the supplied page and page size', async () => {
		const page = await repository.search(criteria({ page: 2, pageSize: 5 }));
		expect(page.items).toHaveLength(5);
		expect(page.page).toBe(2);
		expect(page.totalItems).toBe(14);
		expect(page.totalPages).toBe(3);
	});

	it('filters by modality, status and tag together', async () => {
		const page = await repository.search(criteria({ modality: 'online', status: 'active', tag: 'ai' }));
		expect(page.items.map((course) => course.id)).toEqual(['course-001', 'course-013']);
	});

	it('searches keywords case-insensitively', async () => {
		const page = await repository.search(criteria({ q: 'SECURITY' }));
		expect(page.totalItems).toBeGreaterThan(1);
		expect(page.items.every((course) => `${course.title} ${course.summary} ${course.tags.join(' ')}`.toLowerCase().includes('security'))).toBe(true);
	});

	it('sorts by the requested field', async () => {
		const page = await repository.search(criteria({ sort: 'createdAt', pageSize: 50 }));
		const dates = page.items.map((course) => course.createdAt);
		expect(dates).toEqual([...dates].sort());
	});

	it('returns an empty page when nothing matches', async () => {
		const page = await repository.search(criteria({ q: 'underwater basket weaving' }));
		expect(page).toMatchObject({ items: [], totalItems: 0, totalPages: 0, page: 1, pageSize: 10 });
	});

	it('looks a course up by id', async () => {
		expect(await repository.getById('course-002')).toMatchObject({ title: 'Applied Threat Modeling' });
		expect(await repository.getById('course-999')).toBeUndefined();
	});
});
