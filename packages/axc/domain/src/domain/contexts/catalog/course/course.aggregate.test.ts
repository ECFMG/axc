import { describe, expect, it } from 'vitest';
import { Course } from './course.aggregate.ts';

describe('Course aggregate', () => {
	it('creates a draft with a stable reference', () => {
		const course = Course.getNewInstance({ id: 'course-new', title: '', summary: '', modality: 'online', status: 'active', tags: [], createdAt: '', updatedAt: '' }, 'Course', 'Description', 'hybrid', ['ai']);
		expect(course.status).toBe('draft');
		expect(course.modality).toBe('hybrid');
		expect(course.tags).toEqual(['ai']);
		expect(course.toReference().id).toBe('course-new');
		expect(() => Course.getNewInstance({ id: 'bad', title: '', summary: '', modality: 'online', status: 'draft', tags: [], createdAt: '', updatedAt: '' }, 'Title', 'Summary', 'invalid' as 'online', [])).toThrow('modality');
	});
});
