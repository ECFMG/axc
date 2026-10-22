import type { Course } from '@axc/domain';
import { describe, expect, it } from 'vitest';
import { buildApplicationServicesFactory, type CourseSearchInput, type CourseSearchResult } from './index.ts';

const fixture: readonly Course[] = [
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
	{
		id: 'course-002',
		title: 'Threat Modeling Workshop',
		summary: 'Practice security reviews on training services.',
		modality: 'in-person',
		status: 'active',
		tags: ['modeling'],
		createdAt: '2026-04-01T00:00:00.000Z',
		updatedAt: '2026-01-01T00:00:00.000Z',
	},
	{
		id: 'course-003',
		title: 'Blue Team Lab',
		summary: 'Hands-on defensive exercises.',
		modality: 'hybrid',
		status: 'draft',
		tags: ['Security'],
		createdAt: '2026-02-01T00:00:00.000Z',
		updatedAt: '2026-05-01T00:00:00.000Z',
	},
	{
		id: 'course-004',
		title: 'Machine Learning Intro',
		summary: 'Core models and evaluation.',
		modality: 'online',
		status: 'retired',
		tags: ['AI'],
		createdAt: '2026-03-01T00:00:00.000Z',
		updatedAt: '2026-04-01T00:00:00.000Z',
	},
];

const emptyInput: CourseSearchInput = {
	q: undefined,
	modality: undefined,
	status: undefined,
	tag: undefined,
	page: undefined,
	pageSize: undefined,
	sort: undefined,
};

async function search(overrides: Partial<CourseSearchInput> = {}): Promise<CourseSearchResult> {
	const services = await buildApplicationServicesFactory({
		environment: 'test',
		courseCatalog: { listCourses: () => Promise.resolve(fixture) },
	}).forRequest();
	return services.courses.search({ ...emptyInput, ...overrides });
}

function pageOf(result: CourseSearchResult) {
	expect(result.ok).toBe(true);
	if (!result.ok) {
		throw new Error('expected a course page');
	}
	return result.page;
}

describe('course catalog search', () => {
	it('returns the first page sorted by title', async () => {
		const page = pageOf(await search());

		expect(page.page).toBe(1);
		expect(page.pageSize).toBe(10);
		expect(page.totalItems).toBe(4);
		expect(page.totalPages).toBe(1);
		expect(page.items.map((item) => item.id)).toEqual(['course-001', 'course-003', 'course-004', 'course-002']);
		expect(page.items[0]).toMatchObject({
			id: 'course-001',
			title: 'AI Security Foundations',
			modality: 'online',
			status: 'active',
			tags: ['ai', 'security'],
		});
	});

	it('matches a keyword in title, summary, or tags regardless of case', async () => {
		const page = pageOf(await search({ q: 'SeCuRiTy' }));

		expect(page.items.map((item) => item.id)).toEqual(['course-001', 'course-003', 'course-002']);
	});

	it('matches a keyword that appears only in the summary', async () => {
		const page = pageOf(await search({ q: 'reviews' }));

		expect(page.items.map((item) => item.id)).toEqual(['course-002']);
	});

	it('filters by modality, status, and tag', async () => {
		expect(pageOf(await search({ modality: 'online' })).items.map((item) => item.id)).toEqual(['course-001', 'course-004']);
		expect(pageOf(await search({ status: 'active' })).items.map((item) => item.id)).toEqual(['course-001', 'course-002']);
		expect(pageOf(await search({ tag: 'ai' })).items.map((item) => item.id)).toEqual(['course-001', 'course-004']);
	});

	it('combines keyword, modality, and status filters', async () => {
		const page = pageOf(await search({ q: 'security', modality: 'online', status: 'active' }));

		expect(page.items.map((item) => item.id)).toEqual(['course-001']);
		expect(page.totalItems).toBe(1);
	});

	it('treats a tag filter as an exact case-insensitive tag', async () => {
		expect(pageOf(await search({ tag: 'SEC' })).items).toEqual([]);
		expect(pageOf(await search({ q: 'sec' })).items.map((item) => item.id)).toEqual(['course-001', 'course-003', 'course-002']);
	});

	it('paginates after filtering and sorting', async () => {
		const first = pageOf(await search({ page: '1', pageSize: '2' }));
		const second = pageOf(await search({ page: '2', pageSize: '2' }));
		const beyond = pageOf(await search({ page: '3', pageSize: '2' }));

		expect(first.items.map((item) => item.id)).toEqual(['course-001', 'course-003']);
		expect(first.totalItems).toBe(4);
		expect(first.totalPages).toBe(2);
		expect(second.items.map((item) => item.id)).toEqual(['course-004', 'course-002']);
		expect(second.page).toBe(2);
		expect(beyond.items).toEqual([]);
		expect(beyond.totalItems).toBe(4);
		expect(beyond.totalPages).toBe(2);
	});

	it('accepts the maximum page size', async () => {
		const page = pageOf(await search({ pageSize: '50' }));

		expect(page.pageSize).toBe(50);
		expect(page.items).toHaveLength(4);
	});

	it('sorts by createdAt and updatedAt', async () => {
		expect(pageOf(await search({ sort: 'createdAt' })).items.map((item) => item.id)).toEqual(['course-001', 'course-003', 'course-004', 'course-002']);
		expect(pageOf(await search({ sort: 'updatedAt' })).items.map((item) => item.id)).toEqual(['course-002', 'course-004', 'course-003', 'course-001']);
	});

	it('returns an empty page when nothing matches', async () => {
		const page = pageOf(await search({ q: 'zzzzzz', page: '2', pageSize: '5' }));

		expect(page.items).toEqual([]);
		expect(page.page).toBe(2);
		expect(page.pageSize).toBe(5);
		expect(page.totalItems).toBe(0);
		expect(page.totalPages).toBe(0);
	});

	it('rejects invalid modality, status, page, pageSize, and sort values', async () => {
		const result = await search({
			modality: 'remote',
			status: 'archived',
			page: '0',
			pageSize: '51',
			sort: 'name',
		});

		expect(result).toEqual({
			ok: false,
			error: {
				code: 'INVALID_QUERY_PARAMETER',
				message: 'One or more query parameters are invalid.',
				details: [
					{ field: 'modality', message: 'modality must be one of online, in-person, hybrid.' },
					{ field: 'status', message: 'status must be one of draft, active, retired.' },
					{ field: 'page', message: 'page must be an integer greater than or equal to 1.' },
					{ field: 'pageSize', message: 'pageSize must be between 1 and 50.' },
					{ field: 'sort', message: 'sort must be one of title, createdAt, updatedAt.' },
				],
			},
		});
	});

	it('rejects non-integer page and pageSize values', async () => {
		const page = await search({ page: '1.5' });
		const pageSize = await search({ pageSize: '0' });

		expect(page.ok).toBe(false);
		expect(pageSize.ok).toBe(false);
		if (!page.ok) {
			expect(page.error.details).toEqual([{ field: 'page', message: 'page must be an integer greater than or equal to 1.' }]);
		}
		if (!pageSize.ok) {
			expect(pageSize.error.details).toEqual([{ field: 'pageSize', message: 'pageSize must be between 1 and 50.' }]);
		}
	});
});
