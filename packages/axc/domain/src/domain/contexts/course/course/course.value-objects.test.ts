import { describe, expect, it } from 'vitest';
import { DomainError } from '../../../domain-error.ts';
import { CourseSearchCriteria } from './course.value-objects.ts';

const fieldsOf = (raw: Record<string, string>) => {
	try {
		CourseSearchCriteria.parse(raw);
		return [];
	} catch (error) {
		expect(error).toBeInstanceOf(DomainError);
		expect((error as DomainError).code).toBe('INVALID_QUERY_PARAMETER');
		return (error as DomainError).details.map((d) => d.field);
	}
};

describe('CourseSearchCriteria', () => {
	it('applies defaults', () => {
		const c = CourseSearchCriteria.parse({});
		expect([c.page, c.pageSize, c.sort, c.q]).toEqual([1, 10, 'title', undefined]);
	});

	it('accepts every supported parameter', () => {
		const c = CourseSearchCriteria.parse({ q: ' AI ', modality: 'in-person', status: 'retired', tag: 'ai', page: '2', pageSize: '50', sort: 'updatedAt' });
		expect(c).toMatchObject({ q: 'AI', modality: 'in-person', status: 'retired', tag: 'ai', page: 2, pageSize: 50, sort: 'updatedAt' });
	});

	it.each([
		[{ modality: 'remote' }, 'modality'],
		[{ status: 'open' }, 'status'],
		[{ page: '0' }, 'page'],
		[{ page: 'x' }, 'page'],
		[{ pageSize: '51' }, 'pageSize'],
		[{ pageSize: '0' }, 'pageSize'],
		[{ sort: 'price' }, 'sort'],
	])('rejects %o', (raw, field) => {
		expect(fieldsOf(raw)).toEqual([field]);
	});
});
