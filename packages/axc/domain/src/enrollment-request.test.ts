import { describe, expect, it } from 'vitest';
import { createEnrollmentRequest, isValidJustification, isValidLearnerEmail, isValidTransition, withStatusChange } from './enrollment-request.ts';

const newRequest = () =>
	createEnrollmentRequest({
		id: 'enroll-001',
		courseId: 'course-001',
		learnerEmail: 'learner@example.org',
		justification: 'I need this course to prepare for upcoming secure development work.',
		changedBy: 'system',
		now: '2026-06-27T10:00:00.000Z',
	});

describe('enrollment request validation', () => {
	it('accepts a well formed learner email and refuses malformed ones', () => {
		expect(isValidLearnerEmail('learner@example.org')).toBe(true);
		expect(isValidLearnerEmail('learner-at-example.org')).toBe(false);
		expect(isValidLearnerEmail('learner@example')).toBe(false);
		expect(isValidLearnerEmail(42)).toBe(false);
	});

	it('bounds justification between 20 and 500 characters', () => {
		expect(isValidJustification('too short')).toBe(false);
		expect(isValidJustification('x'.repeat(20))).toBe(true);
		expect(isValidJustification('x'.repeat(500))).toBe(true);
		expect(isValidJustification('x'.repeat(501))).toBe(false);
	});
});

describe('enrollment request lifecycle', () => {
	it('starts pending with an opening audit entry', () => {
		const request = newRequest();
		expect(request.status).toBe('pending');
		expect(request.statusHistory).toEqual([{ fromStatus: null, toStatus: 'pending', changedAt: '2026-06-27T10:00:00.000Z', changedBy: 'system', reason: null }]);
	});

	it('allows only the documented transitions', () => {
		expect(isValidTransition('pending', 'approved')).toBe(true);
		expect(isValidTransition('pending', 'rejected')).toBe(true);
		expect(isValidTransition('pending', 'cancelled')).toBe(true);
		expect(isValidTransition('approved', 'cancelled')).toBe(true);
		expect(isValidTransition('approved', 'rejected')).toBe(false);
		expect(isValidTransition('rejected', 'approved')).toBe(false);
		expect(isValidTransition('cancelled', 'pending')).toBe(false);
	});

	it('appends an audit entry on every status change', () => {
		const approved = withStatusChange(newRequest(), { toStatus: 'approved', changedBy: 'reviewer@example.org', now: '2026-06-28T10:00:00.000Z' });
		const cancelled = withStatusChange(approved, { toStatus: 'cancelled', changedBy: 'reviewer@example.org', reason: 'Course withdrawn.', now: '2026-06-29T10:00:00.000Z' });

		expect(cancelled.status).toBe('cancelled');
		expect(cancelled.updatedAt).toBe('2026-06-29T10:00:00.000Z');
		expect(cancelled.statusHistory).toHaveLength(3);
		expect(cancelled.statusHistory[1]).toMatchObject({ fromStatus: 'pending', toStatus: 'approved', reason: null });
		expect(cancelled.statusHistory[2]).toMatchObject({ fromStatus: 'approved', toStatus: 'cancelled', reason: 'Course withdrawn.' });
	});
});
