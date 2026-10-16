import { describe, expect, it } from 'vitest';
import { parseCourseQuery } from './parse-query.ts';

const defaults = { page: 1, pageSize: 10, sort: 'title' };
describe('course query parsing', () => {
	it('defaults omitted and blank optional values', () => {
		expect(parseCourseQuery({})).toEqual({ criteria: defaults });
		expect(parseCourseQuery(Object.fromEntries(['q', 'modality', 'status', 'tag', 'page', 'pageSize', 'sort'].map((key) => [key, ['  ']])))).toEqual({ criteria: defaults });
	});
	it.each(['online', 'in-person', 'hybrid'])('accepts modality %s', (modality) => {
		expect(parseCourseQuery({ modality: [modality] })).toEqual({ criteria: { ...defaults, modality } });
	});
	it.each(['draft', 'active', 'retired'])('accepts status %s', (status) => {
		expect(parseCourseQuery({ status: [status] })).toEqual({ criteria: { ...defaults, status } });
	});
	it.each(['title', 'createdAt', 'updatedAt'])('accepts sort %s', (sort) => {
		expect(parseCourseQuery({ sort: [sort] })).toEqual({ criteria: { ...defaults, sort } });
	});
	it('trims text and accepts numeric boundaries', () => {
		expect(parseCourseQuery({ q: [' SECURITY '], tag: [' AI '], page: ['9007199254740991'], pageSize: ['50'] })).toEqual({ criteria: { ...defaults, q: 'SECURITY', tag: 'AI', page: Number.MAX_SAFE_INTEGER, pageSize: 50 } });
		expect(parseCourseQuery({ page: ['1'], pageSize: ['1'] })).toEqual({ criteria: { ...defaults, pageSize: 1 } });
	});
	it.each(['0', '-1', '1.5', '1e2', '1x', ' 2 ', '+2', 'Infinity', 'NaN', '9007199254740992', '2\n'])('rejects invalid integer %s', (value) => {
		for (const field of ['page', 'pageSize']) {
			expect(parseCourseQuery({ [field]: [value] }).details).toEqual([{ field, message: expect.any(String) }]);
		}
	});
	it.each([
		['pageSize', '51'],
		['modality', 'Online'],
		['modality', 'other'],
		['status', 'Active'],
		['status', 'other'],
		['sort', '-title'],
		['sort', 'other'],
	])('rejects %s=%s', (field, value) => {
		expect(parseCourseQuery({ [field]: [value] }).details).toEqual([{ field, message: expect.any(String) }]);
	});
	it('reports all errors including duplicate and unknown parameters', () => {
		expect(
			parseCourseQuery({ page: ['0'], status: ['bad'], q: ['a', 'b'], extra: ['x'] })
				.details?.map((d) => d.field)
				.sort(),
		).toEqual(['extra', 'page', 'q', 'status']);
	});
});
