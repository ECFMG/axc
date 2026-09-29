import { describe, expect, it } from 'vitest';
import { INVALID_QUERY_PARAMETER_CODE, INVALID_QUERY_PARAMETER_MESSAGE, invalidQueryParameterResponse } from './api-error.ts';
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE, DEFAULT_SORT, MAX_PAGE_SIZE } from './course-search-criteria.ts';
import { parseCourseSearchCriteria } from './course-search-criteria-parser.ts';

const parse = (query: Record<string, string>) => parseCourseSearchCriteria(query);

const violationFields = (query: Record<string, string>): string[] => {
	const parsed = parse(query);
	return parsed.ok ? [] : parsed.violations.map((violation) => violation.field);
};

describe('parseCourseSearchCriteria', () => {
	it('applies the documented defaults when no parameters are supplied', () => {
		const parsed = parse({});

		expect(parsed.ok).toBe(true);
		if (!parsed.ok) {
			return;
		}
		expect(parsed.criteria).toStrictEqual({ q: undefined, modality: undefined, status: undefined, tag: undefined, page: DEFAULT_PAGE, pageSize: DEFAULT_PAGE_SIZE, sort: DEFAULT_SORT });
	});

	it('trims values and treats blank parameters as absent', () => {
		const parsed = parse({ q: '  security  ', tag: '   ', modality: ' ONLINE ', sort: ' createdAt ' });

		expect(parsed.ok).toBe(true);
		if (!parsed.ok) {
			return;
		}
		expect(parsed.criteria.q).toBe('security');
		expect(parsed.criteria.tag).toBeUndefined();
		expect(parsed.criteria.modality).toBe('online');
		expect(parsed.criteria.sort).toBe('createdAt');
	});

	it('accepts the maximum page size', () => {
		const parsed = parse({ pageSize: String(MAX_PAGE_SIZE) });

		expect(parsed.ok).toBe(true);
		if (!parsed.ok) {
			return;
		}
		expect(parsed.criteria.pageSize).toBe(MAX_PAGE_SIZE);
	});

	it.each([
		['invalid modality', { modality: 'virtual' }, 'modality'],
		['invalid status', { status: 'archived' }, 'status'],
		['invalid sort', { sort: 'relevance' }, 'sort'],
		['non numeric page', { page: 'one' }, 'page'],
		['zero page', { page: '0' }, 'page'],
		['negative page', { page: '-2' }, 'page'],
		['fractional page', { page: '1.5' }, 'page'],
		['zero page size', { pageSize: '0' }, 'pageSize'],
		['page size above the maximum', { pageSize: '51' }, 'pageSize'],
		['non numeric page size', { pageSize: 'ten' }, 'pageSize'],
	])('rejects %s', (_label, query, field) => {
		expect(violationFields(query)).toStrictEqual([field]);
	});

	it('reports every violation in a single response', () => {
		const parsed = parse({ modality: 'virtual', status: 'archived', page: '0', pageSize: '500', sort: 'relevance' });

		expect(parsed.ok).toBe(false);
		if (parsed.ok) {
			return;
		}
		expect(parsed.violations.map((violation) => violation.field)).toStrictEqual(['modality', 'status', 'page', 'pageSize', 'sort']);
		expect(parsed.violations.find((violation) => violation.field === 'pageSize')?.message).toBe('pageSize must be between 1 and 50.');
	});
});

describe('invalidQueryParameterResponse', () => {
	it('wraps violations in the shared error envelope', () => {
		expect(invalidQueryParameterResponse([{ field: 'pageSize', message: 'pageSize must be between 1 and 50.' }])).toStrictEqual({
			error: {
				code: INVALID_QUERY_PARAMETER_CODE,
				message: INVALID_QUERY_PARAMETER_MESSAGE,
				details: [{ field: 'pageSize', message: 'pageSize must be between 1 and 50.' }],
			},
		});
	});
});
