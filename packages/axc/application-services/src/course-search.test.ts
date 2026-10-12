import { describe, expect, it } from 'vitest';
import { parseCourseSearchCriteria } from './course-search.ts';
import type { ServiceError } from './errors.ts';
import { buildApplicationServicesFactory } from './index.ts';

const services = () => buildApplicationServicesFactory({ environment: 'test' }).forRequest();

const failure = (query: Record<string, string>): ServiceError => {
	try {
		parseCourseSearchCriteria(query);
	} catch (error) {
		return error as ServiceError;
	}
	throw new Error('expected parseCourseSearchCriteria to throw');
};

describe('course search query parsing', () => {
	it('defaults page, pageSize and sort', () => {
		expect(parseCourseSearchCriteria({})).toEqual({ page: 1, pageSize: 10, sort: 'title' });
	});

	it('keeps supplied filters and ignores blank values', () => {
		expect(parseCourseSearchCriteria({ q: 'security', modality: 'online', status: 'active', tag: 'ai', page: '2', pageSize: '5', sort: 'createdAt' })).toEqual({
			q: 'security',
			modality: 'online',
			status: 'active',
			tag: 'ai',
			page: 2,
			pageSize: 5,
			sort: 'createdAt',
		});
		expect(parseCourseSearchCriteria({ tag: '  ' })).toEqual({ page: 1, pageSize: 10, sort: 'title' });
	});

	it('rejects invalid enums, pages and page sizes', () => {
		for (const query of [{ modality: 'telepathic' }, { status: 'archived' }, { sort: 'id' }, { page: '0' }, { page: 'two' }, { pageSize: '51' }]) {
			const error = failure(query);
			expect(error.code).toBe('INVALID_QUERY_PARAMETER');
			expect(error.status).toBe(400);
			expect(error.details).toHaveLength(1);
		}
	});

	it('reports every invalid parameter at once', () => {
		expect(failure({ modality: 'telepathic', pageSize: '500' }).details.map((detail) => detail.field)).toEqual(['pageSize', 'modality']);
	});
});

describe('course search service', () => {
	it('returns a paginated catalog page', async () => {
		const page = await (await services()).courses.search({ page: '1', pageSize: '5' });
		expect(page.items).toHaveLength(5);
		expect(page).toMatchObject({ page: 1, pageSize: 5, totalItems: 14, totalPages: 3 });
	});

	it('combines keyword, modality and status filters', async () => {
		const page = await (await services()).courses.search({ q: 'security', modality: 'online', status: 'active' });
		expect(page.items.map((course) => course.id)).toEqual(['course-001', 'course-014']);
	});

	it('returns an empty page rather than an error when nothing matches', async () => {
		const page = await (await services()).courses.search({ q: 'quidditch' });
		expect(page).toMatchObject({ items: [], totalItems: 0, totalPages: 0 });
	});
});
