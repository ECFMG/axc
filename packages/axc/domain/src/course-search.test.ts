import { describe, expect, it } from 'vitest';
import type { Course } from './course.ts';
import { DEFAULT_COURSE_PAGE, DEFAULT_COURSE_PAGE_SIZE, DEFAULT_COURSE_SORT, searchCourseCollection, validateCourseSearchQuery } from './course-search.ts';
import { AxcDomainError } from './errors.ts';

const course = (overrides: Partial<Course> & Pick<Course, 'id'>): Course => ({
	title: `Course ${overrides.id}`,
	summary: 'A course summary.',
	modality: 'online',
	status: 'active',
	tags: [],
	createdAt: '2026-01-01T00:00:00.000Z',
	updatedAt: '2026-01-01T00:00:00.000Z',
	...overrides,
});

const catalog: readonly Course[] = [
	course({
		id: 'c1',
		title: 'AI Security Foundations',
		summary: 'Secure AI development.',
		modality: 'online',
		status: 'active',
		tags: ['ai', 'security'],
		createdAt: '2026-03-01T00:00:00.000Z',
		updatedAt: '2026-06-01T00:00:00.000Z',
	}),
	course({ id: 'c2', title: 'Baking Bread', summary: 'All about SECURITY of the sourdough starter.', modality: 'in-person', status: 'active', tags: ['food'], createdAt: '2026-01-01T00:00:00.000Z' }),
	course({ id: 'c3', title: 'Hybrid Teams', summary: 'Remote collaboration.', modality: 'hybrid', status: 'draft', tags: ['AI'], createdAt: '2026-02-01T00:00:00.000Z' }),
	course({ id: 'c4', title: 'Zero Trust', summary: 'Network segmentation.', modality: 'online', status: 'retired', tags: ['security'], createdAt: '2026-04-01T00:00:00.000Z' }),
];

const criteria = (overrides: Partial<ReturnType<typeof validateCourseSearchQuery>> = {}) => ({
	...validateCourseSearchQuery({}),
	...overrides,
});

describe('validateCourseSearchQuery', () => {
	it('applies defaults when every parameter is omitted', () => {
		expect(validateCourseSearchQuery({})).toStrictEqual({
			q: undefined,
			modality: undefined,
			status: undefined,
			tag: undefined,
			page: DEFAULT_COURSE_PAGE,
			pageSize: DEFAULT_COURSE_PAGE_SIZE,
			sort: DEFAULT_COURSE_SORT,
		});
	});

	it('accepts every supported parameter', () => {
		expect(validateCourseSearchQuery({ q: 'security', modality: 'online', status: 'active', tag: 'ai', page: '2', pageSize: '5', sort: 'createdAt' })).toStrictEqual({
			q: 'security',
			modality: 'online',
			status: 'active',
			tag: 'ai',
			page: 2,
			pageSize: 5,
			sort: 'createdAt',
		});
	});

	it('treats blank parameters as omitted', () => {
		expect(validateCourseSearchQuery({ q: '   ', tag: '' })).toMatchObject({ q: undefined, tag: undefined });
	});

	it.each([
		['modality', 'remote'],
		['status', 'archived'],
		['sort', 'summary'],
		['page', '0'],
		['page', '-1'],
		['page', 'two'],
		['pageSize', '0'],
		['pageSize', '51'],
		['pageSize', '1.5'],
	])('rejects %s=%s with INVALID_QUERY_PARAMETER', (field, value) => {
		const act = () => validateCourseSearchQuery({ [field]: value });

		expect(act).toThrow(AxcDomainError);
		try {
			act();
		} catch (error) {
			const domainError = error as AxcDomainError;
			expect(domainError.code).toBe('INVALID_QUERY_PARAMETER');
			expect(domainError.details.map((detail) => detail.field)).toContain(field);
		}
	});

	it('reports every invalid parameter in a single error', () => {
		try {
			validateCourseSearchQuery({ modality: 'remote', status: 'archived', pageSize: '500' });
			expect.unreachable('expected a validation error');
		} catch (error) {
			expect((error as AxcDomainError).details.map((detail) => detail.field)).toStrictEqual(['modality', 'status', 'pageSize']);
		}
	});
});

describe('searchCourseCollection', () => {
	it('sorts by title and paginates by default', () => {
		const result = searchCourseCollection(catalog, criteria());

		expect(result.items.map((item) => item.id)).toStrictEqual(['c1', 'c2', 'c3', 'c4']);
		expect(result).toMatchObject({ page: 1, pageSize: 10, totalItems: 4, totalPages: 1 });
	});

	it('matches the keyword against title, summary, and tags case-insensitively', () => {
		expect(searchCourseCollection(catalog, criteria({ q: 'security' })).items.map((item) => item.id)).toStrictEqual(['c1', 'c2', 'c4']);
		expect(searchCourseCollection(catalog, criteria({ q: 'AI' })).items.map((item) => item.id)).toStrictEqual(['c1', 'c3']);
	});

	it('filters by modality, status, and tag', () => {
		expect(searchCourseCollection(catalog, criteria({ modality: 'online' })).items.map((item) => item.id)).toStrictEqual(['c1', 'c4']);
		expect(searchCourseCollection(catalog, criteria({ status: 'active' })).items.map((item) => item.id)).toStrictEqual(['c1', 'c2']);
		expect(searchCourseCollection(catalog, criteria({ tag: 'ai' })).items.map((item) => item.id)).toStrictEqual(['c1', 'c3']);
	});

	it('combines keyword, modality, and status filters', () => {
		const result = searchCourseCollection(catalog, criteria({ q: 'security', modality: 'online', status: 'active' }));

		expect(result.items.map((item) => item.id)).toStrictEqual(['c1']);
		expect(result.totalItems).toBe(1);
	});

	it('paginates and reports page metadata', () => {
		const first = searchCourseCollection(catalog, criteria({ pageSize: 2 }));
		const second = searchCourseCollection(catalog, criteria({ page: 2, pageSize: 2 }));

		expect(first.items.map((item) => item.id)).toStrictEqual(['c1', 'c2']);
		expect(first).toMatchObject({ page: 1, pageSize: 2, totalItems: 4, totalPages: 2 });
		expect(second.items.map((item) => item.id)).toStrictEqual(['c3', 'c4']);
	});

	it('sorts by createdAt and updatedAt ascending', () => {
		expect(searchCourseCollection(catalog, criteria({ sort: 'createdAt' })).items.map((item) => item.id)).toStrictEqual(['c2', 'c3', 'c1', 'c4']);
		expect(searchCourseCollection(catalog, criteria({ sort: 'updatedAt' })).items.map((item) => item.id)).toStrictEqual(['c2', 'c3', 'c4', 'c1']);
	});

	it('returns an empty page rather than an error when nothing matches', () => {
		expect(searchCourseCollection(catalog, criteria({ q: 'underwater basket weaving' }))).toStrictEqual({
			items: [],
			page: 1,
			pageSize: 10,
			totalItems: 0,
			totalPages: 0,
		});
	});

	it('returns an empty page when the requested page is past the end', () => {
		expect(searchCourseCollection(catalog, criteria({ page: 9, pageSize: 2 })).items).toStrictEqual([]);
	});
});
