import { describe, expect, it } from 'vitest';
import { buildApplicationServicesFactory, type CourseQueryInput, InvalidQueryParameterError } from './index.ts';

describe('course catalog search', () => {
	it('returns the first page sorted by title', async () => {
		const page = await search();

		expect(page.page).toBe(1);
		expect(page.pageSize).toBe(10);
		expect(page.totalItems).toBe(12);
		expect(page.totalPages).toBe(2);
		expect(ids(page.items)).toEqual(['course-010', 'course-008', 'course-001', 'course-011', 'course-002', 'course-009', 'course-006', 'course-004', 'course-007', 'course-003']);
	});

	it('matches a keyword in title, summary, or tags regardless of case', async () => {
		const fromTitle = await search({ q: 'foundations' });
		const fromSummary = await search({ q: 'HARDENING' });
		const fromTag = await search({ q: 'facilitation' });
		const mixedCase = await search({ q: 'SeCuRiTy' });

		expect(ids(fromTitle.items)).toEqual(['course-001']);
		expect(ids(fromSummary.items)).toEqual(['course-008']);
		expect(ids(fromTag.items)).toEqual(['course-002']);
		expect(ids(mixedCase.items)).toEqual(['course-008', 'course-001', 'course-006', 'course-003', 'course-012']);
	});

	it('filters by modality, status, and tag', async () => {
		const online = await search({ modality: 'online' });
		const active = await search({ status: 'active' });
		const ai = await search({ tag: 'AI' });

		expect(online.items.every((course) => course.modality === 'online')).toBe(true);
		expect(ids(online.items)).toEqual(['course-001', 'course-011', 'course-009', 'course-006', 'course-004', 'course-012']);
		expect(active.items.every((course) => course.status === 'active')).toBe(true);
		expect(ids(active.items)).toEqual(['course-010', 'course-008', 'course-001', 'course-011', 'course-002', 'course-006', 'course-003']);
		expect(ids(ai.items)).toEqual(['course-010', 'course-001', 'course-004']);
	});

	it('combines keyword, modality, and status filters', async () => {
		const page = await search({ q: 'security', modality: 'online', status: 'active' });

		expect(ids(page.items)).toEqual(['course-001', 'course-006']);
	});

	it('returns the documented security example', async () => {
		const page = await search({ q: 'security', modality: 'online', status: 'active', tag: 'ai', page: '1', pageSize: '5', sort: 'title' });

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
		const first = await search({ page: '1', pageSize: '5' });
		const second = await search({ page: '2', pageSize: '5' });
		const third = await search({ page: '3', pageSize: '5' });
		const beyond = await search({ page: '9', pageSize: '5' });

		expect(first.totalItems).toBe(12);
		expect(first.totalPages).toBe(3);
		expect(ids(first.items)).toEqual(['course-010', 'course-008', 'course-001', 'course-011', 'course-002']);
		expect(ids(second.items)).toEqual(['course-009', 'course-006', 'course-004', 'course-007', 'course-003']);
		expect(ids(third.items)).toEqual(['course-005', 'course-012']);
		expect(beyond.items).toEqual([]);
		expect(beyond.totalItems).toBe(12);
		expect(beyond.page).toBe(9);
	});

	it('sorts by createdAt and updatedAt', async () => {
		const byCreatedAt = await search({ sort: 'createdAt', pageSize: '50' });
		const byUpdatedAt = await search({ sort: 'updatedAt', pageSize: '50' });
		const explicitTitle = await search({ sort: 'title' });

		expect(ids(byCreatedAt.items)).toEqual(['course-005', 'course-009', 'course-008', 'course-002', 'course-010', 'course-001', 'course-006', 'course-003', 'course-004', 'course-007', 'course-012', 'course-011']);
		expect(ids(byUpdatedAt.items)).toEqual(['course-005', 'course-009', 'course-008', 'course-002', 'course-010', 'course-004', 'course-007', 'course-003', 'course-001', 'course-006', 'course-012', 'course-011']);
		expect(ids(explicitTitle.items)).toEqual(ids((await search()).items));
	});

	it('returns an empty page when nothing matches', async () => {
		const page = await search({ q: 'zzzz-not-a-course' });

		expect(page).toEqual({ items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 0 });
	});

	it('rejects invalid modality, status, page, pageSize, and sort values', async () => {
		await expectInvalid({ modality: 'classroom' }, [{ field: 'modality', message: 'modality must be one of online, in-person, hybrid.' }]);
		await expectInvalid({ status: 'archived' }, [{ field: 'status', message: 'status must be one of draft, active, retired.' }]);
		await expectInvalid({ page: '0' }, [{ field: 'page', message: 'page must be an integer greater than or equal to 1.' }]);
		await expectInvalid({ page: '1.5' }, [{ field: 'page', message: 'page must be an integer greater than or equal to 1.' }]);
		await expectInvalid({ pageSize: '51' }, [{ field: 'pageSize', message: 'pageSize must be between 1 and 50.' }]);
		await expectInvalid({ pageSize: '0' }, [{ field: 'pageSize', message: 'pageSize must be between 1 and 50.' }]);
		await expectInvalid({ sort: 'rating' }, [{ field: 'sort', message: 'sort must be one of title, createdAt, updatedAt.' }]);
	});

	it('reports every invalid query parameter together', async () => {
		await expectInvalid({ modality: 'classroom', status: 'archived', page: '0', pageSize: '100', sort: 'rating' }, [
			{ field: 'modality', message: 'modality must be one of online, in-person, hybrid.' },
			{ field: 'status', message: 'status must be one of draft, active, retired.' },
			{ field: 'page', message: 'page must be an integer greater than or equal to 1.' },
			{ field: 'pageSize', message: 'pageSize must be between 1 and 50.' },
			{ field: 'sort', message: 'sort must be one of title, createdAt, updatedAt.' },
		]);
	});

	it('accepts the maximum page size', async () => {
		const page = await search({ pageSize: '50' });

		expect(page.pageSize).toBe(50);
		expect(page.items).toHaveLength(12);
		expect(page.totalPages).toBe(1);
	});
});

async function search(query: CourseQueryInput = {}) {
	const services = await buildApplicationServicesFactory({ environment: 'test' }).forRequest();
	return services.courses.search(query);
}

async function expectInvalid(query: CourseQueryInput, details: { field: string; message: string }[]) {
	const services = await buildApplicationServicesFactory({ environment: 'test' }).forRequest();
	let caught: unknown;
	try {
		services.courses.search(query);
	} catch (error) {
		caught = error;
	}
	expect(caught).toBeInstanceOf(InvalidQueryParameterError);
	expect(caught).toMatchObject({
		code: 'INVALID_QUERY_PARAMETER',
		message: 'One or more query parameters are invalid.',
		details,
	});
}

function ids(items: { id: string }[]): string[] {
	return items.map((item) => item.id);
}
