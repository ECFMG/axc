import { type ApplicationServicesFactory, buildApplicationServicesFactory, type Course } from '@axc/application-services';
import { describe, expect, it, vi } from 'vitest';
import { createRestApp } from './index.ts';

// Local fixtures, independent from the seed.
// title order (case-insensitive): r1 Alpha, r2 beta, r3 Charlie, r4 delta
// createdAt order: r3, r1, r4, r2 | updatedAt order: r4, r2, r3, r1
const r1: Course = {
	id: 'r1',
	title: 'Alpha Security',
	summary: 'Securing services.',
	modality: 'online',
	status: 'active',
	tags: ['ai', 'security'],
	createdAt: '2026-01-02T00:00:00.000Z',
	updatedAt: '2026-09-01T00:00:00.000Z',
};
const r2: Course = {
	id: 'r2',
	title: 'beta Clouds',
	summary: 'Cloud SECURITY patterns.',
	modality: 'hybrid',
	status: 'active',
	tags: ['cloud'],
	createdAt: '2026-04-01T00:00:00.000Z',
	updatedAt: '2026-05-01T00:00:00.000Z',
};
const r3: Course = {
	id: 'r3',
	title: 'Charlie Ethics',
	summary: 'Responsible practice.',
	modality: 'online',
	status: 'draft',
	tags: ['AI', 'ethics'],
	createdAt: '2025-11-01T00:00:00.000Z',
	updatedAt: '2026-06-01T00:00:00.000Z',
};
const r4: Course = {
	id: 'r4',
	title: 'delta Design',
	summary: 'Design systems.',
	modality: 'in-person',
	status: 'retired',
	tags: ['design'],
	createdAt: '2026-02-01T00:00:00.000Z',
	updatedAt: '2026-03-01T00:00:00.000Z',
};

const fixtures: readonly Course[] = [r4, r2, r3, r1];

const factoryFor = (courses: readonly Course[]): ApplicationServicesFactory => buildApplicationServicesFactory({ environment: 'test', courseRepository: { getAll: () => Promise.resolve(courses) } });

const appFor = (courses: readonly Course[] = fixtures) => createRestApp(factoryFor(courses));

interface CoursePageBody {
	items: Course[];
	page: number;
	pageSize: number;
	totalItems: number;
	totalPages: number;
}

const getPage = async (path: string, courses: readonly Course[] = fixtures): Promise<CoursePageBody> => {
	const response = await appFor(courses).request(path);
	expect(response.status).toBe(200);
	return (await response.json()) as CoursePageBody;
};

const ids = (body: CoursePageBody): string[] => body.items.map((course) => course.id);

const invalidQueryBody = (details: { field: string; message: string }[]) => ({
	error: {
		code: 'INVALID_QUERY_PARAMETER',
		message: 'One or more query parameters are invalid.',
		details,
	},
});

describe('GET /api/courses', () => {
	describe('success', () => {
		it('returns 200 JSON with the default page sorted by title', async () => {
			const response = await appFor().request('/api/courses');

			expect(response.status).toBe(200);
			expect(response.headers.get('content-type')).toMatch(/^application\/json/);
			expect(await response.json()).toEqual({ items: [r1, r2, r3, r4], page: 1, pageSize: 10, totalItems: 4, totalPages: 1 });
		});

		it('filters by q across title, summary, and tags case-insensitively', async () => {
			expect(ids(await getPage('/api/courses?q=SECURITY'))).toEqual(['r1', 'r2']);
		});

		it('filters by modality', async () => {
			expect(ids(await getPage('/api/courses?modality=online'))).toEqual(['r1', 'r3']);
		});

		it('filters by status', async () => {
			expect(ids(await getPage('/api/courses?status=active'))).toEqual(['r1', 'r2']);
		});

		it('filters by tag case-insensitively', async () => {
			expect(ids(await getPage('/api/courses?tag=ai'))).toEqual(['r1', 'r3']);
		});

		it('combines q, modality, and status', async () => {
			expect(ids(await getPage('/api/courses?q=security&modality=online&status=active'))).toEqual(['r1']);
		});

		it('combines tag and status', async () => {
			expect(ids(await getPage('/api/courses?tag=AI&status=draft'))).toEqual(['r3']);
		});

		it('paginates with page and pageSize and reports metadata', async () => {
			const body = await getPage('/api/courses?page=2&pageSize=3');

			expect(body).toEqual({ items: [r4], page: 2, pageSize: 3, totalItems: 4, totalPages: 2 });
		});

		it('returns no more than pageSize items', async () => {
			const body = await getPage('/api/courses?page=1&pageSize=2');

			expect(body.items).toHaveLength(2);
			expect(body).toMatchObject({ page: 1, pageSize: 2, totalItems: 4, totalPages: 2 });
		});

		it('returns 200 with empty items for a page beyond the end', async () => {
			expect(await getPage('/api/courses?page=5&pageSize=2')).toEqual({ items: [], page: 5, pageSize: 2, totalItems: 4, totalPages: 2 });
		});

		it('sorts by createdAt', async () => {
			expect(ids(await getPage('/api/courses?sort=createdAt'))).toEqual(['r3', 'r1', 'r4', 'r2']);
		});

		it('sorts by updatedAt', async () => {
			expect(ids(await getPage('/api/courses?sort=updatedAt'))).toEqual(['r4', 'r2', 'r3', 'r1']);
		});

		it('returns 200 with empty items when nothing matches', async () => {
			const response = await appFor().request('/api/courses?q=quantum');

			expect(response.status).toBe(200);
			expect(await response.json()).toEqual({ items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 0 });
		});

		it('passes the Authorization header through to the application services factory', async () => {
			const real = factoryFor(fixtures);
			const forRequest = vi.fn((rawAuthHeader?: string) => real.forRequest(rawAuthHeader));
			const app = createRestApp({ forRequest });

			const response = await app.request('/api/courses', { headers: { Authorization: 'Bearer token-123' } });

			expect(response.status).toBe(200);
			expect(forRequest).toHaveBeenCalledWith('Bearer token-123');
		});
	});

	describe('invalid query parameters', () => {
		it.each([
			['modality', '/api/courses?modality=remote', 'modality must be one of: online, in-person, hybrid.'],
			['status', '/api/courses?status=archived', 'status must be one of: draft, active, retired.'],
			['page', '/api/courses?page=0', 'page must be a positive integer.'],
			['page', '/api/courses?page=abc', 'page must be a positive integer.'],
			['pageSize', '/api/courses?pageSize=51', 'pageSize must be between 1 and 50.'],
			['pageSize', '/api/courses?pageSize=0', 'pageSize must be between 1 and 50.'],
			['sort', '/api/courses?sort=name', 'sort must be one of: title, createdAt, updatedAt.'],
		])('returns 400 with the error contract for invalid %s (%s)', async (field, path, message) => {
			const response = await appFor().request(path);

			expect(response.status).toBe(400);
			expect(response.headers.get('content-type')).toMatch(/^application\/json/);
			expect(await response.json()).toEqual(invalidQueryBody([{ field, message }]));
		});

		it('returns 400 for an unsupported query parameter', async () => {
			const response = await appFor().request('/api/courses?category=x');

			expect(response.status).toBe(400);
			expect(await response.json()).toEqual(invalidQueryBody([{ field: 'category', message: 'category is not a supported query parameter.' }]));
		});

		it('returns 400 for a parameter given more than once', async () => {
			const response = await appFor().request('/api/courses?page=1&page=2');

			expect(response.status).toBe(400);
			expect(await response.json()).toEqual(invalidQueryBody([{ field: 'page', message: 'page must be specified at most once.' }]));
		});

		it('returns every error in one 400 response', async () => {
			const response = await appFor().request('/api/courses?sort=name&modality=remote&pageSize=100');

			expect(response.status).toBe(400);
			expect(await response.json()).toEqual(
				invalidQueryBody([
					{ field: 'modality', message: 'modality must be one of: online, in-person, hybrid.' },
					{ field: 'pageSize', message: 'pageSize must be between 1 and 50.' },
					{ field: 'sort', message: 'sort must be one of: title, createdAt, updatedAt.' },
				]),
			);
		});
	});
});

describe('GET /health', () => {
	it('still returns the health contract', async () => {
		const response = await appFor().request('/health');

		expect(response.status).toBe(200);
		expect(await response.json()).toMatchObject({ status: 'ok', service: 'agentCourses-api', projectCode: 'axc', environment: 'test' });
	});
});
