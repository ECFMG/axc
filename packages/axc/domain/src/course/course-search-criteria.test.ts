import { describe, expect, it } from 'vitest';
import { DEFAULT_COURSE_PAGE, DEFAULT_COURSE_PAGE_SIZE, DEFAULT_COURSE_SORT_FIELD, MAX_COURSE_KEYWORD_LENGTH, MAX_COURSE_PAGE_SIZE, parseCourseSearchCriteria } from './course-search-criteria.ts';

describe('parseCourseSearchCriteria', () => {
	it('applies defaults when no parameters are supplied', () => {
		const parsed = parseCourseSearchCriteria({});

		expect(parsed.ok).toBe(true);
		if (!parsed.ok) {
			return;
		}
		expect(parsed.criteria).toStrictEqual({
			keyword: undefined,
			modality: undefined,
			status: undefined,
			tag: undefined,
			page: DEFAULT_COURSE_PAGE,
			pageSize: DEFAULT_COURSE_PAGE_SIZE,
			sort: DEFAULT_COURSE_SORT_FIELD,
		});
	});

	it('normalises keyword and tag to lower case and trims whitespace', () => {
		const parsed = parseCourseSearchCriteria({ q: '  SecUrity ', tag: ' AI ' });

		expect(parsed.ok).toBe(true);
		if (!parsed.ok) {
			return;
		}
		expect(parsed.criteria.keyword).toBe('security');
		expect(parsed.criteria.tag).toBe('ai');
	});

	it('treats blank parameters as absent', () => {
		const parsed = parseCourseSearchCriteria({ q: '   ', tag: '', modality: '', sort: '' });

		expect(parsed.ok).toBe(true);
		if (!parsed.ok) {
			return;
		}
		expect(parsed.criteria.keyword).toBeUndefined();
		expect(parsed.criteria.tag).toBeUndefined();
		expect(parsed.criteria.modality).toBeUndefined();
		expect(parsed.criteria.sort).toBe(DEFAULT_COURSE_SORT_FIELD);
	});

	it.each(['online', 'in-person', 'hybrid'])('accepts modality %s', (modality) => {
		const parsed = parseCourseSearchCriteria({ modality });

		expect(parsed.ok).toBe(true);
	});

	it.each(['draft', 'active', 'retired'])('accepts status %s', (status) => {
		const parsed = parseCourseSearchCriteria({ status });

		expect(parsed.ok).toBe(true);
	});

	it.each(['title', 'createdAt', 'updatedAt'])('accepts sort %s', (sort) => {
		const parsed = parseCourseSearchCriteria({ sort });

		expect(parsed.ok).toBe(true);
	});

	it('rejects an unknown modality', () => {
		const parsed = parseCourseSearchCriteria({ modality: 'remote' });

		expect(parsed.ok).toBe(false);
		if (parsed.ok) {
			return;
		}
		expect(parsed.violations).toStrictEqual([{ field: 'modality', message: 'modality must be one of online, in-person, hybrid.' }]);
	});

	it('rejects an unknown status', () => {
		const parsed = parseCourseSearchCriteria({ status: 'archived' });

		expect(parsed.ok).toBe(false);
		if (parsed.ok) {
			return;
		}
		expect(parsed.violations).toStrictEqual([{ field: 'status', message: 'status must be one of draft, active, retired.' }]);
	});

	it('rejects an unknown sort field', () => {
		const parsed = parseCourseSearchCriteria({ sort: 'rating' });

		expect(parsed.ok).toBe(false);
		if (parsed.ok) {
			return;
		}
		expect(parsed.violations).toStrictEqual([{ field: 'sort', message: 'sort must be one of title, createdAt, updatedAt.' }]);
	});

	it.each(['0', '-1', 'abc', '1.5', '1e2', 'NaN'])('rejects page %j', (page) => {
		const parsed = parseCourseSearchCriteria({ page });

		expect(parsed.ok).toBe(false);
		if (parsed.ok) {
			return;
		}
		expect(parsed.violations).toStrictEqual([{ field: 'page', message: 'page must be an integer greater than or equal to 1.' }]);
	});

	it.each(['0', '51', '-5', 'ten'])('rejects pageSize %j', (pageSize) => {
		const parsed = parseCourseSearchCriteria({ pageSize });

		expect(parsed.ok).toBe(false);
		if (parsed.ok) {
			return;
		}
		expect(parsed.violations).toStrictEqual([{ field: 'pageSize', message: `pageSize must be between 1 and ${MAX_COURSE_PAGE_SIZE}.` }]);
	});

	it('accepts the maximum page size', () => {
		const parsed = parseCourseSearchCriteria({ pageSize: String(MAX_COURSE_PAGE_SIZE) });

		expect(parsed.ok).toBe(true);
		if (!parsed.ok) {
			return;
		}
		expect(parsed.criteria.pageSize).toBe(MAX_COURSE_PAGE_SIZE);
	});

	it('rejects an over-long keyword', () => {
		const parsed = parseCourseSearchCriteria({ q: 'a'.repeat(MAX_COURSE_KEYWORD_LENGTH + 1) });

		expect(parsed.ok).toBe(false);
		if (parsed.ok) {
			return;
		}
		expect(parsed.violations).toStrictEqual([{ field: 'q', message: `q must be ${MAX_COURSE_KEYWORD_LENGTH} characters or fewer.` }]);
	});

	it('reports every invalid parameter in one result', () => {
		const parsed = parseCourseSearchCriteria({ modality: 'remote', status: 'archived', page: '0', pageSize: '500', sort: 'rating' });

		expect(parsed.ok).toBe(false);
		if (parsed.ok) {
			return;
		}
		expect(parsed.violations.map((violation) => violation.field)).toStrictEqual(['modality', 'status', 'sort', 'page', 'pageSize']);
	});
});
