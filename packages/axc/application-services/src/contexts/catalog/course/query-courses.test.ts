import type { Domain } from '@axc/domain';
import { describe, expect, it, vi } from 'vitest';
import { queryCourses } from './query-courses.ts';

type Query = Domain.Contexts.Catalog.Course.CourseSearchQuery;
const setup = () => {
	const search = vi.fn().mockResolvedValue({ items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 0 });
	return { search, query: queryCourses({ readonlyDataSource: { Catalog: { Course: { CourseReadRepo: { search } } } } }) };
};
describe('queryCourses', () => {
	it('delegates valid searches to the injected read repository', async () => {
		const { search, query } = setup();
		const input: Query = { q: 'security', page: 1, pageSize: 10, sort: 'title' };
		expect(await query(input)).toMatchObject({ items: [], totalItems: 0 });
		expect(search).toHaveBeenCalledExactlyOnceWith(input);
	});
	it.each([
		{ page: 0 },
		{ pageSize: 51 },
		{ page: Infinity },
		{ sort: 'invalid' },
		{ modality: 'remote' },
		{ status: 'missing' },
		{ tag: '' },
		{ q: ' ' },
	])('rejects invalid service input %j without repository access', async (patch) => {
		const { search, query } = setup();
		await expect(query({ page: 1, pageSize: 10, sort: 'title', ...patch } as Query)).rejects.toThrow(RangeError);
		expect(search).not.toHaveBeenCalled();
	});
});
