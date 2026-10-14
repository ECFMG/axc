import type { DataSources } from '@axc/persistence';
import { describe, expect, it } from 'vitest';
import { type CourseSearchQuery, InvalidQueryParameterError, querySearch } from './query-search.ts';

const course = {
	id: 'course-001',
	title: 'AI Security Foundations',
	summary: 'Introductory course on secure AI-assisted development.',
	modality: 'online' as const,
	status: 'active' as const,
	tags: ['ai', 'security'],
	createdAt: '2026-01-15T00:00:00.000Z',
	updatedAt: '2026-06-01T00:00:00.000Z',
};

function dataSourcesWith(search: DataSources['readonlyDataSource']['Catalog']['Course']['CourseReadRepo']['search']): DataSources {
	return {
		readonlyDataSource: {
			Catalog: {
				Course: {
					CourseReadRepo: { search },
				},
			},
		},
	};
}

const emptyQuery: CourseSearchQuery = {
	q: undefined,
	modality: undefined,
	status: undefined,
	tag: undefined,
	page: undefined,
	pageSize: undefined,
	sort: undefined,
};

describe('querySearch', () => {
	it('applies defaults and asks the read repository to search', async () => {
		const search = (criteria: unknown) => {
			expect(criteria).toEqual({
				q: undefined,
				modality: undefined,
				status: undefined,
				tag: undefined,
				page: 1,
				pageSize: 10,
				sort: 'title',
			});
			return Promise.resolve({ items: [course], totalItems: 12 });
		};

		const result = await querySearch(dataSourcesWith(search))(emptyQuery);

		expect(result).toEqual({
			items: [course],
			page: 1,
			pageSize: 10,
			totalItems: 12,
			totalPages: 2,
		});
	});

	it('treats blank q and tag as unset', async () => {
		const search = (criteria: { q: string | undefined; tag: string | undefined }) => {
			expect(criteria.q).toBeUndefined();
			expect(criteria.tag).toBeUndefined();
			return Promise.resolve({ items: [], totalItems: 0 });
		};

		const result = await querySearch(dataSourcesWith(search))({
			...emptyQuery,
			q: '   ',
			tag: '',
		});

		expect(result.totalPages).toBe(0);
	});

	it('collects every invalid query parameter', async () => {
		const search = () => {
			throw new Error('search should not run');
		};

		try {
			await querySearch(dataSourcesWith(search))({
				q: 'security',
				modality: '',
				status: 'archived',
				tag: 'ai',
				page: '0',
				pageSize: '51',
				sort: 'popularity',
			});
			throw new Error('expected InvalidQueryParameterError');
		} catch (error) {
			expect(error).toBeInstanceOf(InvalidQueryParameterError);
			const invalid = error as InvalidQueryParameterError;
			expect(invalid.code).toBe('INVALID_QUERY_PARAMETER');
			expect(invalid.message).toBe('One or more query parameters are invalid.');
			expect(invalid.details.map((detail) => detail.field)).toEqual(['modality', 'status', 'page', 'pageSize', 'sort']);
		}
	});
});
