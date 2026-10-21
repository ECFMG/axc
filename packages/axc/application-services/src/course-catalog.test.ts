import { InMemoryCourseCatalogRepository } from '@axc/persistence';
import { describe, expect, it } from 'vitest';
import { type CourseSearchQuery, type CourseSearchResult, createCourseCatalogService } from './course-catalog.ts';
import { buildApplicationServicesFactory } from './index.ts';

const service = createCourseCatalogService(new InMemoryCourseCatalogRepository());

type Params = Readonly<Record<string, string | readonly string[]>>;

const search = (params: Params = {}): Promise<CourseSearchResult> => {
	const query: CourseSearchQuery = Object.fromEntries(Object.entries(params).map(([key, value]) => [key, typeof value === 'string' ? [value] : value]));
	return service.search(query);
};

async function page(params: Params = {}) {
	const result = await search(params);
	if (!result.ok) {
		throw new Error(`expected success, got ${JSON.stringify(result.error)}`);
	}
	return result.value;
}

async function failure(params: Params) {
	const result = await search(params);
	if (result.ok) {
		throw new Error('expected a validation failure');
	}
	return result.error;
}

describe('course catalog search', () => {
	it('is exposed on the application services', async () => {
		const services = await buildApplicationServicesFactory({ environment: 'test', courseCatalog: new InMemoryCourseCatalogRepository() }).forRequest();
		const result = await services.courses.search({});
		expect(result.ok).toBe(true);
	});

	it('returns the first page of 10 courses sorted by title by default', async () => {
		const result = await page();
		expect(result.page).toBe(1);
		expect(result.pageSize).toBe(10);
		expect(result.totalItems).toBe(14);
		expect(result.totalPages).toBe(2);
		expect(result.items).toHaveLength(10);
		const titles = result.items.map((course) => course.title);
		expect(titles).toEqual([...titles].sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' })));
		expect(Object.keys(result.items[0] ?? {}).sort()).toEqual(['createdAt', 'id', 'modality', 'status', 'summary', 'tags', 'title', 'updatedAt']);
	});

	it('matches q case-insensitively against title, summary, and tags', async () => {
		const result = await page({ q: 'SeCuRiTy', pageSize: '50' });
		const ids = result.items.map((course) => course.id).sort();
		// title: 001 · summary only ("SECURITY"): 006 · tags only ("Security"/"security"): 003, 009, 011, 014
		expect(ids).toEqual(['course-001', 'course-003', 'course-006', 'course-009', 'course-011', 'course-014']);
	});

	it('trims surrounding whitespace from q', async () => {
		expect((await page({ q: '  prompt  ' })).items.map((course) => course.id)).toEqual(['course-002']);
	});

	it.each(['online', 'in-person', 'hybrid'] as const)('filters by modality %s', async (modality) => {
		const result = await page({ modality, pageSize: '50' });
		expect(result.items.length).toBeGreaterThan(0);
		expect(result.items.every((course) => course.modality === modality)).toBe(true);
	});

	it.each(['draft', 'active', 'retired'] as const)('filters by status %s', async (status) => {
		const result = await page({ status, pageSize: '50' });
		expect(result.items.length).toBeGreaterThan(0);
		expect(result.items.every((course) => course.status === status)).toBe(true);
	});

	it('filters by tag case-insensitively using exact tag matches', async () => {
		const lower = await page({ tag: 'ai', pageSize: '50' });
		const upper = await page({ tag: 'AI', pageSize: '50' });
		expect(lower.items.map((course) => course.id).sort()).toEqual(['course-001', 'course-002', 'course-007', 'course-012']);
		expect(upper.items).toEqual(lower.items);
		expect((await page({ tag: 'secur' })).totalItems).toBe(0);
	});

	it('combines q, modality, and status', async () => {
		const result = await page({ q: 'security', modality: 'online', status: 'active' });
		expect(result.items.map((course) => course.id)).toEqual(['course-001', 'course-006']);
	});

	it('combines tag and status', async () => {
		const result = await page({ tag: 'ai', status: 'draft' });
		expect(result.items.map((course) => course.id)).toEqual(['course-007', 'course-012']);
	});

	it('pages through results without overlap', async () => {
		const first = await page({ page: '1', pageSize: '5' });
		const second = await page({ page: '2', pageSize: '5' });
		const third = await page({ page: '3', pageSize: '5' });
		expect(first.items).toHaveLength(5);
		expect(second.items).toHaveLength(5);
		expect(third.items).toHaveLength(4);
		expect(first.totalPages).toBe(3);
		expect(first.totalItems).toBe(14);
		const ids = [...first.items, ...second.items, ...third.items].map((course) => course.id);
		expect(new Set(ids).size).toBe(14);
	});

	it('accepts the maximum page size of 50', async () => {
		const result = await page({ pageSize: '50' });
		expect(result.pageSize).toBe(50);
		expect(result.items).toHaveLength(14);
		expect(result.totalPages).toBe(1);
	});

	it('returns an empty page when page is past the last page', async () => {
		const result = await page({ page: '9' });
		expect(result.items).toEqual([]);
		expect(result.totalItems).toBe(14);
		expect(result.page).toBe(9);
	});

	it.each(['createdAt', 'updatedAt'] as const)('sorts ascending by %s', async (sort) => {
		const result = await page({ sort, pageSize: '50' });
		const values = result.items.map((course) => Date.parse(course[sort]));
		expect(values).toEqual([...values].sort((a, b) => a - b));
		expect(result.items).toHaveLength(14);
	});

	it('sorts by createdAt with the oldest course first', async () => {
		const result = await page({ sort: 'createdAt', pageSize: '2' });
		expect(result.items.map((course) => course.id)).toEqual(['course-005', 'course-013']);
	});

	it('returns an empty list with valid pagination metadata when nothing matches', async () => {
		const result = await page({ q: 'quantum basket weaving' });
		expect(result).toEqual({ items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 0 });
	});

	describe('validation', () => {
		it.each([
			[{ modality: 'remote' }, 'modality'],
			[{ modality: 'ONLINE' }, 'modality'],
			[{ status: 'archived' }, 'status'],
			[{ sort: 'popularity' }, 'sort'],
			[{ sort: '-title' }, 'sort'],
			[{ page: '0' }, 'page'],
			[{ page: '-1' }, 'page'],
			[{ page: '1.5' }, 'page'],
			[{ page: 'abc' }, 'page'],
			[{ page: '' }, 'page'],
			[{ pageSize: '0' }, 'pageSize'],
			[{ pageSize: '51' }, 'pageSize'],
			[{ pageSize: 'ten' }, 'pageSize'],
			[{ pageSize: '1e1' }, 'pageSize'],
			[{ q: '' }, 'q'],
			[{ q: 'x'.repeat(101) }, 'q'],
			[{ tag: '   ' }, 'tag'],
			[{ status: ['active', 'draft'] }, 'status'],
			[{ category: 'ai' }, 'category'],
		] as const)('rejects %j', async (params, field) => {
			const error = await failure(params);
			expect(error.error.code).toBe('INVALID_QUERY_PARAMETER');
			expect(error.error.message).toBe('One or more query parameters are invalid.');
			expect(error.error.details.map((detail) => detail.field)).toEqual([field]);
		});

		it('uses the documented pageSize message', async () => {
			const error = await failure({ pageSize: '100' });
			expect(error.error.details).toEqual([{ field: 'pageSize', message: 'pageSize must be between 1 and 50.' }]);
		});

		it('reports every invalid parameter at once', async () => {
			const error = await failure({ modality: 'x', status: 'y', page: '0', pageSize: '99', sort: 'z' });
			expect(error.error.details.map((detail) => detail.field).sort()).toEqual(['modality', 'page', 'pageSize', 'sort', 'status']);
		});
	});
});
