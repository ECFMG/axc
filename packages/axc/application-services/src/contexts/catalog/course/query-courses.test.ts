import { Persistence } from '@axc/persistence';
import { describe, expect, it } from 'vitest';
import { type CourseSearchQuery, InvalidQueryParameterError, queryCourses } from './query-courses.ts';

function search() {
	return queryCourses(Persistence());
}

function emptyQuery(): CourseSearchQuery {
	return {
		q: undefined,
		modality: undefined,
		status: undefined,
		tag: undefined,
		page: undefined,
		pageSize: undefined,
		sort: undefined,
	};
}

describe('queryCourses', () => {
	it('returns a paginated catalog using default page, page size, and title sort', async () => {
		const result = await search()(emptyQuery());

		expect(result.page).toBe(1);
		expect(result.pageSize).toBe(10);
		expect(result.totalItems).toBeGreaterThanOrEqual(12);
		expect(result.items).toHaveLength(10);
		expect(result.totalPages).toBe(Math.ceil(result.totalItems / result.pageSize));

		const titles = result.items.map((course) => course.title);
		expect(titles).toStrictEqual([...titles].sort((left, right) => left.localeCompare(right)));
	});

	it('matches keywords case-insensitively across title, summary, and tags', async () => {
		const result = await search()({
			...emptyQuery(),
			q: 'SECURITY',
			pageSize: '50',
		});

		expect(result.items.length).toBeGreaterThan(0);
		expect(
			result.items.every((course) => {
				const needle = 'security';
				return course.title.toLowerCase().includes(needle) || course.summary.toLowerCase().includes(needle) || course.tags.some((tag) => tag.toLowerCase().includes(needle));
			}),
		).toBe(true);

		expect(result.items.some((course) => course.title.toLowerCase().includes('security'))).toBe(true);
		expect(result.items.some((course) => !course.title.toLowerCase().includes('security') && course.summary.toLowerCase().includes('security'))).toBe(true);
		expect(result.items.some((course) => !course.title.toLowerCase().includes('security') && !course.summary.toLowerCase().includes('security') && course.tags.some((tag) => tag.toLowerCase().includes('security')))).toBe(true);
	});

	it('filters by modality, status, and tag', async () => {
		const byModality = await search()({ ...emptyQuery(), modality: 'online', pageSize: '50' });
		expect(byModality.items.length).toBeGreaterThan(0);
		expect(byModality.items.every((course) => course.modality === 'online')).toBe(true);

		const byStatus = await search()({ ...emptyQuery(), status: 'active', pageSize: '50' });
		expect(byStatus.items.length).toBeGreaterThan(0);
		expect(byStatus.items.every((course) => course.status === 'active')).toBe(true);

		const byTag = await search()({ ...emptyQuery(), tag: 'AI', pageSize: '50' });
		expect(byTag.items.length).toBeGreaterThan(0);
		expect(byTag.items.every((course) => course.tags.some((tag) => tag.toLowerCase() === 'ai'))).toBe(true);
	});

	it('applies combined keyword, modality, and status filters', async () => {
		const result = await search()({
			...emptyQuery(),
			q: 'security',
			modality: 'online',
			status: 'active',
			pageSize: '50',
		});

		expect(result.items.length).toBeGreaterThan(0);
		expect(
			result.items.every((course) => {
				const matchesKeyword = course.title.toLowerCase().includes('security') || course.summary.toLowerCase().includes('security') || course.tags.some((tag) => tag.toLowerCase().includes('security'));
				return matchesKeyword && course.modality === 'online' && course.status === 'active';
			}),
		).toBe(true);
	});

	it('paginates with the requested page and page size', async () => {
		const firstPage = await search()({ ...emptyQuery(), page: '1', pageSize: '5', sort: 'title' });
		const secondPage = await search()({ ...emptyQuery(), page: '2', pageSize: '5', sort: 'title' });

		expect(firstPage.items).toHaveLength(5);
		expect(firstPage.page).toBe(1);
		expect(firstPage.pageSize).toBe(5);
		expect(firstPage.totalPages).toBe(Math.ceil(firstPage.totalItems / 5));
		expect(secondPage.items).toHaveLength(5);
		expect(firstPage.items.map((course) => course.id)).not.toEqual(secondPage.items.map((course) => course.id));
	});

	it('sorts by createdAt', async () => {
		const result = await search()({ ...emptyQuery(), sort: 'createdAt', pageSize: '50' });
		const createdAt = result.items.map((course) => course.createdAt);
		expect(createdAt).toStrictEqual([...createdAt].sort((left, right) => left.localeCompare(right)));
	});

	it('sorts by updatedAt', async () => {
		const result = await search()({ ...emptyQuery(), sort: 'updatedAt', pageSize: '50' });
		const updatedAt = result.items.map((course) => course.updatedAt);
		expect(updatedAt).toStrictEqual([...updatedAt].sort((left, right) => left.localeCompare(right)));
	});

	it('rejects invalid query parameters', async () => {
		const invalidCases: Array<{ field: string; query: CourseSearchQuery }> = [
			{ field: 'modality', query: { ...emptyQuery(), modality: 'correspondence' } },
			{ field: 'status', query: { ...emptyQuery(), status: 'archived' } },
			{ field: 'page', query: { ...emptyQuery(), page: '0' } },
			{ field: 'pageSize', query: { ...emptyQuery(), pageSize: '51' } },
			{ field: 'sort', query: { ...emptyQuery(), sort: 'popularity' } },
		];

		for (const invalidCase of invalidCases) {
			await expect(search()(invalidCase.query)).rejects.toSatisfy((error: unknown) => {
				expect(error).toBeInstanceOf(InvalidQueryParameterError);
				if (!(error instanceof InvalidQueryParameterError)) {
					return false;
				}
				expect(error.code).toBe('INVALID_QUERY_PARAMETER');
				expect(error.message).toBe('One or more query parameters are invalid.');
				expect(error.details.some((detail) => detail.field === invalidCase.field && detail.message.length > 0)).toBe(true);
				return true;
			});
		}
	});

	it('returns an empty page when nothing matches', async () => {
		const result = await search()({ ...emptyQuery(), q: 'zzz-no-such-course' });

		expect(result.items).toStrictEqual([]);
		expect(result.page).toBe(1);
		expect(result.pageSize).toBe(10);
		expect(result.totalItems).toBe(0);
		expect(result.totalPages).toBe(0);
	});
});
