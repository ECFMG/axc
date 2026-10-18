import { buildApplicationServicesFactory } from '@axc/application-services';
import type { Domain } from '@axc/domain';
import { Persistence } from '@axc/persistence';
import { describe, expect, it } from 'vitest';
import { createRestApp } from '../index.ts';

type Result = Domain.Contexts.Catalog.Course.CourseSearchResult;
const app = createRestApp(buildApplicationServicesFactory({ environment: 'test', dataSourcesFactory: Persistence() }));
const get = async (query = '') => {
	const response = await app.request(`/api/courses${query}`);
	expect(response.status).toBe(200);
	return (await response.json()) as Result;
};
describe('course catalog HTTP contract', () => {
	it('A1 A7 A-AC1 returns default pagination and all model fields', async () => {
		const body = await get();
		expect(body).toMatchObject({ page: 1, pageSize: 10, totalItems: 12, totalPages: 2 });
		expect(body.items).toHaveLength(10);
		expect(body.items.find((course) => course.id === 'course-001')).toEqual({
			id: 'course-001',
			title: 'AI Security Foundations',
			summary: 'Introductory course on secure AI-assisted development.',
			modality: 'online',
			status: 'active',
			tags: ['ai', 'security'],
			createdAt: '2026-01-15T00:00:00.000Z',
			updatedAt: '2026-12-20T00:00:00.000Z',
		});
	});
	it('A3 A-AC2 searches title, summary and tags case-insensitively', async () => {
		const body = await get('?q=SeCuRiTy');
		expect(body.items.map((c) => c.id)).toEqual(['course-001', 'course-002', 'course-003']);
	});
	it.each([
		['modality=online', ['course-004', 'course-001', 'course-002', 'course-007', 'course-011']],
		['status=active', ['course-001', 'course-005', 'course-002', 'course-006', 'course-009', 'course-011']],
		['tag=AI', ['course-004', 'course-001', 'course-009']],
		['tag=sec', []],
		['q=security&modality=online&status=active', ['course-001', 'course-002']],
		['modality=hybrid&status=active&tag=AI', ['course-009']],
	])('A2 A4 A5 A6 A-AC3 A-AC4 A-AC5 A-AC11 filters %s', async (query, ids) => {
		expect((await get(`?${query}`)).items.map((c) => c.id)).toEqual(ids);
	});
	it('A7 A-AC6 pages without overlap, accepts the maximum, and handles out-of-range pages', async () => {
		const first = await get('?page=1&pageSize=5');
		const second = await get('?page=2&pageSize=5');
		const third = await get('?page=3&pageSize=5');
		expect(first).toMatchObject({ page: 1, pageSize: 5, totalItems: 12, totalPages: 3 });
		expect(first.items).toHaveLength(5);
		expect(second.items).toHaveLength(5);
		expect(third.items).toHaveLength(2);
		expect(new Set([...first.items, ...second.items, ...third.items].map((c) => c.id)).size).toBe(12);
		expect((await get('?pageSize=50')).items).toHaveLength(12);
		expect((await get('?page=999999999999999&pageSize=50')).items).toEqual([]);
	});
	it.each(['title', 'createdAt', 'updatedAt'] as const)('A8 A-AC7 sorts ascending by %s before paging', async (sort) => {
		const body = await get(`?sort=${sort}&pageSize=50`);
		expect(body.items).toHaveLength(12);
		const values = body.items.map((c) => c[sort]);
		expect(values).toEqual([...values].sort((a, b) => a.localeCompare(b)));
		expect((await get(`?sort=${sort}&page=2&pageSize=5`)).items).toEqual(body.items.slice(5, 10));
	});
	it('A-AC9 returns empty results and valid metadata', async () => {
		expect(await get('?q=missing-course')).toEqual({ items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 0 });
	});
	it.each([
		['modality', 'remote'],
		['status', 'published'],
		['sort', 'id'],
		['page', '0'],
		['page', '-1'],
		['page', '1.5'],
		['page', '1e2'],
		['page', '99999999999999999999'],
		['pageSize', '0'],
		['pageSize', '51'],
		['pageSize', 'abc'],
		['pageSize', '1.5'],
		['pageSize', '99999999999999999999'],
		...['q', 'tag', 'modality', 'status', 'sort', 'page', 'pageSize'].map((field) => [field, '']),
		['q', '   '],
		['tag', '   '],
		['unknown', 'value'],
	])('A9 A-AC8 rejects %s=%s with the consistent contract', async (field, value) => {
		const response = await app.request(`/api/courses?${field}=${encodeURIComponent(value ?? '')}`);
		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body).toEqual({ error: { code: 'INVALID_QUERY_PARAMETER', message: 'One or more query parameters are invalid.', details: expect.arrayContaining([{ field, message: expect.any(String) }]) } });
	});
	it('A9 collects all failures and rejects duplicate parameters', async () => {
		const response = await app.request('/api/courses?status=no&modality=no&page=0&pageSize=51&sort=no&q=a&q=b');
		expect(response.status).toBe(400);
		const body = (await response.json()) as { error: { details: { field: string }[] } };
		expect(body.error.details.map((p) => p.field).sort()).toEqual(['modality', 'page', 'pageSize', 'q', 'sort', 'status']);
	});
	it('A-AC10 keeps health routing working', async () => {
		const response = await app.request('/health');
		expect(response.status).toBe(200);
		expect(await response.json()).toMatchObject({ status: 'ok', service: 'agentCourses-api' });
	});
});
