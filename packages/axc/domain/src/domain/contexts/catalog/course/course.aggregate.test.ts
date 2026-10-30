import { describe, expect, it } from 'vitest';
import { Course } from './course.aggregate.ts';

const props = { id: 'c1', title: 'T', summary: 'S', modality: 'online', status: 'active', tags: ['ai'], createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-02T00:00:00.000Z' } as const;

describe('Course', () => {
	it('exposes props and a reference copy', () => {
		const course = Course.getNewInstance({ ...props, tags: ['ai'] });
		expect(course.id).toBe('c1');
		expect([course.title, course.summary, course.modality, course.status, course.createdAt, course.updatedAt]).toEqual(['T', 'S', 'online', 'active', props.createdAt, props.updatedAt]);
		expect(course.tags).toEqual(['ai']);
		expect(course.toReference()).toEqual({ ...props, tags: ['ai'] });
	});
	it('rejects invalid modality', () => {
		expect(() => Course.getNewInstance({ ...props, tags: [], modality: 'remote' as never })).toThrow();
	});
});
