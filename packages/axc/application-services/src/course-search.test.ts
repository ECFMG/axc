import { describe, expect, it } from 'vitest';
import { ApplicationError } from './errors.ts';
import { buildApplicationServicesFactory } from './index.ts';

const documentedCourse = {
	id: 'course-001',
	title: 'AI Security Foundations',
	summary: 'Introductory course on secure AI-assisted development.',
	modality: 'online',
	status: 'active',
	tags: ['ai', 'security'],
	createdAt: '2026-01-15T00:00:00.000Z',
	updatedAt: '2026-06-01T00:00:00.000Z',
};

async function courses() {
	const services = await buildApplicationServicesFactory({ environment: 'test' }).forRequest();
	return services.courses;
}

async function errorOf(promise: Promise<unknown>): Promise<ApplicationError> {
	const error = await promise.then(
		() => undefined,
		(caught: unknown) => caught,
	);
	expect(error).toBeInstanceOf(ApplicationError);
	if (!(error instanceof ApplicationError)) {
		throw new Error('expected ApplicationError');
	}
	return error;
}

describe('course search', () => {
	it('returns the default page sorted by title', async () => {
		const page = await (await courses()).search({});

		expect(page.page).toBe(1);
		expect(page.pageSize).toBe(10);
		expect(page.totalItems).toBe(12);
		expect(page.totalPages).toBe(2);
		expect(page.items).toHaveLength(10);
		expect(page.items[0]).toEqual(documentedCourse);
		expect(page.items[9]?.id).toBe('course-010');
		expect(page.items.map((item) => item.title)).toEqual([...page.items.map((item) => item.title)].sort());
	});

	it('matches a keyword in the title, summary, or tags regardless of case', async () => {
		const catalog = await courses();
		const lower = await catalog.search({ q: 'security' });
		const mixed = await catalog.search({ q: 'SeCuRiTy' });
		const ids = lower.items.map((item) => item.id);

		expect(ids).toEqual(mixed.items.map((item) => item.id));
		expect(ids).toEqual(['course-001', 'course-003', 'course-006', 'course-010', 'course-011']);
		const tagOnly = lower.items.find((item) => item.id === 'course-006');
		const summaryOnly = lower.items.find((item) => item.id === 'course-011');
		expect(tagOnly?.title.toLowerCase().includes('security')).toBe(false);
		expect(tagOnly?.summary.toLowerCase().includes('security')).toBe(false);
		expect(summaryOnly?.title.toLowerCase().includes('security')).toBe(false);
		expect(summaryOnly?.tags.some((tag) => tag.toLowerCase().includes('security'))).toBe(false);
	});

	it('filters by modality, status, and tag', async () => {
		const catalog = await courses();

		const online = await catalog.search({ modality: 'online' });
		expect(online.totalItems).toBe(5);
		expect(online.items.every((item) => item.modality === 'online')).toBe(true);

		const active = await catalog.search({ status: 'active' });
		expect(active.totalItems).toBe(7);
		expect(active.items.every((item) => item.status === 'active')).toBe(true);

		const tagged = await catalog.search({ tag: 'AI' });
		expect(tagged.items.map((item) => item.id)).toEqual(['course-001', 'course-008']);
	});

	it('combines keyword, modality, and status filters', async () => {
		const page = await (await courses()).search({ q: 'security', modality: 'online', status: 'active' });

		expect(page.items.map((item) => item.id)).toEqual(['course-001', 'course-011']);
	});

	it('returns the documented course for the example query', async () => {
		const page = await (await courses()).search({
			q: 'security',
			modality: 'online',
			status: 'active',
			tag: 'ai',
			page: '1',
			pageSize: '5',
			sort: 'title',
		});

		expect(page).toEqual({
			items: [documentedCourse],
			page: 1,
			pageSize: 5,
			totalItems: 1,
			totalPages: 1,
		});
	});

	it('limits a page and sorts by createdAt or updatedAt', async () => {
		const catalog = await courses();
		const paged = await catalog.search({ page: '1', pageSize: '5' });
		expect(paged.items).toHaveLength(5);
		expect(paged.totalItems).toBe(12);
		expect(paged.totalPages).toBe(3);

		const second = await catalog.search({ page: '2', pageSize: '10' });
		expect(second.items.map((item) => item.id)).toEqual(['course-011', 'course-012']);

		const byCreated = await catalog.search({ sort: 'createdAt', pageSize: '50' });
		expect(byCreated.items[0]?.id).toBe('course-009');
		expect(byCreated.items[11]?.id).toBe('course-012');
		expect(byCreated.items.map((item) => item.createdAt)).toEqual([...byCreated.items.map((item) => item.createdAt)].sort());

		const byUpdated = await catalog.search({ sort: 'updatedAt', pageSize: '50' });
		expect(byUpdated.items[0]?.id).toBe('course-002');
		expect(byUpdated.items[11]?.id).toBe('course-009');
	});

	it('returns an empty page when nothing matches', async () => {
		const page = await (await courses()).search({ q: 'zzzz-not-a-course' });

		expect(page).toEqual({
			items: [],
			page: 1,
			pageSize: 10,
			totalItems: 0,
			totalPages: 0,
		});
	});

	it('returns an empty item list past the last page', async () => {
		const page = await (await courses()).search({ page: '3', pageSize: '10' });

		expect(page.items).toEqual([]);
		expect(page.totalItems).toBe(12);
		expect(page.totalPages).toBe(2);
	});

	it('rejects invalid query parameters', async () => {
		const error = await errorOf((await courses()).search({ modality: 'classroom', status: 'open', page: '0', pageSize: '51', sort: 'popularity', limit: '1' }));

		expect(error.code).toBe('INVALID_QUERY_PARAMETER');
		expect(error.message).toBe('One or more query parameters are invalid.');
		expect(error.details.map((detail) => detail.field).sort()).toEqual(['limit', 'modality', 'page', 'pageSize', 'sort', 'status']);
		expect(error.details.find((detail) => detail.field === 'pageSize')?.message).toBe('pageSize must be between 1 and 50.');
	});

	it('rejects a repeated query parameter', async () => {
		const error = await errorOf((await courses()).search({ page: ['1', '2'] }));

		expect(error.code).toBe('INVALID_QUERY_PARAMETER');
		expect(error.details).toEqual([{ field: 'page', message: 'page must be provided once.' }]);
	});

	it('accepts the maximum page size', async () => {
		const page = await (await courses()).search({ pageSize: '50' });

		expect(page.pageSize).toBe(50);
		expect(page.items).toHaveLength(12);
		expect(page.totalPages).toBe(1);
	});
});
