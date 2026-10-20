import { describe, expect, it } from 'vitest';
import { buildApplicationServicesFactory, type Course, type CourseCatalog, InvalidCourseQueryError } from './index.ts';

const courses: readonly Course[] = [
	{
		id: 'c1',
		title: 'Security Basics',
		summary: 'Intro',
		modality: 'online',
		status: 'active',
		tags: ['ai'],
		createdAt: '2026-01-02T00:00:00.000Z',
		updatedAt: '2026-03-01T00:00:00.000Z',
	},
	{
		id: 'c2',
		title: 'Writing Lab',
		summary: 'Includes security notes',
		modality: 'in-person',
		status: 'draft',
		tags: ['writing'],
		createdAt: '2026-01-01T00:00:00.000Z',
		updatedAt: '2026-04-01T00:00:00.000Z',
	},
	{
		id: 'c3',
		title: 'Platforms',
		summary: 'Storage',
		modality: 'hybrid',
		status: 'retired',
		tags: ['Security', 'compliance'],
		createdAt: '2026-02-01T00:00:00.000Z',
		updatedAt: '2026-02-01T00:00:00.000Z',
	},
	{
		id: 'c4',
		title: 'Alpha Coaching',
		summary: 'People',
		modality: 'online',
		status: 'active',
		tags: ['coaching'],
		createdAt: '2026-05-01T00:00:00.000Z',
		updatedAt: '2026-01-01T00:00:00.000Z',
	},
];

const catalog: CourseCatalog = { list: () => courses };

async function search(query: Record<string, readonly string[] | undefined> = {}) {
	const services = await buildApplicationServicesFactory({ environment: 'test' }, catalog).forRequest();
	return services.courses.search(query);
}

describe('course catalog search', () => {
	it('returns the default page sorted by title', async () => {
		const page = await search();

		expect(page.page).toBe(1);
		expect(page.pageSize).toBe(10);
		expect(page.totalItems).toBe(4);
		expect(page.totalPages).toBe(1);
		expect(page.items.map((course) => course.id)).toEqual(['c4', 'c3', 'c1', 'c2']);
	});

	it('matches a keyword across title, summary, and tags without case', async () => {
		const page = await search({ q: ['SECURITY'] });

		expect(page.items.map((course) => course.id)).toEqual(['c3', 'c1', 'c2']);
		await expect(search({ q: ['basics'] })).resolves.toMatchObject({ items: [{ id: 'c1' }] });
		await expect(search({ q: ['NOTES'] })).resolves.toMatchObject({ items: [{ id: 'c2' }] });
		await expect(search({ q: ['Compliance'] })).resolves.toMatchObject({ items: [{ id: 'c3' }] });
	});

	it('filters by modality, status, and tag', async () => {
		await expect(search({ modality: ['online'] })).resolves.toMatchObject({ items: [{ id: 'c4' }, { id: 'c1' }] });
		await expect(search({ status: ['draft'] })).resolves.toMatchObject({ items: [{ id: 'c2' }] });
		await expect(search({ status: ['retired'] })).resolves.toMatchObject({ items: [{ id: 'c3' }] });
		await expect(search({ tag: ['AI'] })).resolves.toMatchObject({ items: [{ id: 'c1' }] });
	});

	it('combines keyword, modality, and status', async () => {
		const page = await search({ q: ['security'], modality: ['online'], status: ['active'] });

		expect(page.items.map((course) => course.id)).toEqual(['c1']);
		expect(page.totalItems).toBe(1);
	});

	it('paginates and reports an empty page past the end', async () => {
		const page = await search({ page: ['2'], pageSize: ['2'] });

		expect(page.items.map((course) => course.id)).toEqual(['c1', 'c2']);
		expect(page.page).toBe(2);
		expect(page.pageSize).toBe(2);
		expect(page.totalItems).toBe(4);
		expect(page.totalPages).toBe(2);

		const pastEnd = await search({ page: ['3'], pageSize: ['2'] });
		expect(pastEnd.items).toEqual([]);
		expect(pastEnd.totalItems).toBe(4);
		expect(pastEnd.totalPages).toBe(2);

		const capped = await search({ pageSize: ['50'] });
		expect(capped.pageSize).toBe(50);
		expect(capped.items).toHaveLength(4);
	});

	it('sorts by createdAt and updatedAt', async () => {
		await expect(search({ sort: ['createdAt'] })).resolves.toMatchObject({ items: [{ id: 'c2' }, { id: 'c1' }, { id: 'c3' }, { id: 'c4' }] });
		await expect(search({ sort: ['updatedAt'] })).resolves.toMatchObject({ items: [{ id: 'c4' }, { id: 'c3' }, { id: 'c1' }, { id: 'c2' }] });
	});

	it('rejects invalid modality, status, page, pageSize, and sort', async () => {
		const services = await buildApplicationServicesFactory({ environment: 'test' }, catalog).forRequest();

		expect(() => services.courses.search({ modality: ['remote'], status: ['published'], page: ['0'], pageSize: ['51'], sort: ['rank'] })).toThrow(InvalidCourseQueryError);
		try {
			services.courses.search({ modality: ['remote'], status: ['published'], page: ['0'], pageSize: ['51'], sort: ['rank'] });
		} catch (error) {
			expect(error).toMatchObject({
				code: 'INVALID_QUERY_PARAMETER',
				message: 'One or more query parameters are invalid.',
				details: [
					{ field: 'modality', message: 'modality must be online, in-person, or hybrid.' },
					{ field: 'status', message: 'status must be draft, active, or retired.' },
					{ field: 'page', message: 'page must be an integer greater than or equal to 1.' },
					{ field: 'pageSize', message: 'pageSize must be between 1 and 50.' },
					{ field: 'sort', message: 'sort must be title, createdAt, or updatedAt.' },
				],
			});
		}
	});

	it('rejects an unknown query parameter', async () => {
		const services = await buildApplicationServicesFactory({ environment: 'test' }, catalog).forRequest();
		expect(() => services.courses.search({ limit: ['1'] })).toThrow(expect.objectContaining({ details: [{ field: 'limit', message: 'limit is not a supported query parameter.' }] }));
	});

	it('returns an empty list when nothing matches', async () => {
		const page = await search({ q: ['zzzz-no-course'] });

		expect(page).toEqual({ items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 0 });
	});
});
