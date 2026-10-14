import { Domain } from '@axc/domain';
import { describe, expect, it } from 'vitest';
import { seededCourses } from './course.seed.ts';

const { COURSE_MODALITIES, COURSE_STATUSES } = Domain.Contexts.Catalog.Course;

describe('seededCourses', () => {
	it('includes at least 12 mixed catalog courses and the spec example', () => {
		expect(seededCourses.length).toBeGreaterThanOrEqual(12);

		const example = seededCourses.find((course) => course.id === 'course-001');
		expect(example).toEqual({
			id: 'course-001',
			title: 'AI Security Foundations',
			summary: 'Introductory course on secure AI-assisted development.',
			modality: 'online',
			status: 'active',
			tags: ['ai', 'security'],
			createdAt: '2026-01-15T00:00:00.000Z',
			updatedAt: '2026-06-01T00:00:00.000Z',
		});

		expect(new Set(seededCourses.map((course) => course.modality))).toEqual(new Set(COURSE_MODALITIES));
		expect(new Set(seededCourses.map((course) => course.status))).toEqual(new Set(COURSE_STATUSES));
		expect(seededCourses.some((course) => course.title.toLowerCase().includes('security'))).toBe(true);
		expect(seededCourses.some((course) => course.summary.toLowerCase().includes('security'))).toBe(true);
		expect(seededCourses.some((course) => course.tags.some((tag) => tag.toLowerCase().includes('security')))).toBe(true);
		expect(seededCourses.some((course) => course.tags.some((tag) => tag.toLowerCase() === 'ai'))).toBe(true);
	});
});
