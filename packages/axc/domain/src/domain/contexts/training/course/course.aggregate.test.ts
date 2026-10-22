import { describe, expect, it } from 'vitest';
import { Course } from './course.aggregate.ts';

describe('Course aggregate', () => {
	it('creates a valid course and protects its tags', () => {
		const course = Course.getNewInstance({ id: 'one', title: 'A Course', summary: 'Summary', modality: 'online', status: 'active', tags: ['ai'], createdAt: '2026-01-01', updatedAt: '2026-01-01' });
		course.tags.push('other');
		expect(course.tags).toEqual(['ai']);
	});
	it('rejects invalid modality and status', () => {
		const props = { id: 'one', title: 'A Course', summary: 'Summary', modality: 'online' as const, status: 'active' as const, tags: [], createdAt: 'x', updatedAt: 'x' };
		expect(() => Course.getNewInstance({ ...props, modality: 'remote' as 'online' })).toThrow();
		expect(() => Course.getNewInstance({ ...props, status: 'hidden' as 'active' })).toThrow();
	});
});
