import { describe, expect, it, vi } from 'vitest';
import { queryCourses } from './query-courses.ts';

describe('queryCourses', () => {
	it('passes typed criteria to the repository and returns its result unchanged', async () => {
		const result = { items: [], page: 3, pageSize: 5, totalItems: 0, totalPages: 0 };
		const search = vi.fn().mockResolvedValue(result);
		const criteria = { q: 'security', modality: 'online', status: 'active', tag: 'ai', page: 3, pageSize: 5, sort: 'updatedAt' } as const;
		expect(await queryCourses({ readonlyDataSource: { Catalog: { Course: { CourseReadRepo: { search } } } } })(criteria)).toBe(result);
		expect(search).toHaveBeenCalledExactlyOnceWith(criteria);
	});
	it('propagates repository failures', async () => {
		const search = vi.fn().mockRejectedValue(new Error('unavailable'));
		await expect(queryCourses({ readonlyDataSource: { Catalog: { Course: { CourseReadRepo: { search } } } } })({ page: 1, pageSize: 10, sort: 'title' })).rejects.toThrow('unavailable');
	});
});
