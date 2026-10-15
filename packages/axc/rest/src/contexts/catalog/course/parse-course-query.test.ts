import { describe, expect, it } from 'vitest';
import { parseCourseQuery } from './parse-course-query.ts';

describe('course query validation', () => {
	it('defaults missing and blank optional values', () => {
		for (const query of ['', 'q= &tag= &modality= &status= &page= &pageSize= &sort= ']) {
			expect(parseCourseQuery(new URLSearchParams(query))).toEqual({ criteria: { page: 1, pageSize: 10, sort: 'title' } });
		}
	});
	it.each(['online', 'in-person', 'hybrid'])('accepts modality %s', (value) => expect(parseCourseQuery(new URLSearchParams({ modality: value }))).toHaveProperty('criteria.modality', value));
	it.each(['draft', 'active', 'retired'])('accepts status %s', (value) => expect(parseCourseQuery(new URLSearchParams({ status: value }))).toHaveProperty('criteria.status', value));
	it.each(['title', 'createdAt', 'updatedAt'])('accepts sort %s', (value) => expect(parseCourseQuery(new URLSearchParams({ sort: value }))).toHaveProperty('criteria.sort', value));
	it.each(['1', '50'])('accepts pageSize boundary %s', (value) => expect(parseCourseQuery(new URLSearchParams({ pageSize: value }))).toHaveProperty('criteria.pageSize', Number(value)));
	it('trims text and accepts safe page boundary', () => {
		expect(parseCourseQuery(new URLSearchParams({ q: ' Security ', tag: ' AI ', page: String(Number.MAX_SAFE_INTEGER) }))).toEqual({
			criteria: { q: 'Security', tag: 'AI', page: Number.MAX_SAFE_INTEGER, pageSize: 10, sort: 'title' },
		});
	});
	it.each([
		'modality=remote',
		'modality=ONLINE',
		'status=invalid',
		'sort=-title',
		'page=0',
		'page=-1',
		'page=1.5',
		'page=1e2',
		'page=1x',
		'page=+1',
		'page= 1 ',
		'page=9007199254740992',
		'pageSize=0',
		'pageSize=51',
		'pageSize=-1',
		'pageSize=1.5',
		'pageSize=1e1',
		'pageSize=Infinity',
		'pageSize=0x10',
		'pageSize=NaN',
		'unknown=x',
		'page=1&page=2',
	])('rejects %s', (query) => {
		const result = parseCourseQuery(new URLSearchParams(query));
		expect(result).toHaveProperty('details');
		expect(result).not.toHaveProperty('criteria');
	});
});
