import type { Course, CourseRepository } from '@axc/domain';
import { describe, expect, it } from 'vitest';
import { createCourseService } from './courses.ts';

const base: Course = { id: 'b', title: 'Same', summary: 'A security introduction', modality: 'online', status: 'active', tags: ['AI'], createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-06-01T00:00:00.000Z' };
const records = [base, { ...base, id: 'a' }, { ...base, id: 'c', status: 'draft' as const }];
const repository: CourseRepository = {
	list: async () => records,
	get: async () => base,
	save: async (course) => course,
};

describe('course search service', () => {
	it('combines filters, breaks sort ties by ID, and paginates matching records', async () => {
		const service = createCourseService(repository);
		expect(await service.search({ q: 'SECURITY', tag: 'ai', modality: 'online', status: 'active', sort: 'title', page: 2, pageSize: 1 })).toEqual({ items: [base], totalItems: 2, totalPages: 2, page: 2, pageSize: 1 });
		expect(records.map((course) => course.id)).toEqual(['b', 'a', 'c']);
	});
	it('propagates repository failures', async () => {
		const service = createCourseService({
			...repository,
			list: () => Promise.reject(new Error('storage unavailable')),
		});
		await expect(service.search({ sort: 'title', page: 1, pageSize: 10 })).rejects.toThrow('storage unavailable');
	});
});
