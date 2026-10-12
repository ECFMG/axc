import { type AxcDomainError, DEFAULT_COURSE_PAGE_SIZE } from '@axc/domain';
import { createInMemoryCourseRepository, SEED_COURSES } from '@axc/persistence';
import { describe, expect, it } from 'vitest';
import { createCourseSearchService } from './course-search-service.ts';

const service = () => createCourseSearchService(createInMemoryCourseRepository());

describe('createCourseSearchService', () => {
	it('returns the first page of the catalog with default pagination', async () => {
		const result = await service().search({});

		expect(result.items).toHaveLength(DEFAULT_COURSE_PAGE_SIZE);
		expect(result).toMatchObject({ page: 1, pageSize: DEFAULT_COURSE_PAGE_SIZE, totalItems: SEED_COURSES.length });
		expect(result.totalPages).toBe(Math.ceil(SEED_COURSES.length / DEFAULT_COURSE_PAGE_SIZE));
	});

	it('applies keyword, modality, and status filters together', async () => {
		const result = await service().search({ q: 'security', modality: 'online', status: 'active' });

		expect(result.items.map((course) => course.id)).toStrictEqual(['course-001']);
	});

	it('propagates query validation failures as INVALID_QUERY_PARAMETER', async () => {
		await expect(service().search({ pageSize: '500' })).rejects.toMatchObject({ code: 'INVALID_QUERY_PARAMETER' } satisfies Partial<AxcDomainError>);
	});
});
