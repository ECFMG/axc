import type { Course } from '@axc/domain';
import { describe, expect, it } from 'vitest';
import { buildApplicationServicesFactory, type CourseSearchInput, type CourseSearchResult } from './index.ts';

const emptyQuery: CourseSearchInput = {
	q: undefined,
	modality: undefined,
	status: undefined,
	tag: undefined,
	page: undefined,
	pageSize: undefined,
	sort: undefined,
};

const fixture: readonly Course[] = [
	{
		id: 'c1',
		title: 'Bravo',
		summary: 'Contains Security notes',
		modality: 'online',
		status: 'active',
		tags: ['ops'],
		createdAt: '2026-02-01T00:00:00.000Z',
		updatedAt: '2026-05-01T00:00:00.000Z',
	},
	{
		id: 'c2',
		title: 'alpha',
		summary: 'Plain',
		modality: 'in-person',
		status: 'draft',
		tags: ['AI'],
		createdAt: '2026-01-01T00:00:00.000Z',
		updatedAt: '2026-04-01T00:00:00.000Z',
	},
	{
		id: 'c3',
		title: 'Charlie',
		summary: 'Other',
		modality: 'hybrid',
		status: 'retired',
		tags: ['Security'],
		createdAt: '2026-03-01T00:00:00.000Z',
		updatedAt: '2026-03-01T00:00:00.000Z',
	},
];

describe('course catalog search', () => {
	it('returns the default page sorted by title', async () => {
		const courses = manyCourses();
		const body = page(await search(courses, {}));

		expect(body.page).toBe(1);
		expect(body.pageSize).toBe(10);
		expect(body.totalItems).toBe(12);
		expect(body.totalPages).toBe(2);
		expect(body.items).toHaveLength(10);
		expect(body.items[0]?.title).toBe('Course A');
		expect(body.items[9]?.title).toBe('Course J');
	});

	it('matches title, summary, and tags case-insensitively', async () => {
		expect(ids(await search(fixture, { q: 'SECURITY' }))).toEqual(['c1', 'c3']);
		expect(ids(await search(fixture, { q: 'bravo' }))).toEqual(['c1']);
		expect(ids(await search(fixture, { q: 'plain' }))).toEqual(['c2']);
		expect(ids(await search(fixture, { q: 'ops' }))).toEqual(['c1']);
	});

	it('treats keyword search as literal text', async () => {
		const literal = (id: string, title: string): Course => ({
			id,
			title,
			summary: 'n',
			modality: 'online',
			status: 'active',
			tags: ['n'],
			createdAt: '2026-01-01T00:00:00.000Z',
			updatedAt: '2026-01-01T00:00:00.000Z',
		});
		expect(ids(await search([literal('plus', 'a+b'), literal('plain', 'ab')], { q: 'a+b' }))).toEqual(['plus']);
	});

	it('filters by modality, status, and tag', async () => {
		expect(ids(await search(fixture, { modality: 'online' }))).toEqual(['c1']);
		expect(ids(await search(fixture, { status: 'retired' }))).toEqual(['c3']);
		expect(ids(await search(fixture, { tag: 'ai' }))).toEqual(['c2']);
		expect(ids(await search(fixture, { tag: 'sec' }))).toEqual([]);
	});

	it('combines keyword, modality, and status', async () => {
		expect(ids(await search(fixture, { q: 'security', modality: 'online', status: 'active' }))).toEqual(['c1']);
	});

	it('paginates after sorting', async () => {
		const body = page(await search(manyCourses(), { page: '2', pageSize: '5', sort: 'title' }));

		expect(body.page).toBe(2);
		expect(body.pageSize).toBe(5);
		expect(body.totalItems).toBe(12);
		expect(body.totalPages).toBe(3);
		expect(body.items.map((course) => course.title)).toEqual(['Course F', 'Course G', 'Course H', 'Course I', 'Course J']);
	});

	it('sorts by createdAt and updatedAt', async () => {
		expect(ids(await search(fixture, { sort: 'createdAt' }))).toEqual(['c2', 'c1', 'c3']);
		expect(ids(await search(fixture, { sort: 'updatedAt' }))).toEqual(['c3', 'c2', 'c1']);
	});

	it('rejects invalid query parameters', async () => {
		const result = await search(fixture, { modality: 'remote', status: 'published', page: '0', pageSize: '51', sort: 'name' });

		expect(result.status).toBe(400);
		if (result.status !== 400) {
			return;
		}
		expect(result.body.error.code).toBe('INVALID_QUERY_PARAMETER');
		expect(result.body.error.message).toBe('One or more query parameters are invalid.');
		expect(result.body.error.details).toEqual([
			{ field: 'modality', message: 'modality must be online, in-person, or hybrid.' },
			{ field: 'status', message: 'status must be draft, active, or retired.' },
			{ field: 'page', message: 'page must be an integer greater than or equal to 1.' },
			{ field: 'pageSize', message: 'pageSize must be between 1 and 50.' },
			{ field: 'sort', message: 'sort must be title, createdAt, or updatedAt.' },
		]);
	});

	it('rejects invalid page and pageSize values', async () => {
		for (const pageNumber of ['-1', '1.5', 'foo']) {
			expect((await search(fixture, { page: pageNumber })).status).toBe(400);
		}
		for (const pageSize of ['0', '51', '10.5', 'foo']) {
			const result = await search(fixture, { pageSize });
			expect(result.status).toBe(400);
			if (result.status === 400) {
				expect(result.body.error.details).toEqual([{ field: 'pageSize', message: 'pageSize must be between 1 and 50.' }]);
			}
		}
	});

	it('accepts the pageSize bounds', async () => {
		expect(page(await search(fixture, { pageSize: '1' })).items).toHaveLength(1);
		expect(page(await search(fixture, { pageSize: '50' })).pageSize).toBe(50);
	});

	it('returns an empty page when nothing matches', async () => {
		const body = page(await search(fixture, { q: 'zzzz-no-such-course' }));

		expect(body.items).toEqual([]);
		expect(body.page).toBe(1);
		expect(body.pageSize).toBe(10);
		expect(body.totalItems).toBe(0);
		expect(body.totalPages).toBe(0);
	});
});

async function search(courses: readonly Course[], query: Partial<CourseSearchInput>): Promise<CourseSearchResult> {
	const services = await buildApplicationServicesFactory({ environment: 'test' }, { listCourses: () => courses }).forRequest();
	return services.courses.search({ ...emptyQuery, ...query });
}

function page(result: CourseSearchResult) {
	expect(result.status).toBe(200);
	if (result.status !== 200) {
		throw new Error('expected a course page');
	}
	return result.body;
}

function ids(result: CourseSearchResult): string[] {
	return page(result).items.map((course) => course.id);
}

function manyCourses(): Course[] {
	return Array.from({ length: 12 }, (_, index) => ({
		id: `course-${index + 1}`,
		title: `Course ${String.fromCharCode(65 + (11 - index))}`,
		summary: 'Summary',
		modality: 'online',
		status: 'active',
		tags: ['general'],
		createdAt: `2026-01-${String(index + 1).padStart(2, '0')}T00:00:00.000Z`,
		updatedAt: `2026-02-${String(index + 1).padStart(2, '0')}T00:00:00.000Z`,
	}));
}
