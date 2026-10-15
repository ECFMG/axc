import { describe, expect, it } from 'vitest';
import { createInMemoryEnrollmentRequestRepository, createSeededCourseRepository } from './index.ts';

describe('in-memory repositories', () => {
	it('serves at least 12 seeded courses', async () => {
		const courses = await createSeededCourseRepository().list();
		expect(courses.length).toBeGreaterThanOrEqual(12);
		expect(courses.some((course) => course.id === 'course-001' && course.status === 'active')).toBe(true);
	});

	it('stores enrollment requests without exposing the stored object', async () => {
		const repository = createInMemoryEnrollmentRequestRepository();
		const saved = await repository.save({
			id: 'enroll-001',
			courseId: 'course-001',
			learnerEmail: 'learner@example.org',
			justification: 'I need this course to prepare for upcoming secure development work.',
			status: 'pending',
			createdAt: '2026-06-27T10:00:00.000Z',
			updatedAt: '2026-06-27T10:00:00.000Z',
			statusHistory: [{ fromStatus: null, toStatus: 'pending', changedAt: '2026-06-27T10:00:00.000Z', changedBy: 'system', reason: null }],
		});
		saved.status = 'approved';
		const listed = await repository.list();
		expect(listed[0]?.status).toBe('pending');
		expect(await repository.getById('missing')).toBeUndefined();
	});
});
