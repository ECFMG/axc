import { courseCatalogSeed } from '@axc/domain';
import { describe, expect, it } from 'vitest';
import { buildApplicationServicesFactory, type CoursePage, type CourseSearchResult } from './index.ts';

const catalog = { list: () => courseCatalogSeed };

async function search(query: Record<string, string>): Promise<CourseSearchResult> {
	const services = await buildApplicationServicesFactory({ environment: 'test' }, catalog).forRequest();
	return services.courses.search(query);
}

async function expectPage(query: Record<string, string>): Promise<CoursePage> {
	const result = await search(query);
	if (!result.ok) {
		throw new Error(JSON.stringify(result.details));
	}
	return result.page;
}

function ids(page: CoursePage): string[] {
	return page.items.map((course) => course.id);
}

describe('course catalog search', () => {
	it('stores a mixed fixture of at least 12 courses', () => {
		expect(courseCatalogSeed.length).toBe(13);
		expect(new Set(courseCatalogSeed.map((course) => course.modality)).size).toBe(3);
		expect(new Set(courseCatalogSeed.map((course) => course.status)).size).toBe(3);
		expect(courseCatalogSeed.some((course) => course.tags.length > 1)).toBe(true);
	});

	it('returns the default page sorted by title', async () => {
		const page = await expectPage({});

		expect(page.page).toBe(1);
		expect(page.pageSize).toBe(10);
		expect(page.totalItems).toBe(13);
		expect(page.totalPages).toBe(2);
		expect(ids(page)).toEqual(['course-012', 'course-013', 'course-001', 'course-011', 'course-006', 'course-005', 'course-007', 'course-009', 'course-003', 'course-010']);
	});

	it('returns the documented course when every filter matches', async () => {
		const page = await expectPage({
			q: 'AI Security Foundations',
			modality: 'online',
			status: 'active',
			tag: 'ai',
			page: '1',
			pageSize: '5',
			sort: 'title',
		});

		expect(page).toEqual({
			items: [
				{
					id: 'course-001',
					title: 'AI Security Foundations',
					summary: 'Introductory course on secure AI-assisted development.',
					modality: 'online',
					status: 'active',
					tags: ['ai', 'security'],
					createdAt: '2026-01-15T00:00:00.000Z',
					updatedAt: '2026-06-01T00:00:00.000Z',
				},
			],
			page: 1,
			pageSize: 5,
			totalItems: 1,
			totalPages: 1,
		});
	});

	it('matches title, summary, and tags regardless of case', async () => {
		const page = await expectPage({ q: 'SeCuRiTy', pageSize: '50' });

		expect(ids(page)).toEqual(['course-001', 'course-011', 'course-005', 'course-004']);
	});

	it('filters modality, status, and tag', async () => {
		expect(ids(await expectPage({ modality: 'online', pageSize: '50' }))).toEqual(['course-013', 'course-001', 'course-005', 'course-010', 'course-004']);
		expect(ids(await expectPage({ status: 'active', pageSize: '50' }))).toEqual(['course-013', 'course-001', 'course-011', 'course-006', 'course-005', 'course-009', 'course-002']);
		expect(ids(await expectPage({ tag: 'AI', pageSize: '50' }))).toEqual(['course-001', 'course-009']);
	});

	it('combines keyword, modality, and status', async () => {
		const page = await expectPage({ q: 'security', modality: 'online', status: 'active', pageSize: '50' });

		expect(ids(page)).toEqual(['course-001', 'course-005']);
	});

	it('paginates with the requested page size', async () => {
		const page = await expectPage({ page: '2', pageSize: '5' });

		expect(page.page).toBe(2);
		expect(page.pageSize).toBe(5);
		expect(page.totalItems).toBe(13);
		expect(page.totalPages).toBe(3);
		expect(ids(page)).toEqual(['course-005', 'course-007', 'course-009', 'course-003', 'course-010']);
	});

	it('sorts by createdAt and updatedAt', async () => {
		expect(ids(await expectPage({ sort: 'createdAt', pageSize: '50' }))[0]).toBe('course-013');
		expect(ids(await expectPage({ sort: 'updatedAt', pageSize: '50' }))[0]).toBe('course-008');
	});

	it('returns an empty page when nothing matches', async () => {
		const page = await expectPage({ q: 'zzzz-no-such-course' });

		expect(page.items).toEqual([]);
		expect(page.page).toBe(1);
		expect(page.pageSize).toBe(10);
		expect(page.totalItems).toBe(0);
		expect(page.totalPages).toBe(0);
	});

	it('returns an empty page past the last page', async () => {
		const page = await expectPage({ page: '9' });

		expect(page.items).toEqual([]);
		expect(page.page).toBe(9);
		expect(page.totalItems).toBe(13);
		expect(page.totalPages).toBe(2);
	});

	it('accepts the maximum page size and a blank keyword', async () => {
		expect((await expectPage({ pageSize: '50' })).items).toHaveLength(13);
		expect((await expectPage({ q: '   ' })).totalItems).toBe(13);
	});

	it('rejects invalid query parameters together', async () => {
		const result = await search({
			extra: '1',
			modality: 'remote',
			status: 'published',
			tag: '   ',
			page: '0',
			pageSize: '51',
			sort: 'name',
		});

		expect(result).toEqual({
			ok: false,
			details: [
				{ field: 'extra', message: 'Unknown query parameter.' },
				{ field: 'modality', message: 'modality must be online, in-person, or hybrid.' },
				{ field: 'status', message: 'status must be draft, active, or retired.' },
				{ field: 'tag', message: 'tag must not be empty.' },
				{ field: 'page', message: 'page must be an integer greater than or equal to 1.' },
				{ field: 'pageSize', message: 'pageSize must be between 1 and 50.' },
				{ field: 'sort', message: 'sort must be title, createdAt, or updatedAt.' },
			],
		});
	});

	it('rejects non-integer page and pageSize values', async () => {
		expect(await search({ page: 'foo' })).toEqual({
			ok: false,
			details: [{ field: 'page', message: 'page must be an integer greater than or equal to 1.' }],
		});
		expect(await search({ pageSize: '0' })).toEqual({
			ok: false,
			details: [{ field: 'pageSize', message: 'pageSize must be between 1 and 50.' }],
		});
	});
});
