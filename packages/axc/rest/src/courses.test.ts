import { buildApplicationServicesFactory, courseCatalogSeed } from '@axc/application-services';
import { describe, expect, it } from 'vitest';
import { createRestApp } from './index.ts';

const titleOrder = ['course-009', 'course-001', 'course-004', 'course-010', 'course-003', 'course-005', 'course-002', 'course-008', 'course-006', 'course-012', 'course-007', 'course-011'];

interface CourseBody {
	items: Array<{
		id: string;
		title: string;
		summary: string;
		modality: string;
		status: string;
		tags: string[];
		createdAt: string;
		updatedAt: string;
	}>;
	page: number;
	pageSize: number;
	totalItems: number;
	totalPages: number;
}

interface ErrorBody {
	error: {
		code: string;
		message: string;
		details: Array<{ field: string; message: string }>;
	};
}

function catalogApp() {
	return createRestApp(buildApplicationServicesFactory({ environment: 'test' }, courseCatalogSeed));
}

async function getJson<T>(path: string): Promise<{ status: number; body: T }> {
	const response = await catalogApp().request(path);
	return { status: response.status, body: (await response.json()) as T };
}

const ids = (body: CourseBody) => body.items.map((item) => item.id);

describe('GET /api/courses', () => {
	it('returns the first page of 10 courses sorted by title', async () => {
		expect(courseCatalogSeed.length).toBeGreaterThanOrEqual(12);
		expect(new Set(courseCatalogSeed.map((course) => course.modality)).size).toBe(3);
		expect(new Set(courseCatalogSeed.map((course) => course.status)).size).toBe(3);

		const { status, body } = await getJson<CourseBody>('/api/courses');

		expect(status).toBe(200);
		expect(body.page).toBe(1);
		expect(body.pageSize).toBe(10);
		expect(body.totalItems).toBe(12);
		expect(body.totalPages).toBe(2);
		expect(ids(body)).toEqual(titleOrder.slice(0, 10));
	});

	it('matches q across title, summary, and tags without case sensitivity', async () => {
		const { status, body } = await getJson<CourseBody>('/api/courses?q=SeCuRiTy');

		expect(status).toBe(200);
		expect(ids(body)).toEqual(['course-001', 'course-003', 'course-002']);
		expect(body.items[0]?.title).toContain('Security');
		expect(body.items[1]?.tags).toContain('Security');
		expect(body.items[2]?.summary.toLowerCase()).toContain('security');
	});

	it('filters by modality, status, and tag', async () => {
		const modality = await getJson<CourseBody>('/api/courses?modality=online');
		const status = await getJson<CourseBody>('/api/courses?status=active');
		const tag = await getJson<CourseBody>('/api/courses?tag=AI');

		expect(modality.status).toBe(200);
		expect(ids(modality.body)).toEqual(['course-001', 'course-010', 'course-006', 'course-007']);
		expect(modality.body.items.every((item) => item.modality === 'online')).toBe(true);
		expect(ids(status.body)).toEqual(['course-001', 'course-010', 'course-005', 'course-002', 'course-011']);
		expect(status.body.items.every((item) => item.status === 'active')).toBe(true);
		expect(ids(tag.body)).toEqual(['course-001', 'course-010', 'course-005']);
	});

	it('combines keyword, modality, and status filters', async () => {
		const { status, body } = await getJson<CourseBody>('/api/courses?q=security&modality=online&status=active');

		expect(status).toBe(200);
		expect(body.items).toEqual([
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
		]);
		expect(body.totalItems).toBe(1);
		expect(body.totalPages).toBe(1);
	});

	it('paginates with page and pageSize', async () => {
		const first = await getJson<CourseBody>('/api/courses?page=1&pageSize=5&sort=title');
		const second = await getJson<CourseBody>('/api/courses?page=2&pageSize=5');
		const pastEnd = await getJson<CourseBody>('/api/courses?page=3&pageSize=10');

		expect(first.body.items).toHaveLength(5);
		expect(first.body.page).toBe(1);
		expect(first.body.pageSize).toBe(5);
		expect(first.body.totalItems).toBe(12);
		expect(first.body.totalPages).toBe(3);
		expect(ids(first.body)).toEqual(titleOrder.slice(0, 5));
		expect(ids(second.body)).toEqual(titleOrder.slice(5, 10));
		expect(pastEnd.status).toBe(200);
		expect(pastEnd.body.items).toEqual([]);
		expect(pastEnd.body.totalItems).toBe(12);
		expect(pastEnd.body.totalPages).toBe(2);
	});

	it('sorts by createdAt and updatedAt', async () => {
		const created = await getJson<CourseBody>('/api/courses?sort=createdAt&pageSize=50');
		const updated = await getJson<CourseBody>('/api/courses?sort=updatedAt&pageSize=50');

		expect(created.status).toBe(200);
		expect(ids(created.body)).toEqual(['course-004', 'course-001', 'course-007', 'course-002', 'course-009', 'course-003', 'course-011', 'course-005', 'course-006', 'course-008', 'course-010', 'course-012']);
		expect(ids(updated.body)).toEqual(['course-007', 'course-002', 'course-009', 'course-003', 'course-011', 'course-004', 'course-005', 'course-006', 'course-001', 'course-008', 'course-010', 'course-012']);
	});

	it('returns an empty page when nothing matches', async () => {
		const { status, body } = await getJson<CourseBody>('/api/courses?q=zzzz-no-such-course');

		expect(status).toBe(200);
		expect(body.items).toEqual([]);
		expect(body.page).toBe(1);
		expect(body.pageSize).toBe(10);
		expect(body.totalItems).toBe(0);
		expect(body.totalPages).toBe(0);
	});

	it('rejects invalid query parameters', async () => {
		const pageSize = await getJson<ErrorBody>('/api/courses?pageSize=0');
		const combined = await getJson<ErrorBody>('/api/courses?modality=Online&status=published&page=-1&pageSize=51&sort=name&extra=1');

		expect(pageSize.status).toBe(400);
		expect(pageSize.body).toEqual({
			error: {
				code: 'INVALID_QUERY_PARAMETER',
				message: 'One or more query parameters are invalid.',
				details: [{ field: 'pageSize', message: 'pageSize must be between 1 and 50.' }],
			},
		});
		expect(combined.status).toBe(400);
		expect(combined.body).toEqual({
			error: {
				code: 'INVALID_QUERY_PARAMETER',
				message: 'One or more query parameters are invalid.',
				details: [
					{ field: 'modality', message: 'modality must be online, in-person, or hybrid.' },
					{ field: 'status', message: 'status must be draft, active, or retired.' },
					{ field: 'page', message: 'page must be an integer greater than or equal to 1.' },
					{ field: 'pageSize', message: 'pageSize must be between 1 and 50.' },
					{ field: 'sort', message: 'sort must be title, createdAt, or updatedAt.' },
					{ field: 'extra', message: 'Unknown query parameter.' },
				],
			},
		});
	});

	it('keeps the healthcheck route', async () => {
		const { status, body } = await getJson<{ status: string; service: string }>('/health');

		expect(status).toBe(200);
		expect(body.status).toBe('ok');
		expect(body.service).toBe('agentCourses-api');
	});
});
