import { describe, expect, it } from 'vitest';
import { parseCourseSearchQuery } from './course-query.ts';

const fieldsOf = (parsed: ReturnType<typeof parseCourseSearchQuery>) => (parsed.ok ? [] : parsed.errors.map((error) => error.field));

describe('parseCourseSearchQuery', () => {
	it('applies the documented defaults when nothing is supplied', () => {
		const parsed = parseCourseSearchQuery({});

		expect(parsed.ok).toBe(true);
		if (!parsed.ok) {
			return;
		}
		expect(parsed.criteria).toStrictEqual({ keyword: undefined, modality: undefined, status: undefined, tag: undefined, page: 1, pageSize: 10, sort: 'title' });
	});

	it('accepts the full documented query and trims text values', () => {
		const parsed = parseCourseSearchQuery({ q: '  security  ', modality: 'online', status: 'active', tag: ' AI ', page: '2', pageSize: '5', sort: 'createdAt' });

		expect(parsed.ok).toBe(true);
		if (!parsed.ok) {
			return;
		}
		expect(parsed.criteria).toStrictEqual({ keyword: 'security', modality: 'online', status: 'active', tag: 'AI', page: 2, pageSize: 5, sort: 'createdAt' });
	});

	it('treats empty and whitespace-only values as not supplied', () => {
		const parsed = parseCourseSearchQuery({ q: '   ', tag: '', page: '', pageSize: '  ', sort: '' });

		expect(parsed.ok).toBe(true);
		if (!parsed.ok) {
			return;
		}
		expect(parsed.criteria).toStrictEqual({ keyword: undefined, modality: undefined, status: undefined, tag: undefined, page: 1, pageSize: 10, sort: 'title' });
	});

	it('ignores unrecognised query parameters', () => {
		const parsed = parseCourseSearchQuery({ cacheBuster: '1738', traceId: 'abc' });

		expect(parsed.ok).toBe(true);
	});

	it('accepts the largest allowed page size and rejects one past it', () => {
		expect(parseCourseSearchQuery({ pageSize: '50' }).ok).toBe(true);
		expect(parseCourseSearchQuery({ pageSize: '51' }).ok).toBe(false);
	});

	it.each([
		['modality', { modality: 'remote' }, 'modality must be one of online, in-person, hybrid.'],
		['status', { status: 'archived' }, 'status must be one of draft, active, retired.'],
		['sort', { sort: 'summary' }, 'sort must be one of title, createdAt, updatedAt.'],
		['page', { page: '0' }, 'page must be an integer greater than or equal to 1.'],
		['page', { page: '-1' }, 'page must be an integer greater than or equal to 1.'],
		['page', { page: '1.5' }, 'page must be an integer greater than or equal to 1.'],
		['page', { page: 'two' }, 'page must be an integer greater than or equal to 1.'],
		['page', { page: '99999999999999999999' }, 'page must be an integer greater than or equal to 1.'],
		['pageSize', { pageSize: '0' }, 'pageSize must be between 1 and 50.'],
		['pageSize', { pageSize: '51' }, 'pageSize must be between 1 and 50.'],
		['pageSize', { pageSize: 'ten' }, 'pageSize must be between 1 and 50.'],
	])('rejects an invalid %s', (field, query, message) => {
		const parsed = parseCourseSearchQuery(query);

		expect(parsed.ok).toBe(false);
		if (parsed.ok) {
			return;
		}
		expect(parsed.errors).toStrictEqual([{ field, message }]);
	});

	it('reports every invalid parameter rather than stopping at the first', () => {
		const parsed = parseCourseSearchQuery({ modality: 'remote', status: 'archived', sort: 'summary', page: '0', pageSize: '99' });

		expect(fieldsOf(parsed)).toStrictEqual(['modality', 'status', 'sort', 'page', 'pageSize']);
	});
});
