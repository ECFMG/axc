import { describe, expect, it } from 'vitest';
import { parseCoursesQuery } from './courses-query.ts';

describe('course query parsing', () => {
	it('trims keyword and tag values while retaining case', () => {
		expect(parseCoursesQuery({ q: '  Security  ', tag: ' AI ' })).toEqual({ valid: true, criteria: { q: 'Security', tag: 'AI', page: 1, pageSize: 10, sort: 'title' } });
	});
	it.each(['q', 'tag', 'modality', 'status', 'page', 'pageSize', 'sort'] as const)('treats whitespace-only %s as omitted', (field) => {
		expect(parseCoursesQuery({ [field]: ' \t\n ' })).toEqual({ valid: true, criteria: { page: 1, pageSize: 10, sort: 'title' } });
	});
	it('reports format failures without generating usable criteria', () => {
		const parsed = parseCoursesQuery({ page: '2x', pageSize: '51', sort: 'bad' });
		expect(parsed.valid).toBe(false);
		expect(parsed).not.toHaveProperty('criteria');
		if (!parsed.valid) {
			expect(parsed.details.map((detail) => detail.field)).toEqual(['sort', 'page', 'pageSize']);
		}
	});
});
