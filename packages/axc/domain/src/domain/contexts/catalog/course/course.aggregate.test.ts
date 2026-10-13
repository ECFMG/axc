import { describe, expect, it } from 'vitest';
import { Course } from './course.aggregate.ts';

const course = new Course({
	id: 'c1',
	title: 'AI Security Foundations',
	summary: 'Secure development basics.',
	modality: 'online',
	status: 'active',
	tags: ['AI', 'security'],
	createdAt: '2026-01-01T00:00:00.000Z',
	updatedAt: '2026-01-02T00:00:00.000Z',
});

describe('Course', () => {
	it('exposes its id', () => expect(course.id).toBe('c1'));
	it('matches keywords in title, summary and tags regardless of case', () => {
		expect(course.matchesKeyword('SECURITY')).toBe(true);
		expect(course.matchesKeyword('development')).toBe(true);
		expect(course.matchesKeyword('ai')).toBe(true);
		expect(course.matchesKeyword('kubernetes')).toBe(false);
	});
	it('matches tags exactly regardless of case', () => {
		expect(course.hasTag('ai')).toBe(true);
		expect(course.hasTag('sec')).toBe(false);
	});
});
