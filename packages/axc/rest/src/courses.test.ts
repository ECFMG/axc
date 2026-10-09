import { buildApplicationServicesFactory, type CoursePage } from '@axc/application-services';
import { describe, expect, it } from 'vitest';
import { createRestApp } from './index.ts';

const courses: CoursePage['items'] = Array.from({ length: 12 }, (_, index) => ({
	id: `course-${index}`,
	title: index === 0 ? 'Security Foundations' : `Training ${index.toString().padStart(2, '0')}`,
	summary: index === 1 ? 'Learn SECURITY practices' : 'Hands-on training',
	tags: index === 2 ? ['Security', 'AI'] : ['ai', 'development'],
	modality: index % 3 === 0 ? 'online' : index % 3 === 1 ? 'in-person' : 'hybrid',
	status: index % 3 === 0 ? 'active' : index % 3 === 1 ? 'draft' : 'retired',
	createdAt: `2026-01-${(12 - index).toString().padStart(2, '0')}T00:00:00.000Z`,
	updatedAt: `2026-06-${(index + 1).toString().padStart(2, '0')}T00:00:00.000Z`,
}));
const app = createRestApp(buildApplicationServicesFactory({ environment: 'test', courseCatalog: { list: () => Promise.resolve(courses) } }));
async function list(query = ''): Promise<CoursePage> {
	const response = await app.request(`/api/courses${query}`);
	expect(response.status).toBe(200);
	return response.json();
}

describe('GET /api/courses', () => {
	it('returns defaults and every course field', async () => {
		const body = await list();
		expect(body).toMatchObject({ page: 1, pageSize: 10, totalItems: 12, totalPages: 2 });
		expect(body.items).toHaveLength(10);
		expect(body.items[0]).toEqual(courses[0]);
	});
	it('searches title, summary, and tags case-insensitively', async () => {
		const body = await list('?q=sEcUrItY');
		expect(body.items.map((course) => course.id)).toEqual(['course-0', 'course-1', 'course-2']);
	});
	it.each(['online', 'in-person', 'hybrid'])('filters modality %s', async (modality) => {
		const body = await list(`?modality=${modality}`);
		expect(body.totalItems).toBe(4);
		expect(body.items.every((course) => course.modality === modality)).toBe(true);
	});
	it.each(['draft', 'active', 'retired'])('filters status %s', async (status) => {
		const body = await list(`?status=${status}`);
		expect(body.totalItems).toBe(4);
		expect(body.items.every((course) => course.status === status)).toBe(true);
	});
	it('matches whole tags case-insensitively', async () => {
		expect((await list('?tag=SECURITY')).items.map((course) => course.id)).toEqual(['course-2']);
		expect((await list('?tag=sec')).items).toEqual([]);
	});
	it('combines keyword, modality and status', async () => {
		expect((await list('?q=security&modality=online&status=active')).items.map((course) => course.id)).toEqual(['course-0']);
	});
	it('combines tag and status', async () => {
		expect((await list('?tag=security&status=retired')).items.map((course) => course.id)).toEqual(['course-2']);
	});
	it('paginates after filtering and sorting', async () => {
		const first = await list('?page=1&pageSize=5');
		const second = await list('?page=2&pageSize=5');
		const last = await list('?page=3&pageSize=5');
		expect(second).toMatchObject({ page: 2, pageSize: 5, totalItems: 12, totalPages: 3 });
		expect([...first.items, ...second.items, ...last.items]).toEqual(courses);
		expect(last.items).toHaveLength(2);
		expect((await list('?page=4&pageSize=5')).items).toEqual([]);
		expect((await list('?pageSize=50')).items).toHaveLength(12);
	});
	it.each(['title', 'createdAt', 'updatedAt'] as const)('sorts ascending by %s', async (sort) => {
		const body = await list(`?sort=${sort}&pageSize=50`);
		expect(body.items).toEqual([...courses].sort((a, b) => a[sort].localeCompare(b[sort])));
	});
	it('returns valid metadata when no courses match', async () => {
		expect(await list('?q=nonexistent&page=2&pageSize=5')).toEqual({ items: [], page: 2, pageSize: 5, totalItems: 0, totalPages: 0 });
	});
	it.each([
		['modality', 'remote'],
		['status', 'published'],
		['sort', 'id'],
		['page', '0'],
		['page', '-1'],
		['page', '1.5'],
		['page', 'abc'],
		['page', ''],
		['page', '9007199254740992'],
		['pageSize', '0'],
		['pageSize', '51'],
		['pageSize', '-1'],
		['pageSize', '1.5'],
		['pageSize', 'abc'],
		['pageSize', '1e1'],
		['pageSize', ''],
		['modality', ''],
		['status', ''],
		['sort', ''],
		['unknown', 'x'],
	])('rejects %s=%s with the consistent error response', async (field, value) => {
		const response = await app.request(`/api/courses?${field}=${value}`);
		expect(response.status).toBe(400);
		expect(await response.json()).toMatchObject({
			error: {
				code: 'INVALID_QUERY_PARAMETER',
				message: 'One or more query parameters are invalid.',
				details: [{ field, message: expect.any(String) }],
			},
		});
	});
	it('rejects repeated query parameters', async () => {
		const response = await app.request('/api/courses?page=1&page=2');
		expect(response.status).toBe(400);
		expect(await response.json()).toMatchObject({ error: { details: [{ field: 'page' }] } });
	});
	it('reports all validation failures together', async () => {
		const response = await app.request('/api/courses?modality=no&status=no&pageSize=51');
		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.error.details.map((detail: { field: string }) => detail.field)).toEqual(['modality', 'status', 'pageSize']);
	});
});
