import type { Course } from '@axc/domain';
import { expect, it } from 'vitest';
import { createCoursesService } from './courses.ts';

it('breaks sort ties by id and leaves catalog order intact', async () => {
	const base: Course = { id: 'b', title: 'Same title', summary: '', modality: 'online', status: 'active', tags: [], createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' };
	const courses = [base, { ...base, id: 'a' }];
	const service = createCoursesService({ list: () => Promise.resolve(courses) });
	for (const sort of ['title', 'createdAt', 'updatedAt'] as const) {
		expect((await service.search({ page: 1, pageSize: 1, sort })).items.map((c) => c.id)).toEqual(['a']);
	}
	expect(courses.map((c) => c.id)).toEqual(['b', 'a']);
});
