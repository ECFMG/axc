import type { Domain } from '@axc/domain';
import { describe, expect, it } from 'vitest';
import { getCourseReadRepository } from './course.read-repository.ts';

type Course = Domain.Contexts.Catalog.Course.Course;

const courses: readonly Course[] = [
	{
		id: 'course-b',
		title: 'Beta Security Lab',
		summary: 'Hands-on lab.',
		modality: 'online',
		status: 'active',
		tags: ['ai', 'lab'],
		createdAt: '2026-02-01T00:00:00.000Z',
		updatedAt: '2026-03-01T00:00:00.000Z',
	},
	{
		id: 'course-a',
		title: 'Alpha Workshop',
		summary: 'Introductory security overview.',
		modality: 'in-person',
		status: 'draft',
		tags: ['leadership'],
		createdAt: '2026-01-01T00:00:00.000Z',
		updatedAt: '2026-04-01T00:00:00.000Z',
	},
	{
		id: 'course-c',
		title: 'Gamma Ops',
		summary: 'Operations course.',
		modality: 'hybrid',
		status: 'retired',
		tags: ['security'],
		createdAt: '2026-03-01T00:00:00.000Z',
		updatedAt: '2026-02-01T00:00:00.000Z',
	},
	{
		id: 'course-d',
		title: 'Delta AI',
		summary: 'Advanced prompts.',
		modality: 'online',
		status: 'active',
		tags: ['artificial-intelligence'],
		createdAt: '2026-04-01T00:00:00.000Z',
		updatedAt: '2026-05-01T00:00:00.000Z',
	},
];

const repo = getCourseReadRepository(courses);

describe('CourseReadRepository.search', () => {
	it('filters by case-insensitive keyword across title, summary, and tags', async () => {
		const result = await repo.search({
			q: 'SECURITY',
			modality: undefined,
			status: undefined,
			tag: undefined,
			page: 1,
			pageSize: 10,
			sort: 'title',
		});

		expect(result.totalItems).toBe(3);
		expect(result.items.map((course) => course.id)).toEqual(['course-a', 'course-b', 'course-c']);
	});

	it('filters modality, status, and exact tag equality', async () => {
		const byModality = await repo.search({
			q: undefined,
			modality: 'online',
			status: undefined,
			tag: undefined,
			page: 1,
			pageSize: 10,
			sort: 'title',
		});
		expect(byModality.items.map((course) => course.id)).toEqual(['course-b', 'course-d']);

		const byStatus = await repo.search({
			q: undefined,
			modality: undefined,
			status: 'draft',
			tag: undefined,
			page: 1,
			pageSize: 10,
			sort: 'title',
		});
		expect(byStatus.items.map((course) => course.id)).toEqual(['course-a']);

		const byTag = await repo.search({
			q: undefined,
			modality: undefined,
			status: undefined,
			tag: 'AI',
			page: 1,
			pageSize: 10,
			sort: 'title',
		});
		expect(byTag.items.map((course) => course.id)).toEqual(['course-b']);
	});

	it('sorts, tie-breaks by id, and paginates after filtering', async () => {
		const page = await repo.search({
			q: undefined,
			modality: undefined,
			status: undefined,
			tag: undefined,
			page: 2,
			pageSize: 2,
			sort: 'createdAt',
		});

		expect(page.totalItems).toBe(4);
		expect(page.items.map((course) => course.id)).toEqual(['course-c', 'course-d']);
	});
});
