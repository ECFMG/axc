import { describe, expect, it } from 'vitest';
import type { Course } from '../course/course.ts';
import { CourseNotActiveError, CourseNotFoundError, DuplicateActiveRequestError, InvalidRequestError, InvalidStatusTransitionError } from './enrollment-request.errors.ts';
import { assertCourseAllowsEnrollment, assertNoDuplicateActiveRequest, EnrollmentRequest } from './enrollment-request.ts';

const now = '2026-06-27T10:00:00.000Z';
const later = '2026-06-27T11:00:00.000Z';
const justification = 'I need this course to prepare for upcoming secure development work.';

function activeCourse(): Course {
	return {
		id: 'course-001',
		title: 'AI Security Foundations',
		summary: 'Introductory course on secure AI-assisted development.',
		modality: 'online',
		status: 'active',
		tags: ['ai', 'security'],
		createdAt: '2026-01-15T00:00:00.000Z',
		updatedAt: '2026-06-01T00:00:00.000Z',
	};
}

function createPending() {
	return EnrollmentRequest.create({
		id: 'enroll-001',
		courseId: 'course-001',
		learnerEmail: 'learner@example.org',
		justification,
		now,
	});
}

describe('EnrollmentRequest', () => {
	it('creates a pending request with an initial status history entry', () => {
		const snapshot = createPending().snapshot();

		expect(snapshot.status).toBe('pending');
		expect(snapshot.learnerEmail).toBe('learner@example.org');
		expect(snapshot.statusHistory).toStrictEqual([
			{
				fromStatus: null,
				toStatus: 'pending',
				changedAt: now,
				changedBy: 'system',
				reason: null,
			},
		]);
	});

	it('rejects an invalid learner email', () => {
		expect(() =>
			EnrollmentRequest.create({
				id: 'enroll-001',
				courseId: 'course-001',
				learnerEmail: 'not-an-email',
				justification,
				now,
			}),
		).toThrow(InvalidRequestError);
	});

	it('rejects a justification shorter than 20 characters', () => {
		expect(() =>
			EnrollmentRequest.create({
				id: 'enroll-001',
				courseId: 'course-001',
				learnerEmail: 'learner@example.org',
				justification: 'Too short.',
				now,
			}),
		).toThrow(InvalidRequestError);
	});

	it('allows pending to approved, rejected, and cancelled, and approved to cancelled', () => {
		const approved = createPending();
		approved.changeStatus({ status: 'approved', changedBy: 'reviewer@example.org', reason: undefined, now: later });
		expect(approved.snapshot().status).toBe('approved');
		expect(approved.snapshot().statusHistory).toHaveLength(2);

		const rejected = createPending();
		rejected.changeStatus({
			status: 'rejected',
			changedBy: 'reviewer@example.org',
			reason: 'Learner has not completed the prerequisite course.',
			now: later,
		});
		expect(rejected.snapshot().status).toBe('rejected');
		expect(rejected.snapshot().statusHistory[1]?.reason).toBe('Learner has not completed the prerequisite course.');

		const cancelledPending = createPending();
		cancelledPending.changeStatus({ status: 'cancelled', changedBy: 'reviewer@example.org', reason: undefined, now: later });
		expect(cancelledPending.snapshot().status).toBe('cancelled');

		const cancelledApproved = createPending();
		cancelledApproved.changeStatus({ status: 'approved', changedBy: 'reviewer@example.org', reason: undefined, now: later });
		cancelledApproved.changeStatus({ status: 'cancelled', changedBy: 'reviewer@example.org', reason: undefined, now: '2026-06-27T12:00:00.000Z' });
		expect(cancelledApproved.snapshot().status).toBe('cancelled');
		expect(cancelledApproved.snapshot().statusHistory).toHaveLength(3);
	});

	it('rejects an invalid status transition', () => {
		const request = createPending();
		request.changeStatus({ status: 'approved', changedBy: 'reviewer@example.org', reason: undefined, now: later });
		expect(() =>
			request.changeStatus({
				status: 'rejected',
				changedBy: 'reviewer@example.org',
				reason: 'Learner has not completed the prerequisite course.',
				now: '2026-06-27T12:00:00.000Z',
			}),
		).toThrow(InvalidStatusTransitionError);
	});

	it('requires a non-empty reason when rejecting', () => {
		expect(() => createPending().changeStatus({ status: 'rejected', changedBy: 'reviewer@example.org', reason: undefined, now: later })).toThrow(InvalidRequestError);
		expect(() => createPending().changeStatus({ status: 'rejected', changedBy: 'reviewer@example.org', reason: '   ', now: later })).toThrow(InvalidRequestError);
	});
});

describe('enrollment course eligibility', () => {
	it('rejects a missing course', () => {
		expect(() => assertCourseAllowsEnrollment(undefined)).toThrow(CourseNotFoundError);
	});

	it('rejects a draft or retired course', () => {
		expect(() => assertCourseAllowsEnrollment({ ...activeCourse(), status: 'draft' })).toThrow(CourseNotActiveError);
		expect(() => assertCourseAllowsEnrollment({ ...activeCourse(), status: 'retired' })).toThrow(CourseNotActiveError);
	});

	it('accepts an active course', () => {
		expect(assertCourseAllowsEnrollment(activeCourse()).id).toBe('course-001');
	});
});

describe('duplicate active requests', () => {
	it('rejects a pending or approved duplicate', () => {
		expect(() => assertNoDuplicateActiveRequest(createPending().snapshot())).toThrow(DuplicateActiveRequestError);

		const approved = createPending();
		approved.changeStatus({ status: 'approved', changedBy: 'reviewer@example.org', reason: undefined, now: later });
		expect(() => assertNoDuplicateActiveRequest(approved.snapshot())).toThrow(DuplicateActiveRequestError);
	});

	it('allows a new request when none exists', () => {
		expect(() => assertNoDuplicateActiveRequest(undefined)).not.toThrow();
	});
});
