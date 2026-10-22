import type { EnrollmentRequest } from '@axc/domain';
import { describe, expect, it } from 'vitest';
import { ApplicationError, buildApplicationServicesFactory } from './index.ts';

const VALID_JUSTIFICATION = 'I need this course to prepare for upcoming secure development work.';

function clockStarting(start: string): { now(): string } {
	let tick = Date.parse(start);
	return {
		now(): string {
			const value = new Date(tick).toISOString();
			tick += 1000;
			return value;
		},
	};
}

async function api(clock = clockStarting('2026-06-27T10:00:00.000Z')) {
	return await buildApplicationServicesFactory({ environment: 'test' }, clock).forRequest();
}

async function errorOf(promise: Promise<unknown>): Promise<ApplicationError> {
	const error = await promise.then(
		() => undefined,
		(caught: unknown) => caught,
	);
	expect(error).toBeInstanceOf(ApplicationError);
	if (!(error instanceof ApplicationError)) {
		throw new Error('expected ApplicationError');
	}
	return error;
}

function createBody(overrides: Record<string, unknown> = {}) {
	return {
		courseId: 'course-001',
		learnerEmail: 'learner@example.org',
		justification: VALID_JUSTIFICATION,
		...overrides,
	};
}

describe('enrollment requests', () => {
	it('creates a pending request with an initial history entry', async () => {
		const services = await api();
		const created = await services.enrollmentRequests.create(createBody());

		expect(created).toEqual({
			id: 'enroll-001',
			courseId: 'course-001',
			learnerEmail: 'learner@example.org',
			justification: VALID_JUSTIFICATION,
			status: 'pending',
			createdAt: '2026-06-27T10:00:00.000Z',
			updatedAt: '2026-06-27T10:00:00.000Z',
			statusHistory: [
				{
					fromStatus: null,
					toStatus: 'pending',
					changedAt: '2026-06-27T10:00:00.000Z',
					changedBy: 'system',
					reason: null,
				},
			],
		});
		await expect(services.enrollmentRequests.getById(created.id)).resolves.toEqual(created);
	});

	it('rejects a missing, draft, or retired course', async () => {
		const services = await api();

		const missing = await errorOf(services.enrollmentRequests.create(createBody({ courseId: 'course-404' })));
		expect(missing.code).toBe('COURSE_NOT_FOUND');

		const draft = await errorOf(services.enrollmentRequests.create(createBody({ courseId: 'course-010' })));
		expect(draft.code).toBe('COURSE_NOT_ACTIVE');

		const retired = await errorOf(services.enrollmentRequests.create(createBody({ courseId: 'course-004' })));
		expect(retired.code).toBe('COURSE_NOT_ACTIVE');
	});

	it('rejects an invalid email and a justification outside 20 to 500 characters', async () => {
		const services = await api();

		const email = await errorOf(services.enrollmentRequests.create(createBody({ learnerEmail: 'not-an-email' })));
		expect(email.code).toBe('INVALID_REQUEST');
		expect(email.message).toBe('The request could not be completed.');
		expect(email.details).toEqual([{ field: 'learnerEmail', message: 'learnerEmail must be a valid email address.' }]);

		const short = await errorOf(services.enrollmentRequests.create(createBody({ justification: 'x'.repeat(19) })));
		expect(short.details).toEqual([{ field: 'justification', message: 'justification must be between 20 and 500 characters.' }]);

		const long = await errorOf(services.enrollmentRequests.create(createBody({ justification: 'x'.repeat(501) })));
		expect(long.details[0]?.field).toBe('justification');

		const minimum = await services.enrollmentRequests.create(createBody({ learnerEmail: 'minimum@example.org', justification: 'x'.repeat(20) }));
		expect(minimum.justification).toHaveLength(20);

		const maximum = await services.enrollmentRequests.create(createBody({ learnerEmail: 'maximum@example.org', justification: 'y'.repeat(500) }));
		expect(maximum.justification).toHaveLength(500);
	});

	it('rejects a body that is not a JSON object', async () => {
		const services = await api();
		const error = await errorOf(services.enrollmentRequests.create(['course-001']));

		expect(error.code).toBe('INVALID_REQUEST');
		expect(error.details[0]?.field).toBe('body');
	});

	it('prevents a second pending or approved request for the same learner and course', async () => {
		const services = await api();
		const first = await services.enrollmentRequests.create(createBody());
		const pending = await errorOf(services.enrollmentRequests.create(createBody({ learnerEmail: 'Learner@example.org' })));
		expect(pending.code).toBe('DUPLICATE_ACTIVE_REQUEST');

		await services.enrollmentRequests.updateStatus(first.id, { status: 'approved', changedBy: 'reviewer@example.org' });
		const approved = await errorOf(services.enrollmentRequests.create(createBody()));
		expect(approved.code).toBe('DUPLICATE_ACTIVE_REQUEST');

		const otherCourse = await services.enrollmentRequests.create(createBody({ courseId: 'course-002' }));
		expect(otherCourse.status).toBe('pending');

		const otherLearner = await services.enrollmentRequests.create(createBody({ learnerEmail: 'other@example.org' }));
		expect(otherLearner.courseId).toBe('course-001');
	});

	it('allows a new request after the earlier one is rejected or cancelled', async () => {
		const services = await api();
		const rejected = await services.enrollmentRequests.create(createBody());
		await services.enrollmentRequests.updateStatus(rejected.id, {
			status: 'rejected',
			changedBy: 'reviewer@example.org',
			reason: 'Learner has not completed the prerequisite course.',
		});
		const afterRejection = await services.enrollmentRequests.create(createBody());
		expect(afterRejection.status).toBe('pending');
		expect(afterRejection.id).not.toBe(rejected.id);

		await services.enrollmentRequests.updateStatus(afterRejection.id, { status: 'cancelled', changedBy: 'reviewer@example.org' });
		const afterCancel = await services.enrollmentRequests.create(createBody());
		expect(afterCancel.id).toBe('enroll-003');
	});

	it('returns 404 for an unknown request', async () => {
		const services = await api();
		const missing = await errorOf(services.enrollmentRequests.getById('enroll-missing'));
		expect(missing.code).toBe('ENROLLMENT_REQUEST_NOT_FOUND');

		const patch = await errorOf(services.enrollmentRequests.updateStatus('enroll-missing', { status: 'approved', changedBy: 'reviewer@example.org' }));
		expect(patch.code).toBe('ENROLLMENT_REQUEST_NOT_FOUND');
	});

	it('filters by status, courseId, and learnerEmail', async () => {
		const services = await api();
		const pending = await services.enrollmentRequests.create(createBody({ learnerEmail: 'filter@example.org', courseId: 'course-005' }));
		await services.enrollmentRequests.create(createBody({ learnerEmail: 'other-filter@example.org', courseId: 'course-006' }));
		const approved = await services.enrollmentRequests.create(createBody({ learnerEmail: 'filter@example.org', courseId: 'course-007' }));
		await services.enrollmentRequests.updateStatus(approved.id, { status: 'approved', changedBy: 'reviewer@example.org' });

		const byStatus = await services.enrollmentRequests.list({ status: 'pending' });
		expect(byStatus.items.every((item) => item.status === 'pending')).toBe(true);
		expect(byStatus.items.map((item) => item.id)).toContain(pending.id);
		expect(byStatus.items.map((item) => item.id)).not.toContain(approved.id);

		const byCourse = await services.enrollmentRequests.list({ courseId: 'course-005' });
		expect(byCourse.items.map((item) => item.id)).toEqual([pending.id]);

		const byLearner = await services.enrollmentRequests.list({ learnerEmail: 'Filter@example.org' });
		expect(byLearner.items.map((item) => item.id)).toEqual([pending.id, approved.id]);

		const combined = await services.enrollmentRequests.list({ status: 'pending', courseId: 'course-005', learnerEmail: 'filter@example.org' });
		expect(combined.items).toEqual([pending]);

		await expect(services.enrollmentRequests.list({ status: 'archived' })).rejects.toMatchObject({ code: 'INVALID_REQUEST' });
		await expect(services.enrollmentRequests.list({ q: 'security' })).rejects.toMatchObject({ code: 'INVALID_REQUEST' });
	});

	it('applies the valid status transitions and appends history', async () => {
		const services = await api();
		const approved = await transition(services, 'course-006', { status: 'approved', changedBy: 'reviewer@example.org' });
		expect(approved.status).toBe('approved');
		expect(approved.statusHistory).toHaveLength(2);
		expect(approved.statusHistory[1]).toMatchObject({ fromStatus: 'pending', toStatus: 'approved', changedBy: 'reviewer@example.org', reason: null });

		const rejected = await transition(services, 'course-007', {
			status: 'rejected',
			changedBy: 'reviewer@example.org',
			reason: 'Learner has not completed the prerequisite course.',
		});
		expect(rejected.status).toBe('rejected');
		expect(rejected.statusHistory[1]).toMatchObject({ fromStatus: 'pending', toStatus: 'rejected', reason: 'Learner has not completed the prerequisite course.' });

		const cancelled = await transition(services, 'course-008', { status: 'cancelled', changedBy: 'learner@example.org' });
		expect(cancelled.status).toBe('cancelled');
		expect(cancelled.statusHistory[1]).toMatchObject({ fromStatus: 'pending', toStatus: 'cancelled' });

		const approvedThenCancelled = await transition(services, 'course-011', { status: 'approved', changedBy: 'reviewer@example.org' });
		const cancelledAfterApproval = await services.enrollmentRequests.updateStatus(approvedThenCancelled.id, { status: 'cancelled', changedBy: 'reviewer@example.org' });
		expect(cancelledAfterApproval.statusHistory.map((entry) => entry.toStatus)).toEqual(['pending', 'approved', 'cancelled']);
		expect(cancelledAfterApproval.updatedAt).not.toBe(cancelledAfterApproval.createdAt);
	});

	it('rejects an invalid transition and a rejection without a reason', async () => {
		const services = await api();
		const created = await services.enrollmentRequests.create(createBody({ learnerEmail: 'transition@example.org' }));
		await services.enrollmentRequests.updateStatus(created.id, {
			status: 'rejected',
			changedBy: 'reviewer@example.org',
			reason: 'Learner has not completed the prerequisite course.',
		});

		const transition = await errorOf(services.enrollmentRequests.updateStatus(created.id, { status: 'approved', changedBy: 'reviewer@example.org' }));
		expect(transition.code).toBe('INVALID_STATUS_TRANSITION');

		const pending = await services.enrollmentRequests.create(createBody({ learnerEmail: 'reason@example.org', courseId: 'course-002' }));
		const missingReason = await errorOf(services.enrollmentRequests.updateStatus(pending.id, { status: 'rejected', changedBy: 'reviewer@example.org' }));
		expect(missingReason.code).toBe('INVALID_REQUEST');
		expect(missingReason.details).toEqual([{ field: 'reason', message: 'reason is required when rejecting an enrollment request.' }]);

		const blankReason = await errorOf(services.enrollmentRequests.updateStatus(pending.id, { status: 'rejected', changedBy: 'reviewer@example.org', reason: '   ' }));
		expect(blankReason.details[0]?.field).toBe('reason');
		expect((await services.enrollmentRequests.getById(pending.id)).status).toBe('pending');
	});

	it('rejects an invalid status value before changing the request', async () => {
		const services = await api();
		const created = await services.enrollmentRequests.create(createBody({ learnerEmail: 'status@example.org' }));
		const error = await errorOf(services.enrollmentRequests.updateStatus(created.id, { status: 'archived', changedBy: 'reviewer@example.org' }));

		expect(error.code).toBe('INVALID_REQUEST');
		expect(error.details[0]?.field).toBe('status');
		expect((await services.enrollmentRequests.getById(created.id)).statusHistory).toHaveLength(1);
	});
});

async function transition(services: Awaited<ReturnType<typeof api>>, courseId: string, change: { status: string; changedBy: string; reason?: string }): Promise<EnrollmentRequest> {
	const created = await services.enrollmentRequests.create(createBody({ courseId, learnerEmail: `${courseId}@example.org` }));
	return await services.enrollmentRequests.updateStatus(created.id, change);
}
