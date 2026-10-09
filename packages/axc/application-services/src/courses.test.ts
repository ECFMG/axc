import type { Course, CourseCatalogRepository } from '@axc/domain';
import { describe, expect, it } from 'vitest';
import { parseCourseQuery, searchCourses } from './courses.ts';

const first: Course = { id: 'a', title: 'Same title', summary: 'A searchable summary', modality: 'online', status: 'active', tags: ['AI'], createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-02-01T00:00:00.000Z' };
const second: Course = { ...first, id: 'b' };
const repository: CourseCatalogRepository = { list: () => Promise.resolve([second, first]) };

describe('course search application service', () => {
	it.each(['title', 'createdAt', 'updatedAt'])('breaks %s sort ties by id and paginates afterwards', async (sort) => {
		const { query, details } = parseCourseQuery({ sort: [sort], page: ['2'], pageSize: ['1'] });
		expect(details).toEqual([]);
		expect(await searchCourses(repository, query)).toEqual({ items: [second], page: 2, pageSize: 1, totalItems: 2, totalPages: 2 });
		expect(await repository.list()).toEqual([second, first]);
	});

	it('handles an empty repository', async () => {
		const { query } = parseCourseQuery({});
		expect(await searchCourses({ list: () => Promise.resolve([]) }, query)).toEqual({ items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 0 });
	});
});
