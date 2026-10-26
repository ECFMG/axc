import { describe, expect, it } from 'vitest';
import { Course } from './course.aggregate.ts';

const course = new Course(
	{ id: 'c1', title: 'AI Security', summary: 'Secure dev', modality: 'online', status: 'active', tags: ['AI', 'security'], createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-02T00:00:00.000Z' },
	undefined,
);

describe('Course', () => {
	it('matches keyword in title, summary, tags case-insensitively', () => {
		expect(course.matchesKeyword('ai sec')).toBe(true);
		expect(course.matchesKeyword('SECURE')).toBe(true);
		expect(course.matchesKeyword('nope')).toBe(false);
	});
	it('matches tag exactly, case-insensitively', () => {
		expect(course.hasTag('ai')).toBe(true);
		expect(course.hasTag('a')).toBe(false);
	});
	it('exposes a reference copy', () => {
		expect(course.toReference()).toEqual(course.props);
	});
});
