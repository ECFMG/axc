import { describe, expect, it } from 'vitest';
import { buildApplicationServicesFactory } from './index.ts';

const search = async (query: Record<string, string>) => (await buildApplicationServicesFactory({ environment: 'test' }).forRequest()).courses.search(query);

describe('courses.search', () => {
	it('defaults to page 1, pageSize 10, sorted by title', async () => {
		const outcome = await search({});
		if (!outcome.ok) throw new Error('expected ok');
		expect(outcome.value).toMatchObject({ page: 1, pageSize: 10, totalItems: 14, totalPages: 2 });
		expect(outcome.value.items).toHaveLength(10);
		expect(outcome.value.items[0]?.title).toBe('Accessible Web Design');
	});

	it('applies filters and pagination metadata', async () => {
		const outcome = await search({ q: 'Security', modality: 'online', status: 'active', page: '1', pageSize: '5', sort: 'createdAt' });
		expect(outcome).toEqual({ ok: true, value: expect.objectContaining({ page: 1, pageSize: 5, totalItems: 1, totalPages: 1 }) });
	});

	it('returns an empty page when nothing matches', async () => {
		const outcome = await search({ tag: 'nothing' });
		expect(outcome).toEqual({ ok: true, value: { items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 0 } });
	});

	it.each([
		[{ modality: 'remote' }, 'modality'],
		[{ status: 'archived' }, 'status'],
		[{ sort: 'price' }, 'sort'],
		[{ page: '0' }, 'page'],
		[{ page: 'abc' }, 'page'],
		[{ pageSize: '51' }, 'pageSize'],
		[{ pageSize: '2.5' }, 'pageSize'],
		[{ colour: 'red' }, 'colour'],
	])('rejects %o', async (query, field) => {
		const outcome = await search(query);
		if (outcome.ok) throw new Error('expected error');
		expect(outcome.error.error.code).toBe('INVALID_QUERY_PARAMETER');
		expect(outcome.error.error.details.map((d) => d.field)).toEqual([field]);
	});

	it('reports every invalid parameter at once', async () => {
		const outcome = await search({ modality: 'x', pageSize: '0' });
		expect(outcome.ok ? [] : outcome.error.error.details.map((d) => d.field)).toEqual(['modality', 'pageSize']);
	});
});
