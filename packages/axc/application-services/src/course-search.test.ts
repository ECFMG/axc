import { describe, expect, it } from 'vitest';
import { ApiError, type ApplicationServices, buildApplicationServicesFactory } from './index.ts';

const TITLE_ORDER = ['course-001', 'course-005', 'course-003', 'course-004', 'course-007', 'course-010', 'course-009', 'course-006', 'course-008', 'course-011', 'course-012', 'course-002'];
const CREATED_ORDER = ['course-006', 'course-001', 'course-005', 'course-002', 'course-008', 'course-003', 'course-009', 'course-004', 'course-010', 'course-007', 'course-011', 'course-012'];
const UPDATED_ORDER = ['course-008', 'course-006', 'course-005', 'course-009', 'course-001', 'course-002', 'course-003', 'course-004', 'course-007', 'course-010', 'course-012', 'course-011'];

async function openServices(): Promise<ApplicationServices> {
	return await buildApplicationServicesFactory({ environment: 'test' }).forRequest();
}

function expectApiError(run: () => unknown, status: number, code: string): ApiError {
	try {
		run();
	} catch (error) {
		expect(error).toBeInstanceOf(ApiError);
		if (!(error instanceof ApiError)) {
			throw error;
		}
		expect(error.status).toBe(status);
		expect(error.code).toBe(code);
		return error;
	}
	throw new Error('expected an ApiError');
}

describe('course search', () => {
	it('returns the first page of 10 courses sorted by title', async () => {
		const services = await openServices();
		const page = services.courses.search({});

		expect(page.page).toBe(1);
		expect(page.pageSize).toBe(10);
		expect(page.totalItems).toBe(12);
		expect(page.totalPages).toBe(2);
		expect(page.items.map((course) => course.id)).toEqual(TITLE_ORDER.slice(0, 10));
		expect(page.items[0]).toMatchObject({
			id: 'course-001',
			title: 'AI Security Foundations',
			summary: 'Introductory course on secure AI-assisted development.',
			modality: 'online',
			status: 'active',
			tags: ['ai', 'security'],
			createdAt: '2026-01-15T00:00:00.000Z',
			updatedAt: '2026-06-01T00:00:00.000Z',
		});
	});

	it('matches q against title, summary, and tags regardless of case', async () => {
		const services = await openServices();
		const page = services.courses.search({ q: ['SeCuRiTy'] });
		const ids = page.items.map((course) => course.id);

		expect(ids).toEqual(['course-001', 'course-003', 'course-009', 'course-002']);
		expect(ids).toContain('course-003');
		expect(ids).toContain('course-009');
		expect(page.items.every((course) => [course.title, course.summary, ...course.tags].join('\n').toLowerCase().includes('security'))).toBe(true);
	});

	it('filters by modality, status, and tag', async () => {
		const services = await openServices();

		expect(services.courses.search({ modality: ['online'] }).items.map((course) => course.id)).toEqual(['course-001', 'course-005', 'course-003', 'course-008', 'course-011']);
		expect(services.courses.search({ status: ['active'] }).items.map((course) => course.id)).toEqual(['course-001', 'course-003', 'course-004', 'course-007', 'course-010', 'course-011', 'course-002']);
		expect(services.courses.search({ tag: ['AI'] }).items.map((course) => course.id)).toEqual(['course-001', 'course-005', 'course-011']);
		const securityTags = services.courses.search({ tag: ['security'] }).items.map((course) => course.id);
		expect(securityTags).toEqual(['course-001', 'course-009', 'course-002']);
		expect(securityTags).not.toContain('course-003');
	});

	it('combines keyword, modality, and status filters', async () => {
		const services = await openServices();
		const page = services.courses.search({ q: ['security'], modality: ['online'], status: ['active'] });

		expect(page.items.map((course) => course.id)).toEqual(['course-001', 'course-003']);
		expect(services.courses.search({ q: ['security'], modality: ['online'], status: ['active'], tag: ['ai'] }).items.map((course) => course.id)).toEqual(['course-001']);
	});

	it('paginates with page and pageSize', async () => {
		const services = await openServices();
		const first = services.courses.search({ page: ['1'], pageSize: ['5'] });
		const second = services.courses.search({ page: ['2'], pageSize: ['5'] });
		const third = services.courses.search({ page: ['3'], pageSize: ['5'] });

		expect(first.items).toHaveLength(5);
		expect(first.page).toBe(1);
		expect(first.pageSize).toBe(5);
		expect(first.totalItems).toBe(12);
		expect(first.totalPages).toBe(3);
		expect(first.items.map((course) => course.id)).toEqual(TITLE_ORDER.slice(0, 5));
		expect(second.items.map((course) => course.id)).toEqual(TITLE_ORDER.slice(5, 10));
		expect(third.items.map((course) => course.id)).toEqual(TITLE_ORDER.slice(10));
		expect(services.courses.search({ pageSize: ['50'] }).items).toHaveLength(12);
	});

	it('sorts by createdAt and updatedAt', async () => {
		const services = await openServices();

		expect(services.courses.search({ sort: ['createdAt'], pageSize: ['50'] }).items.map((course) => course.id)).toEqual(CREATED_ORDER);
		expect(services.courses.search({ sort: ['updatedAt'], pageSize: ['50'] }).items.map((course) => course.id)).toEqual(UPDATED_ORDER);
	});

	it('returns an empty page when nothing matches', async () => {
		const services = await openServices();
		const page = services.courses.search({ q: ['not-a-course-keyword'], page: ['2'], pageSize: ['5'] });

		expect(page).toEqual({ items: [], page: 2, pageSize: 5, totalItems: 0, totalPages: 0 });
	});

	it('rejects invalid query parameters', async () => {
		const services = await openServices();
		const error = expectApiError(() => services.courses.search({ modality: ['classroom'], status: ['published'], page: ['0'], pageSize: ['51'], sort: ['popularity'] }), 400, 'INVALID_QUERY_PARAMETER');

		expect(error.message).toBe('One or more query parameters are invalid.');
		expect(error.details.map((detail) => detail.field)).toEqual(['modality', 'status', 'page', 'pageSize', 'sort']);
		expect(error.details.find((detail) => detail.field === 'pageSize')?.message).toBe('pageSize must be between 1 and 50.');
		expectApiError(() => services.courses.search({ page: ['abc'] }), 400, 'INVALID_QUERY_PARAMETER');
		expectApiError(() => services.courses.search({ pageSize: ['0'] }), 400, 'INVALID_QUERY_PARAMETER');
		expectApiError(() => services.courses.search({ modality: ['online', 'hybrid'] }), 400, 'INVALID_QUERY_PARAMETER');
	});
});
