import { type Course, type CourseReadRepository, queryCourseCatalog } from '@axc/domain';
import { describe, expect, it } from 'vitest';
import { buildCourseSearchApplicationService } from './course-search-application-service.ts';

const courses: readonly Course[] = [
	{ id: 'c-1', title: 'Beta Security Basics', summary: 'Foundational material.', modality: 'online', status: 'active', tags: ['security'], createdAt: '2026-03-01T00:00:00.000Z', updatedAt: '2026-05-01T00:00:00.000Z' },
	{ id: 'c-2', title: 'Alpha Workshop', summary: 'Covers security reviews.', modality: 'in-person', status: 'draft', tags: ['workshop'], createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-06-01T00:00:00.000Z' },
	{ id: 'c-3', title: 'Gamma Design', summary: 'Interface composition.', modality: 'online', status: 'active', tags: ['design'], createdAt: '2026-02-01T00:00:00.000Z', updatedAt: '2026-04-01T00:00:00.000Z' },
];

const repository: CourseReadRepository = { search: (criteria) => Promise.resolve(queryCourseCatalog(courses, criteria)) };
const service = buildCourseSearchApplicationService(repository);

describe('buildCourseSearchApplicationService', () => {
	it('returns the default page for an empty query', async () => {
		const outcome = await service.search({});

		expect(outcome.ok).toBe(true);
		if (!outcome.ok) {
			return;
		}
		expect(outcome.result.items.map((course) => course.id)).toStrictEqual(['c-2', 'c-1', 'c-3']);
		expect(outcome.result.page).toBe(1);
		expect(outcome.result.pageSize).toBe(10);
		expect(outcome.result.totalItems).toBe(3);
		expect(outcome.result.totalPages).toBe(1);
	});

	it('passes validated filters, pagination, and sorting through to the repository', async () => {
		const outcome = await service.search({ q: 'security', status: 'active', page: '1', pageSize: '1', sort: 'createdAt' });

		expect(outcome.ok).toBe(true);
		if (!outcome.ok) {
			return;
		}
		expect(outcome.result.items.map((course) => course.id)).toStrictEqual(['c-1']);
		expect(outcome.result.totalItems).toBe(1);
	});

	it('returns validation errors without consulting the repository', async () => {
		let consulted = false;
		const spyService = buildCourseSearchApplicationService({
			search: (criteria) => {
				consulted = true;
				return Promise.resolve(queryCourseCatalog(courses, criteria));
			},
		});

		const outcome = await spyService.search({ modality: 'remote' });

		expect(consulted).toBe(false);
		expect(outcome.ok).toBe(false);
		if (outcome.ok) {
			return;
		}
		expect(outcome.errors).toStrictEqual([{ field: 'modality', message: 'modality must be one of online, in-person, hybrid.' }]);
	});

	it('reports a successful empty page when nothing matches', async () => {
		const outcome = await service.search({ q: 'nothing matches this' });

		expect(outcome.ok).toBe(true);
		if (!outcome.ok) {
			return;
		}
		expect(outcome.result.items).toStrictEqual([]);
		expect(outcome.result.totalItems).toBe(0);
		expect(outcome.result.totalPages).toBe(0);
	});
});
