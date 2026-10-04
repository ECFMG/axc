import type { Course } from '@axc/domain';
import { describe, expect, it } from 'vitest';
import { type CourseSearchCriteria, parseCourseQuery, type QueryParameterError, type RawCourseQuery, searchCourses } from './course-catalog.ts';
import { buildApplicationServicesFactory } from './index.ts';

// Small local fixtures, chosen so each rule has a precise expected outcome.
//
// q=security   -> c1 (title), c2 (summary, upper case), c3 (tag 'cyber-security' substring)
// tag=security -> c1 only (exact element match; 'cyber-security' does not match)
// tag=ai       -> c1 ('ai'), c4 ('AI')
// online       -> c1, c4, c5 | active -> c1, c2, c5
// title sort (case-insensitive) -> c1 Alpha, c2 beta, c4 Delta, c5 epsilon, c3 Gamma
// createdAt sort -> c4, c2, c1, c3, c5
// updatedAt sort -> c3, c5, c1, c2, c4
const c1: Course = {
	id: 'c1',
	title: 'Alpha Security Basics',
	summary: 'An overview of fundamentals.',
	modality: 'online',
	status: 'active',
	tags: ['ai', 'Security'],
	createdAt: '2026-01-10T00:00:00.000Z',
	updatedAt: '2026-05-01T00:00:00.000Z',
};
const c2: Course = {
	id: 'c2',
	title: 'beta Networking',
	summary: 'Covers SECURITY of corporate networks.',
	modality: 'hybrid',
	status: 'active',
	tags: ['cloud'],
	createdAt: '2025-12-01T00:00:00.000Z',
	updatedAt: '2026-06-01T00:00:00.000Z',
};
const c3: Course = {
	id: 'c3',
	title: 'Gamma Design',
	summary: 'Visual design principles.',
	modality: 'in-person',
	status: 'draft',
	tags: ['cyber-security', 'design'],
	createdAt: '2026-02-20T00:00:00.000Z',
	updatedAt: '2026-02-21T00:00:00.000Z',
};
const c4: Course = {
	id: 'c4',
	title: 'Delta Data',
	summary: 'Data pipelines at scale.',
	modality: 'online',
	status: 'retired',
	tags: ['AI', 'data'],
	createdAt: '2025-06-01T00:00:00.000Z',
	updatedAt: '2026-07-01T00:00:00.000Z',
};
const c5: Course = {
	id: 'c5',
	title: 'epsilon Ethics',
	summary: 'Ethics overview.',
	modality: 'online',
	status: 'active',
	tags: ['ethics'],
	createdAt: '2026-03-15T00:00:00.000Z',
	updatedAt: '2026-03-16T00:00:00.000Z',
};

const fixtures: readonly Course[] = [c3, c5, c1, c4, c2];

const criteria = (overrides: Partial<CourseSearchCriteria> = {}): CourseSearchCriteria => ({ page: 1, pageSize: 10, sort: 'title', ...overrides }) as CourseSearchCriteria;

const ids = (items: readonly Course[]): string[] => items.map((course) => course.id);

const makeCourses = (count: number): Course[] =>
	Array.from({ length: count }, (_, index) => {
		const n = String(index + 1).padStart(3, '0');
		return {
			id: `p-${n}`,
			title: `Paged Course ${n}`,
			summary: 'Paged fixture.',
			modality: 'online',
			status: 'active',
			tags: ['paged'],
			createdAt: `2026-01-01T00:00:${String(index % 60).padStart(2, '0')}.000Z`,
			updatedAt: '2026-02-01T00:00:00.000Z',
		};
	});

const expectErrors = (raw: RawCourseQuery, expected: QueryParameterError[]): void => {
	const result = parseCourseQuery(raw);
	expect(result).toEqual({ ok: false, errors: expected });
};

const expectCriteria = (raw: RawCourseQuery): CourseSearchCriteria => {
	const result = parseCourseQuery(raw);
	expect(result.ok).toBe(true);
	if (!result.ok) {
		throw new Error(`expected ok, got ${JSON.stringify(result.errors)}`);
	}
	return result.criteria;
};

const MODALITY_MESSAGE = 'modality must be one of: online, in-person, hybrid.';
const STATUS_MESSAGE = 'status must be one of: draft, active, retired.';
const SORT_MESSAGE = 'sort must be one of: title, createdAt, updatedAt.';
const PAGE_MESSAGE = 'page must be a positive integer.';
const PAGE_SIZE_MESSAGE = 'pageSize must be between 1 and 50.';
const Q_LENGTH_MESSAGE = 'q must be at most 200 characters.';
const TAG_LENGTH_MESSAGE = 'tag must be at most 200 characters.';

describe('parseCourseQuery', () => {
	describe('defaults', () => {
		it('defaults to page 1, pageSize 10, sort title and no filters when no parameters are given', () => {
			expect(parseCourseQuery({})).toEqual({ ok: true, criteria: { page: 1, pageSize: 10, sort: 'title' } });
		});

		it('treats supported parameters with no values as absent and applies the defaults', () => {
			expect(parseCourseQuery({ q: [], modality: [], status: [], tag: [], page: [], pageSize: [], sort: [] })).toEqual({
				ok: true,
				criteria: { page: 1, pageSize: 10, sort: 'title' },
			});
		});
	});

	describe('valid values', () => {
		it('accepts all supported parameters together', () => {
			expect(
				parseCourseQuery({
					q: ['security'],
					modality: ['online'],
					status: ['active'],
					tag: ['ai'],
					page: ['2'],
					pageSize: ['5'],
					sort: ['createdAt'],
				}),
			).toEqual({
				ok: true,
				criteria: { q: 'security', modality: 'online', status: 'active', tag: 'ai', page: 2, pageSize: 5, sort: 'createdAt' },
			});
		});

		it.each(['online', 'in-person', 'hybrid'] as const)('accepts modality %s', (modality) => {
			expect(expectCriteria({ modality: [modality] }).modality).toBe(modality);
		});

		it.each(['draft', 'active', 'retired'] as const)('accepts status %s', (status) => {
			expect(expectCriteria({ status: [status] }).status).toBe(status);
		});

		it.each(['title', 'createdAt', 'updatedAt'] as const)('accepts sort %s', (sort) => {
			expect(expectCriteria({ sort: [sort] }).sort).toBe(sort);
		});

		it('accepts pageSize 1 (minimum)', () => {
			expect(expectCriteria({ pageSize: ['1'] }).pageSize).toBe(1);
		});

		it('accepts pageSize 50 (maximum)', () => {
			expect(expectCriteria({ pageSize: ['50'] }).pageSize).toBe(50);
		});

		it('accepts page 1 and a large page number', () => {
			expect(expectCriteria({ page: ['1'] }).page).toBe(1);
			expect(expectCriteria({ page: ['1000'] }).page).toBe(1000);
		});
	});

	describe('q and tag normalization', () => {
		it('trims surrounding whitespace from q', () => {
			expect(expectCriteria({ q: ['  security  '] }).q).toBe('security');
		});

		it('ignores an empty q', () => {
			expect(expectCriteria({ q: [''] }).q).toBeUndefined();
		});

		it('ignores a whitespace-only q', () => {
			expect(expectCriteria({ q: ['   '] }).q).toBeUndefined();
		});

		it('accepts q of exactly 200 characters', () => {
			expect(expectCriteria({ q: ['a'.repeat(200)] }).q).toBe('a'.repeat(200));
		});

		it('rejects q longer than 200 characters', () => {
			expectErrors({ q: ['a'.repeat(201)] }, [{ field: 'q', message: Q_LENGTH_MESSAGE }]);
		});

		it('trims surrounding whitespace from tag', () => {
			expect(expectCriteria({ tag: ['  ai  '] }).tag).toBe('ai');
		});

		it('ignores an empty tag', () => {
			expect(expectCriteria({ tag: [''] }).tag).toBeUndefined();
		});

		it('ignores a whitespace-only tag', () => {
			expect(expectCriteria({ tag: ['  '] }).tag).toBeUndefined();
		});

		it('accepts tag of exactly 200 characters', () => {
			expect(expectCriteria({ tag: ['t'.repeat(200)] }).tag).toBe('t'.repeat(200));
		});

		it('rejects tag longer than 200 characters', () => {
			expectErrors({ tag: ['t'.repeat(201)] }, [{ field: 'tag', message: TAG_LENGTH_MESSAGE }]);
		});
	});

	describe('invalid modality', () => {
		it.each(['remote', 'Online', 'ONLINE', 'in person', ''])('rejects modality %j', (modality) => {
			expectErrors({ modality: [modality] }, [{ field: 'modality', message: MODALITY_MESSAGE }]);
		});
	});

	describe('invalid status', () => {
		it.each(['archived', 'Active', 'DRAFT', ''])('rejects status %j', (status) => {
			expectErrors({ status: [status] }, [{ field: 'status', message: STATUS_MESSAGE }]);
		});
	});

	describe('invalid sort', () => {
		it.each(['name', 'Title', 'createdat', 'updated_at', '-title', ''])('rejects sort %j', (sort) => {
			expectErrors({ sort: [sort] }, [{ field: 'sort', message: SORT_MESSAGE }]);
		});
	});

	describe('invalid page', () => {
		it.each(['0', '-1', '1.5', 'abc', '', '1e2', ' 1', '+1', '99999999999999999999'])('rejects page %j', (page) => {
			expectErrors({ page: [page] }, [{ field: 'page', message: PAGE_MESSAGE }]);
		});
	});

	describe('invalid pageSize', () => {
		it.each(['0', '51', '100', '-5', '2.5', 'abc', ''])('rejects pageSize %j', (pageSize) => {
			expectErrors({ pageSize: [pageSize] }, [{ field: 'pageSize', message: PAGE_SIZE_MESSAGE }]);
		});
	});

	describe('unsupported and duplicate parameters', () => {
		it('rejects an unknown parameter', () => {
			expectErrors({ category: ['security'] }, [{ field: 'category', message: 'category is not a supported query parameter.' }]);
		});

		it('rejects a parameter name in the wrong case as unknown', () => {
			expectErrors({ pagesize: ['5'] }, [{ field: 'pagesize', message: 'pagesize is not a supported query parameter.' }]);
		});

		it.each([
			['q', ['a', 'b']],
			['modality', ['online', 'hybrid']],
			['status', ['active', 'draft']],
			['tag', ['ai', 'web']],
			['page', ['1', '2']],
			['pageSize', ['5', '10']],
			['sort', ['title', 'createdAt']],
		])('rejects %s given more than once', (field, values) => {
			expectErrors({ [field]: values }, [{ field, message: `${field} must be specified at most once.` }]);
		});
	});

	describe('error collection', () => {
		it('collects every error in the order q, modality, status, tag, page, pageSize, sort, then unknown parameters in input order', () => {
			expectErrors(
				{
					zeta: ['1'],
					sort: ['bogus'],
					pageSize: ['51'],
					page: ['0'],
					tag: ['t'.repeat(201)],
					alpha: ['1'],
					status: ['archived'],
					modality: ['remote'],
					q: ['q'.repeat(201)],
				},
				[
					{ field: 'q', message: Q_LENGTH_MESSAGE },
					{ field: 'modality', message: MODALITY_MESSAGE },
					{ field: 'status', message: STATUS_MESSAGE },
					{ field: 'tag', message: TAG_LENGTH_MESSAGE },
					{ field: 'page', message: PAGE_MESSAGE },
					{ field: 'pageSize', message: PAGE_SIZE_MESSAGE },
					{ field: 'sort', message: SORT_MESSAGE },
					{ field: 'zeta', message: 'zeta is not a supported query parameter.' },
					{ field: 'alpha', message: 'alpha is not a supported query parameter.' },
				],
			);
		});

		it('reports only the invalid parameters when valid ones are mixed in', () => {
			expectErrors({ q: ['security'], modality: ['online'], page: ['abc'], pageSize: ['0'] }, [
				{ field: 'page', message: PAGE_MESSAGE },
				{ field: 'pageSize', message: PAGE_SIZE_MESSAGE },
			]);
		});
	});
});

describe('searchCourses', () => {
	describe('default listing', () => {
		it('returns every course sorted by title with pagination metadata when no filters are given', () => {
			expect(searchCourses(fixtures, criteria())).toEqual({
				items: [c1, c2, c4, c5, c3],
				page: 1,
				pageSize: 10,
				totalItems: 5,
				totalPages: 1,
			});
		});

		it('returns copies rather than the repository objects', () => {
			const { items } = searchCourses(fixtures, criteria());
			const first = items[0];

			expect(first).toEqual(c1);
			expect(first).not.toBe(c1);
		});

		it('does not reorder or mutate the input array', () => {
			const input = [...fixtures];
			searchCourses(input, criteria({ sort: 'createdAt' }));

			expect(input).toEqual(fixtures);
		});
	});

	describe('keyword search (q)', () => {
		it('matches q against title, summary, and tags case-insensitively', () => {
			expect(ids(searchCourses(fixtures, criteria({ q: 'security' })).items)).toEqual(['c1', 'c2', 'c3']);
		});

		it('matches regardless of the case of q', () => {
			expect(ids(searchCourses(fixtures, criteria({ q: 'SeCuRiTy' })).items)).toEqual(['c1', 'c2', 'c3']);
		});

		it('matches q in the title only', () => {
			expect(ids(searchCourses(fixtures, criteria({ q: 'ALPHA' })).items)).toEqual(['c1']);
		});

		it('matches q in the summary only', () => {
			expect(ids(searchCourses(fixtures, criteria({ q: 'Pipelines' })).items)).toEqual(['c4']);
		});

		it('matches q as a substring of a tag only', () => {
			expect(ids(searchCourses(fixtures, criteria({ q: 'CYBER' })).items)).toEqual(['c3']);
		});
	});

	describe('filters', () => {
		it('returns only courses with the requested modality', () => {
			expect(ids(searchCourses(fixtures, criteria({ modality: 'online' })).items)).toEqual(['c1', 'c4', 'c5']);
		});

		it('returns only courses with the requested status', () => {
			expect(ids(searchCourses(fixtures, criteria({ status: 'active' })).items)).toEqual(['c1', 'c2', 'c5']);
		});

		it('matches tag case-insensitively against tag elements', () => {
			expect(ids(searchCourses(fixtures, criteria({ tag: 'ai' })).items)).toEqual(['c1', 'c4']);
			expect(ids(searchCourses(fixtures, criteria({ tag: 'AI' })).items)).toEqual(['c1', 'c4']);
		});

		it('matches tag only as a whole element, not as a substring', () => {
			expect(ids(searchCourses(fixtures, criteria({ tag: 'security' })).items)).toEqual(['c1']);
			expect(ids(searchCourses(fixtures, criteria({ tag: 'cyber' })).items)).toEqual([]);
		});

		it('combines q, modality, and status with AND', () => {
			expect(ids(searchCourses(fixtures, criteria({ q: 'security', modality: 'online', status: 'active' })).items)).toEqual(['c1']);
		});

		it('combines modality and status with AND', () => {
			expect(ids(searchCourses(fixtures, criteria({ modality: 'online', status: 'active' })).items)).toEqual(['c1', 'c5']);
		});

		it('combines tag and status with AND', () => {
			expect(ids(searchCourses(fixtures, criteria({ tag: 'ai', status: 'retired' })).items)).toEqual(['c4']);
		});

		it('combines q and tag with AND', () => {
			expect(ids(searchCourses(fixtures, criteria({ q: 'security', tag: 'design' })).items)).toEqual(['c3']);
		});
	});

	describe('no match', () => {
		it('returns empty items with zero totals when nothing matches', () => {
			expect(searchCourses(fixtures, criteria({ q: 'quantum' }))).toEqual({ items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 0 });
		});

		it('returns empty items when filters contradict each other', () => {
			expect(searchCourses(fixtures, criteria({ modality: 'hybrid', status: 'draft' }))).toEqual({ items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 0 });
		});

		it('returns empty items with zero totals for an empty catalog', () => {
			expect(searchCourses([], criteria())).toEqual({ items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 0 });
		});
	});

	describe('pagination', () => {
		const paged = makeCourses(23);

		it('returns the first pageSize items with metadata', () => {
			const result = searchCourses(paged, criteria({ page: 1, pageSize: 10 }));

			expect(ids(result.items)).toEqual(ids(paged.slice(0, 10)));
			expect(result).toMatchObject({ page: 1, pageSize: 10, totalItems: 23, totalPages: 3 });
		});

		it('returns the requested middle page', () => {
			const result = searchCourses(paged, criteria({ page: 2, pageSize: 10 }));

			expect(ids(result.items)).toEqual(ids(paged.slice(10, 20)));
			expect(result).toMatchObject({ page: 2, pageSize: 10, totalItems: 23, totalPages: 3 });
		});

		it('returns a partial last page', () => {
			const result = searchCourses(paged, criteria({ page: 3, pageSize: 10 }));

			expect(ids(result.items)).toEqual(['p-021', 'p-022', 'p-023']);
			expect(result).toMatchObject({ page: 3, pageSize: 10, totalItems: 23, totalPages: 3 });
		});

		it('returns empty items with correct totals for a page beyond the end', () => {
			expect(searchCourses(paged, criteria({ page: 4, pageSize: 10 }))).toEqual({ items: [], page: 4, pageSize: 10, totalItems: 23, totalPages: 3 });
		});

		it('returns one item per page with pageSize 1', () => {
			const result = searchCourses(paged, criteria({ page: 2, pageSize: 1 }));

			expect(ids(result.items)).toEqual(['p-002']);
			expect(result).toMatchObject({ page: 2, pageSize: 1, totalItems: 23, totalPages: 23 });
		});

		it('returns up to 50 items with pageSize 50', () => {
			const many = makeCourses(60);
			const result = searchCourses(many, criteria({ page: 1, pageSize: 50 }));

			expect(result.items).toHaveLength(50);
			expect(result).toMatchObject({ page: 1, pageSize: 50, totalItems: 60, totalPages: 2 });
		});

		it('computes totalPages from the filtered total', () => {
			expect(searchCourses(fixtures, criteria({ modality: 'online', pageSize: 2 }))).toMatchObject({ totalItems: 3, totalPages: 2 });
		});

		it('paginates after filtering and sorting', () => {
			const result = searchCourses(fixtures, criteria({ status: 'active', sort: 'createdAt', page: 2, pageSize: 2 }));

			expect(ids(result.items)).toEqual(['c5']);
			expect(result).toMatchObject({ page: 2, pageSize: 2, totalItems: 3, totalPages: 2 });
		});
	});

	describe('sorting', () => {
		it('sorts by title case-insensitively by default', () => {
			expect(ids(searchCourses(fixtures, criteria()).items)).toEqual(['c1', 'c2', 'c4', 'c5', 'c3']);
		});

		it('sorts by createdAt ascending', () => {
			expect(ids(searchCourses(fixtures, criteria({ sort: 'createdAt' })).items)).toEqual(['c4', 'c2', 'c1', 'c3', 'c5']);
		});

		it('sorts by updatedAt ascending', () => {
			expect(ids(searchCourses(fixtures, criteria({ sort: 'updatedAt' })).items)).toEqual(['c3', 'c5', 'c1', 'c2', 'c4']);
		});

		it('breaks title ties (ignoring case) by id ascending', () => {
			const tied: Course[] = [
				{ ...c1, id: 'tie-3', title: 'same title' },
				{ ...c1, id: 'tie-1', title: 'Same Title' },
				{ ...c1, id: 'tie-2', title: 'SAME TITLE' },
			];

			expect(ids(searchCourses(tied, criteria({ sort: 'title' })).items)).toEqual(['tie-1', 'tie-2', 'tie-3']);
		});

		it('breaks createdAt ties by id ascending', () => {
			const tied: Course[] = [
				{ ...c1, id: 'tie-b', title: 'A' },
				{ ...c1, id: 'tie-c', title: 'B' },
				{ ...c1, id: 'tie-a', title: 'C' },
			];

			expect(ids(searchCourses(tied, criteria({ sort: 'createdAt' })).items)).toEqual(['tie-a', 'tie-b', 'tie-c']);
		});

		it('breaks updatedAt ties by id ascending', () => {
			const tied: Course[] = [
				{ ...c2, id: 'tie-z', title: 'A' },
				{ ...c2, id: 'tie-x', title: 'B' },
				{ ...c2, id: 'tie-y', title: 'C' },
			];

			expect(ids(searchCourses(tied, criteria({ sort: 'updatedAt' })).items)).toEqual(['tie-x', 'tie-y', 'tie-z']);
		});
	});
});

describe('ApplicationServices courses.search', () => {
	const servicesFor = (courses: readonly Course[]) => buildApplicationServicesFactory({ environment: 'test', courseRepository: { getAll: () => Promise.resolve(courses) } }).forRequest();

	it('returns the default page of repository courses for an empty query', async () => {
		const services = await servicesFor(fixtures);

		await expect(services.courses.search({})).resolves.toEqual({
			ok: true,
			result: { items: [c1, c2, c4, c5, c3], page: 1, pageSize: 10, totalItems: 5, totalPages: 1 },
		});
	});

	it('parses the raw query and applies filters, sort, and pagination', async () => {
		const services = await servicesFor(fixtures);

		await expect(services.courses.search({ q: ['  SECURITY '], status: ['active'], sort: ['createdAt'], pageSize: ['1'], page: ['2'] })).resolves.toEqual({
			ok: true,
			result: { items: [c1], page: 2, pageSize: 1, totalItems: 2, totalPages: 2 },
		});
	});

	it('returns ok with empty items when nothing matches', async () => {
		const services = await servicesFor(fixtures);

		await expect(services.courses.search({ q: ['quantum'] })).resolves.toEqual({
			ok: true,
			result: { items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 0 },
		});
	});

	it('returns the validation errors for an invalid query', async () => {
		const services = await servicesFor(fixtures);

		await expect(services.courses.search({ modality: ['remote'], pageSize: ['51'] })).resolves.toEqual({
			ok: false,
			errors: [
				{ field: 'modality', message: MODALITY_MESSAGE },
				{ field: 'pageSize', message: PAGE_SIZE_MESSAGE },
			],
		});
	});
});
