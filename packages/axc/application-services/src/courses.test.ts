import { describe, expect, it } from 'vitest';
import { type Course, listCourses } from './courses.ts';
import { buildApplicationServicesFactory } from './index.ts';

const searchable = (course: Course): string => `${course.title}\n${course.summary}\n${course.tags.join('\n')}`.toLowerCase();

describe('listCourses', () => {
	it('returns a default page from a catalog of at least 12 courses', () => {
		const page = listCourses({ page: 1, pageSize: 10, sort: 'title' });

		expect(page.page).toBe(1);
		expect(page.pageSize).toBe(10);
		expect(page.totalItems).toBeGreaterThanOrEqual(12);
		expect(page.items).toHaveLength(10);
		expect(page.totalPages).toBe(Math.ceil(page.totalItems / 10));
	});

	it('matches q against title, summary, and tags regardless of case', () => {
		const page = listCourses({ page: 1, pageSize: 50, sort: 'title', q: 'SeCuRiTy' });

		expect(page.items.length).toBeGreaterThan(0);
		expect(page.items.every((course) => searchable(course).includes('security'))).toBe(true);

		const summaryOnly = listCourses({ page: 1, pageSize: 50, sort: 'title', q: 'AwArEnEsS' });
		expect(summaryOnly.totalItems).toBeGreaterThan(0);
		expect(summaryOnly.items.every((course) => searchable(course).includes('awareness'))).toBe(true);
	});

	it('filters by modality, status, and tag', () => {
		const online = listCourses({ page: 1, pageSize: 50, sort: 'title', modality: 'online' });
		expect(online.items.length).toBeGreaterThan(0);
		expect(online.items.every((course) => course.modality === 'online')).toBe(true);

		const active = listCourses({ page: 1, pageSize: 50, sort: 'title', status: 'active' });
		expect(active.items.length).toBeGreaterThan(0);
		expect(active.items.every((course) => course.status === 'active')).toBe(true);

		const tagged = listCourses({ page: 1, pageSize: 50, sort: 'title', tag: 'AI' });
		expect(tagged.items.length).toBeGreaterThan(0);
		expect(tagged.items.every((course) => course.tags.some((tag) => tag.toLowerCase() === 'ai'))).toBe(true);
	});

	it('combines keyword, modality, and status', () => {
		const page = listCourses({ page: 1, pageSize: 50, sort: 'title', q: 'security', modality: 'online', status: 'active' });

		expect(page.items.length).toBeGreaterThan(0);
		expect(page.items.every((course) => course.modality === 'online' && course.status === 'active' && searchable(course).includes('security'))).toBe(true);
	});

	it('paginates and sorts by createdAt differently from title', () => {
		const second = listCourses({ page: 2, pageSize: 5, sort: 'title' });
		const all = listCourses({ page: 1, pageSize: 50, sort: 'title' });

		expect(second.items).toHaveLength(5);
		expect(second.totalItems).toBe(all.totalItems);
		expect(second.totalPages).toBe(Math.ceil(all.totalItems / 5));

		const byTitle = all.items.map((course) => course.id);
		const byCreated = listCourses({ page: 1, pageSize: 50, sort: 'createdAt' });
		const stamps = byCreated.items.map((course) => course.createdAt);
		expect(byCreated.items.map((course) => course.id)).not.toEqual(byTitle);
		expect([...stamps].sort()).toEqual(stamps);

		const updated = listCourses({ page: 1, pageSize: 50, sort: 'updatedAt' }).items.map((course) => course.updatedAt);
		expect([...updated].sort()).toEqual(updated);
	});

	it('returns an empty page when nothing matches', () => {
		const page = listCourses({ page: 1, pageSize: 10, sort: 'title', q: 'zzzz-no-such-course' });

		expect(page.items).toEqual([]);
		expect(page.totalItems).toBe(0);
		expect(page.totalPages).toBe(0);
		expect(page.page).toBe(1);
	});

	it('is exposed by the application service factory', async () => {
		const services = await buildApplicationServicesFactory({ environment: 'test' }).forRequest();
		const page = services.courses.list({ page: 1, pageSize: 10, sort: 'title' });

		expect(page.items).toHaveLength(10);
		expect(page.totalItems).toBeGreaterThanOrEqual(12);
	});
});
