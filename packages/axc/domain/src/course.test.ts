import { describe, expect, it } from 'vitest';
import { type Course, type CourseSearchCriteria, compareCourses, matchesCourse } from './course.ts';

const course: Course = {
	id: 'course-001',
	title: 'AI Security Foundations',
	summary: 'Introductory course on secure AI-assisted development.',
	modality: 'online',
	status: 'active',
	tags: ['ai', 'security'],
	createdAt: '2026-01-15T00:00:00.000Z',
	updatedAt: '2026-06-01T00:00:00.000Z',
};

const criteria = (overrides: Partial<CourseSearchCriteria>): CourseSearchCriteria => ({ page: 1, pageSize: 10, sort: 'title', ...overrides });

describe('course search rules', () => {
	it('matches keywords case-insensitively across title, summary and tags', () => {
		expect(matchesCourse(course, criteria({ q: 'SECURITY' }))).toBe(true);
		expect(matchesCourse(course, criteria({ q: 'ai-assisted' }))).toBe(true);
		expect(matchesCourse(course, criteria({ q: 'kubernetes' }))).toBe(false);
	});

	it('filters by modality, status and tag', () => {
		expect(matchesCourse(course, criteria({ modality: 'online', status: 'active', tag: 'AI' }))).toBe(true);
		expect(matchesCourse(course, criteria({ modality: 'hybrid' }))).toBe(false);
		expect(matchesCourse(course, criteria({ status: 'draft' }))).toBe(false);
		expect(matchesCourse(course, criteria({ tag: 'devops' }))).toBe(false);
	});

	it('compares on the requested field', () => {
		const other: Course = { ...course, title: 'Zero Trust Networking', createdAt: '2025-01-15T00:00:00.000Z' };
		expect(compareCourses(course, other, 'title')).toBeLessThan(0);
		expect(compareCourses(course, other, 'createdAt')).toBeGreaterThan(0);
	});
});
