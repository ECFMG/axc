import { describe, expect, it } from 'vitest';
import { Course } from './course.aggregate.ts';

const course = (status: 'draft' | 'active' | 'retired' = 'active') =>
	Course.getNewInstance({
		id: 'c1',
		title: 'AI Security Foundations',
		summary: 'Secure development',
		modality: 'online',
		status,
		tags: ['AI', 'security'],
		createdAt: new Date(0),
		updatedAt: new Date(0),
	});

describe('Course', () => {
	it('matches keyword case-insensitively across title, summary and tags', () => {
		expect(course().matchesKeyword('SECURITY')).toBe(true);
		expect(course().matchesKeyword('development')).toBe(true);
		expect(course().matchesKeyword('cooking')).toBe(false);
	});

	it('matches tags case-insensitively', () => {
		expect(course().hasTag('ai')).toBe(true);
		expect(course().hasTag('a')).toBe(false);
	});

	it('is active only when status is active', () => {
		expect(course().isActive).toBe(true);
		expect(course('draft').isActive).toBe(false);
	});
});
