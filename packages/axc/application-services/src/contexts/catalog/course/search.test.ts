import { createDataSourcesFactory } from '@axc/persistence';
import { describe, expect, it } from 'vitest';
import { Catalog } from '../index.ts';

const search = Catalog(createDataSourcesFactory().withSystemPassport()).Course.search;
const defaults = { page: 1, pageSize: 10, sort: 'title' as const };

describe('Catalog.Course.search', () => {
	it('returns the default page from the 12-course fixture', async () => {
		const result = await search(defaults);
		expect(result).toMatchObject({ page: 1, pageSize: 10, totalItems: 12, totalPages: 2 });
		expect(result.items).toHaveLength(10);
		expect(result.items.map((item) => item.title)).toEqual([...result.items.map((item) => item.title)].sort((left, right) => left.localeCompare(right)));
	});

	it('searches title, summary, and tags without case sensitivity', async () => {
		expect((await search({ ...defaults, q: 'SECURITY' })).items.map((item) => item.id)).toEqual(['course-001', 'course-002', 'course-012', 'course-007']);
		expect((await search({ ...defaults, q: 'vulnerabilities' })).items.map((item) => item.id)).toEqual(['course-007']);
		expect((await search({ ...defaults, q: 'operations' })).items.map((item) => item.id)).toEqual(['course-012']);
	});

	it('combines keyword, modality, status, and case-insensitive tag filters', async () => {
		const result = await search({ ...defaults, q: 'SECURITY', modality: 'online', status: 'active', tag: 'AI' });
		expect(result.items.map((item) => item.id)).toEqual(['course-001']);
		expect((await search({ ...defaults, modality: 'in-person' })).items.every((item) => item.modality === 'in-person')).toBe(true);
		expect((await search({ ...defaults, status: 'draft' })).items.every((item) => item.status === 'draft')).toBe(true);
	});

	it('paginates and sorts by date', async () => {
		const first = await search({ ...defaults, pageSize: 5, sort: 'createdAt' });
		const second = await search({ ...defaults, page: 2, pageSize: 5, sort: 'createdAt' });
		expect(first).toMatchObject({ totalItems: 12, totalPages: 3 });
		expect(first.items).toHaveLength(5);
		expect(second.items).toHaveLength(5);
		expect(new Set([...first.items, ...second.items].map((item) => item.id)).size).toBe(10);
		expect(first.items[0]?.id).toBe('course-006');
		expect((await search({ ...defaults, sort: 'updatedAt' })).items[0]?.id).toBe('course-006');
	});

	it('returns an empty page for no matches', async () => {
		expect(await search({ ...defaults, q: 'not-a-course' })).toEqual({ items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 0 });
	});
});
