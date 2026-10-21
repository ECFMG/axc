import { describe, expect, it } from 'vitest';
import { courseFixtures } from './course-fixtures.ts';
import { searchCourses } from './course-search.ts';
import type { RawCourseQuery } from './course-types.ts';

function page(query: RawCourseQuery = {}) {
	const result = searchCourses(query);
	if ('error' in result) throw new Error(JSON.stringify(result));
	return result;
}
const ids = (courses: readonly { id: string }[]) => courses.map((c) => c.id).sort();

describe('course catalog search', () => {
	it('returns the default page and a complete varied model', () => {
		const result = page();
		expect(result).toMatchObject({ page: 1, pageSize: 10, totalItems: 15, totalPages: 2 });
		expect(result.items).toHaveLength(10);
		expect(new Set(courseFixtures.map((c) => c.id)).size).toBe(courseFixtures.length);
		expect(new Set(courseFixtures.map((c) => c.modality)).size).toBe(3);
		expect(new Set(courseFixtures.map((c) => c.status)).size).toBe(3);
		for (const c of courseFixtures) {
			expect(Object.keys(c).sort()).toEqual(['id', 'title', 'summary', 'modality', 'status', 'tags', 'createdAt', 'updatedAt'].sort());
			expect(new Date(c.createdAt).toISOString()).toBe(c.createdAt);
			expect(new Date(c.updatedAt).toISOString()).toBe(c.updatedAt);
		}
	});
	it.each([
		['AI SECURITY FOUNDATIONS', 'course-001'],
		['RESPONSIBLE INFORMATION', 'course-004'],
		['TELEMETRY', 'course-015'],
	])('matches keyword %s across title, summary and tags', (term, id) => {
		expect(ids(page({ q: [term] }).items)).toContain(id);
	});
	it.each(['online', 'in-person', 'hybrid'])('filters modality %s', (modality) => {
		expect(ids(page({ modality: [modality], pageSize: ['50'] }).items)).toEqual(ids(courseFixtures.filter((c) => c.modality === modality)));
	});
	it.each(['active', 'draft', 'retired'])('filters status %s', (status) => {
		expect(ids(page({ status: [status], pageSize: ['50'] }).items)).toEqual(ids(courseFixtures.filter((c) => c.status === status)));
	});
	it('matches a complete tag regardless of case', () => {
		expect(ids(page({ tag: ['AI'] }).items)).toEqual(['course-001', 'course-007', 'course-012']);
		expect(page({ tag: ['secur'] }).items).toEqual([]);
	});
	it('combines keyword, modality and status with AND', () => {
		expect(ids(page({ q: ['SECURITY'], modality: ['online'], status: ['active'] }).items)).toEqual(['course-001', 'course-015']);
	});
	it('combines modality, status and tag with AND', () => {
		expect(ids(page({ modality: ['hybrid'], status: ['draft'], tag: ['ai'] }).items)).toEqual(['course-007']);
	});
	it('paginates after filtering and sorting with stable metadata', () => {
		const all = page({ pageSize: ['50'] });
		const first = page({ pageSize: ['5'] });
		const second = page({ page: ['2'], pageSize: ['5'] });
		expect(first.items).toEqual(all.items.slice(0, 5));
		expect(second.items).toEqual(all.items.slice(5, 10));
		expect(second).toMatchObject({ page: 2, pageSize: 5, totalItems: 15, totalPages: 3 });
		expect(page({ page: ['4'], pageSize: ['5'] }).items).toEqual([]);
		expect(page({ page: [String(Number.MAX_SAFE_INTEGER)] }).items).toEqual([]);
		expect(page({ modality: ['hybrid'], pageSize: ['2'] })).toMatchObject({ totalItems: 5, totalPages: 3 });
	});
	it.each(['title', 'createdAt', 'updatedAt'] as const)('sorts ascending by %s', (sort) => {
		const values = page({ sort: [sort], pageSize: ['50'] }).items.map((c) => c[sort].toLowerCase());
		expect(values).toEqual([...values].sort());
	});
	it.each([
		['modality', 'virtual'],
		['status', 'deleted'],
		['sort', 'id'],
		['page', '0'],
		['page', '-1'],
		['page', '1.5'],
		['page', 'NaN'],
		['page', 'Infinity'],
		['page', '1e2'],
		['page', ' 1'],
		['page', '9007199254740992'],
		['pageSize', '0'],
		['pageSize', '51'],
		['pageSize', 'bad'],
		['pageSize', ''],
		['pageSize', '0x10'],
		['q', '  '],
		['tag', ''],
		['unknown', 'value'],
	])('rejects invalid %s=%s', (field, value) => {
		const result = searchCourses({ [field]: [value] });
		if (!('error' in result)) throw new Error('Expected validation error');
		expect(result.error).toMatchObject({ code: 'INVALID_QUERY_PARAMETER', message: 'One or more query parameters are invalid.' });
		expect(result.error.details).toContainEqual({ field, message: expect.any(String) });
	});
	it('rejects duplicates and returns all invalid fields consistently', () => {
		const result = searchCourses({ q: ['one', 'two'], page: ['0'], pageSize: ['51'] });
		if (!('error' in result)) throw new Error('Expected validation error');
		expect(result.error.details.map((d) => d.field)).toEqual(['q', 'page', 'pageSize']);
		expect(result.error.details[2]?.message).toBe('pageSize must be between 1 and 50.');
	});
	it('returns empty no-match metadata', () => {
		expect(page({ q: ['__not_found__'] })).toEqual({ items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 0 });
	});
	it('does not let callers mutate shared fixture data', () => {
		const first = page();
		const item = first.items[0];
		if (!item) throw new Error('Missing fixture');
		item.title = 'mutated';
		item.tags.push('mutated');
		first.items.reverse();
		expect(page().items[0]?.title).toBe('AI Security Foundations');
		expect(page().items[0]?.tags).not.toContain('mutated');
	});
});
