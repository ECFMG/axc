import { describe, expect, it } from 'vitest';
import { type Course, compareCourses, matchesCriteria } from './course.ts';

const course = (overrides: Partial<Course> = {}): Course => ({
	id: 'course-001',
	title: 'AI Security Foundations',
	summary: 'Introductory course on secure AI-assisted development.',
	modality: 'online',
	status: 'active',
	tags: ['ai', 'Security'],
	createdAt: '2026-01-15T00:00:00.000Z',
	updatedAt: '2026-06-01T00:00:00.000Z',
	...overrides,
});

const base = { page: 1, pageSize: 10, sort: 'title' } as const;

describe('matchesCriteria', () => {
	it('matches every course when no filter is supplied', () => {
		expect(matchesCriteria(course(), base)).toBe(true);
	});

	it('matches the keyword against title, summary and tags case-insensitively', () => {
		expect(matchesCriteria(course(), { ...base, q: 'SECURITY' })).toBe(true);
		expect(matchesCriteria(course(), { ...base, q: 'ai-assisted' })).toBe(true);
		expect(matchesCriteria(course({ title: 'Networking', summary: 'Routing' }), { ...base, q: 'ai' })).toBe(true);
		expect(matchesCriteria(course({ title: 'Networking', summary: 'Routing', tags: [] }), { ...base, q: 'security' })).toBe(false);
	});

	it('filters on modality, status and tag', () => {
		expect(matchesCriteria(course(), { ...base, modality: 'online' })).toBe(true);
		expect(matchesCriteria(course(), { ...base, modality: 'hybrid' })).toBe(false);
		expect(matchesCriteria(course(), { ...base, status: 'active' })).toBe(true);
		expect(matchesCriteria(course(), { ...base, status: 'retired' })).toBe(false);
		expect(matchesCriteria(course(), { ...base, tag: 'SECURITY' })).toBe(true);
		expect(matchesCriteria(course(), { ...base, tag: 'secur' })).toBe(false);
	});

	it('requires every supplied filter to match', () => {
		expect(matchesCriteria(course(), { ...base, q: 'security', modality: 'online', status: 'draft' })).toBe(false);
		expect(matchesCriteria(course(), { ...base, q: 'security', modality: 'online', status: 'active' })).toBe(true);
	});
});

describe('compareCourses', () => {
	it('sorts ascending by the requested field', () => {
		const older = course({ id: 'course-002', title: 'Zebra', createdAt: '2025-01-01T00:00:00.000Z' });
		expect([course(), older].sort(compareCourses('title'))[0]?.title).toBe('AI Security Foundations');
		expect([course(), older].sort(compareCourses('createdAt'))[0]?.id).toBe('course-002');
	});

	it('breaks ties on id', () => {
		const first = course({ id: 'course-001' });
		const second = course({ id: 'course-002' });
		expect([second, first].sort(compareCourses('title')).map((entry) => entry.id)).toStrictEqual(['course-001', 'course-002']);
	});
});
