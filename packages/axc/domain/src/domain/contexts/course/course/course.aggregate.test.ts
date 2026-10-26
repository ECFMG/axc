import { describe, expect, it } from 'vitest';
import { Course } from './course.aggregate.ts';
import { CourseSearchCriteria } from './course.value-objects.ts';

const course = new Course(
	{ id: 'c1', title: 'Secure Coding', summary: 'Threat modeling basics', modality: 'online', status: 'active', tags: ['Security', 'AI'], createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
	undefined,
);
const matches = (raw: Record<string, string>) => course.matches(CourseSearchCriteria.parse(raw));

describe('Course', () => {
	it('matches keyword case-insensitively across title, summary and tags', () => {
		expect(matches({ q: 'SECURE' })).toBe(true);
		expect(matches({ q: 'threat' })).toBe(true);
		expect(matches({ q: 'ai' })).toBe(true);
		expect(matches({ q: 'cooking' })).toBe(false);
	});

	it('matches modality, status and exact tag filters', () => {
		expect(matches({ modality: 'online', status: 'active', tag: 'security' })).toBe(true);
		expect(matches({ modality: 'hybrid' })).toBe(false);
		expect(matches({ status: 'draft' })).toBe(false);
		expect(matches({ tag: 'sec' })).toBe(false);
	});

	it('is active only with active status', () => {
		expect(course.isActive).toBe(true);
		expect(course.toReference()).toEqual(course.props);
	});
});
