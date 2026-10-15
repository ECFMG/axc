import { describe, expect, it } from 'vitest';
import { parseCourseQuery } from './parse-course-query.ts';

const parse = (query: string) => parseCourseQuery(new URLSearchParams(query));
describe('parseCourseQuery', () => {
	it('applies defaults', () => {
		expect(parse('')).toEqual({ success: true, criteria: { page: 1, pageSize: 10, sort: 'title' } });
	});
	it('treats empty and whitespace-only optional values as absent', () => {
		expect(parse('q=+&tag=&modality=+&status=&page=+&pageSize=&sort=+')).toEqual(parse(''));
	});
	it('trims search text and tags', () => {
		expect(parse('q=+Security+&tag=+AI+')).toMatchObject({ success: true, criteria: { q: 'Security', tag: 'AI' } });
	});
	it.each(['online', 'in-person', 'hybrid'])('accepts modality %s', (modality) => {
		expect(parse(`modality=${modality}`)).toMatchObject({ success: true, criteria: { modality } });
	});
	it.each(['draft', 'active', 'retired'])('accepts status %s', (status) => {
		expect(parse(`status=${status}`)).toMatchObject({ success: true, criteria: { status } });
	});
	it.each(['title', 'createdAt', 'updatedAt'])('accepts sort %s', (sort) => {
		expect(parse(`sort=${sort}`)).toMatchObject({ success: true, criteria: { sort } });
	});
	it.each(['page=1', 'page=9007199254740991', 'pageSize=1', 'pageSize=50'])('accepts boundary %s', (query) => {
		expect(parse(query).success).toBe(true);
	});
	it.each([
		'modality=remote',
		'modality=ONLINE',
		'status=enabled',
		'status=Active',
		'sort=id',
		'sort=-title',
		'page=0',
		'page=-1',
		'page=1.5',
		'page=1e2',
		'page=0x10',
		'page=1x',
		'page=%201',
		'page=1%20',
		'page=1%0A',
		'pageSize=5%0A',
		'pageSize=5%0D',
		'pageSize=5%09',
		'page=%2B1',
		'page=NaN',
		'page=Infinity',
		'page=9007199254740992',
		'pageSize=0',
		'pageSize=-1',
		'pageSize=51',
		'pageSize=1.5',
		'pageSize=1e1',
		'pageSize=5x',
		'pageSize=%205',
		'sort=+title+',
	])('rejects invalid %s', (query) => {
		const field = query.split('=')[0];
		expect(parse(query)).toMatchObject({ success: false, details: [{ field, message: expect.any(String) }] });
	});
	it.each(['q', 'modality', 'status', 'tag', 'page', 'pageSize', 'sort'])('rejects duplicate %s', (field) => {
		expect(parse(`${field}=1&${field}=2`)).toMatchObject({ success: false, details: expect.arrayContaining([expect.objectContaining({ field })]) });
	});
	it('rejects unknown parameters', () => {
		expect(parse('pages=2')).toMatchObject({ success: false, details: [{ field: 'pages', message: expect.any(String) }] });
	});
	it('collects all errors with the documented pageSize message', () => {
		const result = parse('modality=remote&status=no&page=0&pageSize=51&sort=id');
		expect(result).toMatchObject({ success: false, details: expect.arrayContaining([{ field: 'pageSize', message: 'pageSize must be between 1 and 50.' }]) });
		if (!result.success) {
			expect(result.details.map((detail) => detail.field).sort()).toEqual(['modality', 'page', 'pageSize', 'sort', 'status']);
		}
	});
});
