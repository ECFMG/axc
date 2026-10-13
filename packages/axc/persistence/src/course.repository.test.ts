import type { CourseSearchCriteria } from '@axc/domain';
import { describe, expect, it } from 'vitest';
import { InMemoryCourseRepository } from './course.repository.ts';
import { courseSeed } from './course-seed.ts';

const repo = new InMemoryCourseRepository();
const search = (c: Partial<CourseSearchCriteria> = {}) => repo.search({ sort: 'title', page: 1, pageSize: 50, ...c });

describe('InMemoryCourseRepository', () => {
	it('seeds at least 12 courses covering every modality and status', () => {
		expect(courseSeed.length).toBeGreaterThanOrEqual(12);
		expect(new Set(courseSeed.map((c) => c.modality)).size).toBe(3);
		expect(new Set(courseSeed.map((c) => c.status)).size).toBe(3);
	});

	it('gets by id and rejects unknown ids', async () => {
		expect((await repo.get('course-001')).props.title).toBe('AI Security Foundations');
		await expect(repo.get('nope')).rejects.toThrow('not found');
	});

	it('searches q case-insensitively across title, summary and tags', async () => {
		const { items } = await search({ q: 'SECURITY' });
		expect(items.map((c) => c.id).sort()).toEqual(['course-001', 'course-003', 'course-007', 'course-012']);
	});

	it('filters by modality, status and tag (case-insensitive)', async () => {
		expect((await search({ modality: 'hybrid' })).items.every((c) => c.props.modality === 'hybrid')).toBe(true);
		expect((await search({ status: 'retired' })).items.map((c) => c.id)).toEqual(['course-011', 'course-006']);
		expect((await search({ tag: 'ai' })).items.map((c) => c.id)).toEqual(['course-001', 'course-008', 'course-002']);
	});

	it('combines q, modality and status', async () => {
		const { items } = await search({ q: 'security', modality: 'online', status: 'active' });
		expect(items.map((c) => c.id)).toEqual(['course-001']);
	});

	it('paginates and reports the total', async () => {
		const page2 = await search({ page: 2, pageSize: 5 });
		expect(page2.items).toHaveLength(5);
		expect(page2.totalItems).toBe(courseSeed.length);
		expect((await search({ page: 4, pageSize: 5 })).items).toEqual([]);
	});

	it('sorts by title by default and by createdAt / updatedAt ascending', async () => {
		const titles = (await search()).items.map((c) => c.props.title);
		expect(titles).toEqual([...titles].sort((a, b) => a.localeCompare(b)));
		const created = (await search({ sort: 'createdAt' })).items.map((c) => c.props.createdAt);
		expect(created).toEqual([...created].sort());
		expect((await search({ sort: 'updatedAt' })).items[0]?.id).toBe('course-011');
	});

	it('returns no items when nothing matches', async () => {
		expect(await search({ q: 'zzz-no-match' })).toEqual({ items: [], totalItems: 0 });
	});
});
