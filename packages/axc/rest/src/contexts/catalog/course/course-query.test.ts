import { describe, expect, it } from 'vitest';
import { parseCourseQuery } from './course-query.ts';

const parse = (query: string) => parseCourseQuery(new URLSearchParams(query));
describe('course query validation', () => {
	it('supplies defaults', () => {
		expect(parse('')).toEqual({ ok: true, query: { page: 1, pageSize: 10, sort: 'title' } });
	});
	it('treats all blank optional inputs as absent', () => {
		expect(parse('q=+&tag=&modality=+&status=&sort=+&page=&pageSize=+')).toEqual(parse(''));
	});
	it('trims free text and preserves its case', () => {
		expect(parse('q=+SeCurity+&tag=+AI+')).toMatchObject({ ok: true, query: { q: 'SeCurity', tag: 'AI' } });
	});
	it.each(['online', 'in-person', 'hybrid'])('accepts modality %s', (value) => {
		expect(parse(`modality=${value}`)).toMatchObject({ ok: true, query: { modality: value } });
	});
	it.each(['draft', 'active', 'retired'])('accepts status %s', (value) => {
		expect(parse(`status=${value}`)).toMatchObject({ ok: true, query: { status: value } });
	});
	it.each(['title', 'createdAt', 'updatedAt'])('accepts sort %s', (value) => {
		expect(parse(`sort=${value}`)).toMatchObject({ ok: true, query: { sort: value } });
	});
	it.each(['page=1', 'page=9007199254740991', 'pageSize=1', 'pageSize=50'])('accepts boundary %s', (query) => {
		expect(parse(query).ok).toBe(true);
	});
	it.each([
		'modality=remote',
		'modality=Online',
		'modality=+online',
		'status=unknown',
		'status=ACTIVE',
		'sort=id',
		'sort=TITLE',
		'page=0',
		'page=-1',
		'page=1.5',
		'page=1e2',
		'page=0x10',
		'page=1abc',
		'page=NaN',
		'page=Infinity',
		'page=%2B1',
		'page=+1',
		'page=1+',
		'page=9007199254740992',
		'pageSize=0',
		'pageSize=-1',
		'pageSize=51',
		'pageSize=2.5',
		'pageSize=1e1',
		'pageSize=9007199254740992',
		'pageSize=1x',
		'unknown=x',
		'q=a&q=b',
		'tag=ai&tag=security',
		'page=1&page=2',
	])('rejects %s', (query) => {
		const result = parse(query);
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.details[0]?.field).toBe(query.split('=')[0]);
	});
	it('reports all failures without substituting valid enum values', () => {
		const result = parse('modality=bad&status=bad&pageSize=51&sort=bad&page=0');
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.details.map((detail) => detail.field).sort()).toEqual(['modality', 'page', 'pageSize', 'sort', 'status']);
			expect(result.details).toContainEqual({ field: 'pageSize', message: 'pageSize must be between 1 and 50.' });
		}
	});
});
