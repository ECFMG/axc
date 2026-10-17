import { describe, expect, it } from 'vitest';
import { createStore } from '../../../store.ts';
import { getCourseReadRepository } from './course.read-repository.ts';

describe('CourseReadRepository', () => {
	it('returns domain references without sharing mutable fixture tags', async () => {
		const store = createStore();
		const repo = getCourseReadRepository(store);
		const found = await repo.getById('course-001');
		if (!found) throw new Error('Course missing');
		found.tags.push('tampered');
		expect((await repo.getById('course-001'))?.tags).toEqual(['ai', 'security']);
		const listed = await repo.list();
		listed[0]?.tags.push('tampered');
		expect(store.courses[0]?.tags).toEqual(['ai', 'security']);
	});
});
