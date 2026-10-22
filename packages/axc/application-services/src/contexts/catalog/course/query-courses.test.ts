import type { CourseReadModel, CourseSearchCriteria, DataSources } from '@axc/persistence';
import { describe, expect, it } from 'vitest';
import { queryCourses } from './query-courses.ts';

function dataSourcesReturning(items: CourseReadModel[], totalItems: number, calls: CourseSearchCriteria[]): DataSources {
	const CourseReadRepo = {
		search: (criteria: CourseSearchCriteria) => {
			calls.push(criteria);
			return Promise.resolve({ items, totalItems });
		},
	};
	return { readonlyDataSource: { Catalog: { Course: { CourseReadRepo } } } } as unknown as DataSources;
}

describe('queryCourses', () => {
	it('B-AC1 passes the criteria to the read repository and returns ISO dates with page metadata', async () => {
		const calls: CourseSearchCriteria[] = [];
		const course: CourseReadModel = {
			id: '650000000000000000000001',
			title: 'AI Security Foundations',
			summary: 'Introductory course on secure AI-assisted development.',
			modality: 'online',
			status: 'active',
			tags: ['ai', 'security'],
			createdAt: new Date('2026-01-15T00:00:00Z'),
			updatedAt: new Date('2026-06-01T00:00:00Z'),
		};
		const command = { q: 'security', modality: 'online' as const, status: 'active' as const, tag: 'ai', page: 2, pageSize: 5, sort: 'createdAt' as const };

		const page = await queryCourses(dataSourcesReturning([course], 11, calls))(command);

		expect(calls).toStrictEqual([command]);
		expect(page).toStrictEqual({
			items: [{ ...course, createdAt: '2026-01-15T00:00:00.000Z', updatedAt: '2026-06-01T00:00:00.000Z' }],
			page: 2,
			pageSize: 5,
			totalItems: 11,
			totalPages: 3,
		});
	});

	it('B-AC1 reports zero pages when nothing matches', async () => {
		const page = await queryCourses(dataSourcesReturning([], 0, []))({ page: 1, pageSize: 10, sort: 'title' });
		expect(page).toStrictEqual({ items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 0 });
	});
});
