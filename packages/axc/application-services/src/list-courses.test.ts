import { describe, expect, it } from 'vitest';
import { buildApplicationServicesFactory, type CourseQueryInput } from './index.ts';

const createdAtOrder = ['course-006', 'course-008', 'course-010', 'course-004', 'course-013', 'course-012', 'course-001', 'course-002', 'course-009', 'course-003', 'course-005', 'course-007', 'course-011'];

async function search(query: CourseQueryInput = {}) {
	const services = await buildApplicationServicesFactory({ environment: 'test' }).forRequest();
	return services.courses.list(query);
}

function pageOf(result: Awaited<ReturnType<typeof search>>) {
	expect(result.ok).toBe(true);
	if (!result.ok) {
		throw new Error('expected a course page');
	}
	return result.page;
}

function errorOf(result: Awaited<ReturnType<typeof search>>) {
	expect(result.ok).toBe(false);
	if (result.ok) {
		throw new Error('expected a query error');
	}
	return result.error;
}

function ids(items: readonly { id: string }[]): string[] {
	return items.map((item) => item.id);
}

describe('course catalog search', () => {
	it('returns the default page sorted by title', async () => {
		const page = pageOf(await search());

		expect(page.page).toBe(1);
		expect(page.pageSize).toBe(10);
		expect(page.totalItems).toBe(13);
		expect(page.totalPages).toBe(2);
		expect(page.items).toHaveLength(10);
		expect(page.items[0]?.id).toBe('course-009');
		expect(page.items[0]?.title).toBe('Accessibility Reviews');
	});

	it('matches a keyword in title, summary, or tags regardless of case', async () => {
		expect(ids(pageOf(await search({ q: ['SECURITY'] })).items)).toEqual(['course-001', 'course-011', 'course-010']);
		expect(ids(pageOf(await search({ q: ['curriculum'] })).items)).toEqual(['course-006']);
		expect(ids(pageOf(await search({ q: ['Tabletop'] })).items)).toEqual(['course-008']);
		expect(ids(pageOf(await search({ q: ['LABS'] })).items)).toEqual(['course-012']);
	});

	it('filters by modality, status, and tag', async () => {
		const online = pageOf(await search({ modality: ['online'], pageSize: ['50'] }));
		expect(online.items.every((course) => course.modality === 'online')).toBe(true);
		expect(ids(online.items)).toEqual(['course-009', 'course-001', 'course-005', 'course-013', 'course-006']);

		const active = pageOf(await search({ status: ['active'], pageSize: ['50'] }));
		expect(active.items.every((course) => course.status === 'active')).toBe(true);
		expect(ids(active.items)).toEqual(['course-009', 'course-001', 'course-012', 'course-004', 'course-013', 'course-002']);

		expect(ids(pageOf(await search({ tag: ['AI'] })).items)).toEqual(['course-001']);
		expect(ids(pageOf(await search({ tag: ['leadership'] })).items)).toEqual(['course-013']);
	});

	it('combines keyword, modality, and status', async () => {
		const page = pageOf(await search({ q: ['security'], modality: ['online'], status: ['active'], tag: ['ai'], page: ['1'], pageSize: ['5'], sort: ['title'] }));

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

	it('paginates with page and pageSize', async () => {
		const page = pageOf(await search({ page: ['2'], pageSize: ['5'] }));

		expect(page.page).toBe(2);
		expect(page.pageSize).toBe(5);
		expect(page.totalItems).toBe(13);
		expect(page.totalPages).toBe(3);
		expect(page.items).toHaveLength(5);
		expect(ids(page.items)).toEqual(['course-008', 'course-013', 'course-007', 'course-006', 'course-002']);
	});

	it('sorts by createdAt ascending', async () => {
		const page = pageOf(await search({ sort: ['createdAt'], pageSize: ['50'] }));
		expect(ids(page.items)).toEqual(createdAtOrder);
	});

	it('rejects invalid modality, status, page, pageSize, and sort', async () => {
		const error = errorOf(await search({ modality: ['classroom'], status: ['published'], page: ['0'], pageSize: ['51'], sort: ['name'] }));

		expect(error).toEqual({
			code: 'INVALID_QUERY_PARAMETER',
			message: 'One or more query parameters are invalid.',
			details: [
				{ field: 'modality', message: 'modality must be one of online, in-person, or hybrid.' },
				{ field: 'status', message: 'status must be one of draft, active, or retired.' },
				{ field: 'page', message: 'page must be an integer greater than or equal to 1.' },
				{ field: 'pageSize', message: 'pageSize must be between 1 and 50.' },
				{ field: 'sort', message: 'sort must be one of title, createdAt, or updatedAt.' },
			],
		});
	});

	it('rejects an unknown parameter and a repeated parameter', async () => {
		const error = errorOf(await search({ page: ['1', '2'], limit: ['10'] }));
		expect(error.details).toEqual([
			{ field: 'page', message: 'page must be specified once.' },
			{ field: 'limit', message: 'limit is not a supported query parameter.' },
		]);
	});

	it('returns an empty page when nothing matches', async () => {
		const page = pageOf(await search({ q: ['zzzz-no-such-course'] }));

		expect(page.items).toEqual([]);
		expect(page.page).toBe(1);
		expect(page.pageSize).toBe(10);
		expect(page.totalItems).toBe(0);
		expect(page.totalPages).toBe(0);
	});
});
