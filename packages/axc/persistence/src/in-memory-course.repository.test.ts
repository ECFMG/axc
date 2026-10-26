import { CourseSearchCriteria } from '@axc/domain';
import { describe, expect, it } from 'vitest';
import { courseSeed, InMemoryCourseRepository } from './index.ts';

const search = (raw: Record<string, string>) => new InMemoryCourseRepository(courseSeed).search(CourseSearchCriteria.parse(raw));

describe('InMemoryCourseRepository', () => {
	it('seeds at least 12 courses and paginates with defaults', async () => {
		const page = await search({});
		expect(page.totalItems).toBe(12);
		expect(page.items).toHaveLength(10);
	});

	it('sorts by title by default and by createdAt on request', async () => {
		const titles = (await search({ pageSize: '50' })).items.map((c) => c.props.title);
		expect(titles).toEqual([...titles].sort((a, b) => a.localeCompare(b)));
		const created = (await search({ sort: 'createdAt', pageSize: '50' })).items.map((c) => c.props.createdAt);
		expect(created).toEqual([...created].sort());
	});

	it('combines filters and pages', async () => {
		const page = await search({ q: 'security', modality: 'online', status: 'active', page: '1', pageSize: '1' });
		expect(page.totalItems).toBe(2);
		expect(page.items.map((c) => c.id)).toEqual(['course-003']);
		expect((await search({ q: 'nothing-matches' })).items).toEqual([]);
	});

	it('gets by id or throws', async () => {
		const repo = new InMemoryCourseRepository(courseSeed);
		expect((await repo.get('course-001')).props.status).toBe('active');
		await expect(repo.get('missing')).rejects.toThrow('not found');
	});
});
