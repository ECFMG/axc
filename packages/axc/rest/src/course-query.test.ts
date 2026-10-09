import { buildApplicationServicesFactory } from '@axc/application-services';
import { beforeAll, describe, expect, it } from 'vitest';
import { createRestApp } from './index.ts';

interface CourseItem {
	id: string;
	title: string;
	summary: string;
	modality: string;
	status: string;
	tags: string[];
	createdAt: string;
	updatedAt: string;
}

interface CoursePage {
	items: CourseItem[];
	page: number;
	pageSize: number;
	totalItems: number;
	totalPages: number;
}

interface QueryError {
	error: {
		code: string;
		message: string;
		details: { field: string; message: string }[];
	};
}

const app = createRestApp(buildApplicationServicesFactory({ environment: 'test' }));

const titles = (page: CoursePage): string[] => page.items.map((item) => item.title);

describe('GET /api/courses', () => {
	beforeAll(async () => {
		const response = await app.request('/api/courses');
		expect(response.status).toBe(200);
	}, 120_000);

	it('returns the first page sorted by title with default pagination', async () => {
		const body = (await (await app.request('/api/courses')).json()) as CoursePage;

		expect(body.page).toBe(1);
		expect(body.pageSize).toBe(10);
		expect(body.totalItems).toBe(12);
		expect(body.totalPages).toBe(2);
		expect(body.items).toHaveLength(10);
		expect(titles(body)).toEqual([
			'AI Security Foundations',
			'Badge Design Studio',
			'Classroom Leadership',
			'Data Privacy Hybrid',
			'Draft Onboarding Path',
			'Evening Writing Lab',
			'Field Safety Drill',
			'Hybrid Facilitation Lab',
			'Legacy Systems Archive',
			'Mentoring Circle',
		]);
		expect(body.items[0]).toMatchObject({
			id: '000000000000000000000001',
			modality: 'online',
			status: 'active',
			tags: ['ai', 'security'],
			createdAt: '2026-01-15T00:00:00.000Z',
			updatedAt: '2026-06-01T00:00:00.000Z',
		});
	});

	it('matches q across title, summary, and tags without case sensitivity', async () => {
		const body = (await (await app.request('/api/courses?q=SECURITY')).json()) as CoursePage;

		expect(titles(body).sort()).toEqual(['AI Security Foundations', 'Badge Design Studio', 'Platform Hardening']);
		expect(body.totalItems).toBe(3);
	});

	it('filters by modality, status, and tag', async () => {
		const online = (await (await app.request('/api/courses?modality=online&pageSize=50')).json()) as CoursePage;
		const active = (await (await app.request('/api/courses?status=active&pageSize=50')).json()) as CoursePage;
		const ai = (await (await app.request('/api/courses?tag=AI&pageSize=50')).json()) as CoursePage;

		expect(online.items.every((item) => item.modality === 'online')).toBe(true);
		expect(online.totalItems).toBe(6);
		expect(active.items.every((item) => item.status === 'active')).toBe(true);
		expect(active.totalItems).toBe(7);
		expect(titles(ai).sort()).toEqual(['AI Security Foundations', 'Hybrid Facilitation Lab', 'Mentoring Circle']);
	});

	it('combines keyword, modality, and status filters', async () => {
		const body = (await (await app.request('/api/courses?q=security&modality=online&status=active')).json()) as CoursePage;

		expect(titles(body).sort()).toEqual(['AI Security Foundations', 'Platform Hardening']);
		expect(body.items.every((item) => item.modality === 'online' && item.status === 'active')).toBe(true);
	});

	it('paginates with page and pageSize', async () => {
		const first = (await (await app.request('/api/courses?page=1&pageSize=5&sort=title')).json()) as CoursePage;
		const last = (await (await app.request('/api/courses?page=3&pageSize=5&sort=title')).json()) as CoursePage;

		expect(first.items).toHaveLength(5);
		expect(first.page).toBe(1);
		expect(first.pageSize).toBe(5);
		expect(first.totalItems).toBe(12);
		expect(first.totalPages).toBe(3);
		expect(titles(first)).toEqual(['AI Security Foundations', 'Badge Design Studio', 'Classroom Leadership', 'Data Privacy Hybrid', 'Draft Onboarding Path']);
		expect(titles(last)).toEqual(['Platform Hardening', 'Zoning Workshop']);
		expect(last.totalPages).toBe(3);
	});

	it('sorts by createdAt', async () => {
		const body = (await (await app.request('/api/courses?sort=createdAt&pageSize=50')).json()) as CoursePage;

		expect(titles(body)[0]).toBe('Zoning Workshop');
		expect(titles(body)[11]).toBe('Field Safety Drill');
		expect(body.items.map((item) => item.createdAt)).toEqual([...body.items.map((item) => item.createdAt)].sort());
	});

	it('returns an empty page when nothing matches', async () => {
		const body = (await (await app.request('/api/courses?q=not-a-course-xyz')).json()) as CoursePage;

		expect(body).toEqual({ items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 0 });
	});

	it('returns 400 for invalid query parameters', async () => {
		const response = await app.request('/api/courses?modality=classroom&status=published&page=0&pageSize=51&sort=rank&limit=1');
		const body = (await response.json()) as QueryError;

		expect(response.status).toBe(400);
		expect(body.error.code).toBe('INVALID_QUERY_PARAMETER');
		expect(body.error.message).toBe('One or more query parameters are invalid.');
		expect(body.error.details.map((detail) => detail.field).sort()).toEqual(['limit', 'modality', 'page', 'pageSize', 'sort', 'status']);
		expect(body.error.details.find((detail) => detail.field === 'pageSize')?.message).toBe('pageSize must be between 1 and 50.');
	});
});
