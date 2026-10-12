import type { EnrollmentRequest } from '@axc/domain';
import { beforeEach, describe, expect, it } from 'vitest';
import type { ServiceError } from './errors.ts';
import { type ApplicationServices, buildApplicationServicesFactory } from './index.ts';

const validBody = {
	courseId: 'course-001',
	learnerEmail: 'learner@example.org',
	justification: 'I need this course to prepare for upcoming secure development work.',
};

let services: ApplicationServices;

const rejectsWith = async (promise: Promise<unknown>, code: string, status: number): Promise<ServiceError> => {
	const error = (await promise.then(
		() => undefined,
		(caught: unknown) => caught as ServiceError,
	)) as ServiceError | undefined;
	if (error === undefined) {
		throw new Error(`expected rejection with ${code}`);
	}
	expect(error.code).toBe(code);
	expect(error.status).toBe(status);
	return error;
};

const createPending = (overrides: Partial<typeof validBody> = {}): Promise<EnrollmentRequest> => services.enrollmentRequests.create({ ...validBody, ...overrides });

beforeEach(async () => {
	services = await buildApplicationServicesFactory({ environment: 'test' }).forRequest();
});

describe('creating enrollment requests', () => {
	it('creates a pending request with an opening audit entry', async () => {
		const created = await createPending();
		expect(created).toMatchObject({ courseId: 'course-001', learnerEmail: 'learner@example.org', status: 'pending' });
		expect(created.id).not.toBe('');
		expect(created.statusHistory).toEqual([{ fromStatus: null, toStatus: 'pending', changedAt: created.createdAt, changedBy: 'system', reason: null }]);
	});

	it('refuses a course that does not exist', async () => {
		await rejectsWith(createPending({ courseId: 'course-999' }), 'COURSE_NOT_FOUND', 404);
	});

	it('refuses a course that is not active', async () => {
		await rejectsWith(createPending({ courseId: 'course-005' }), 'COURSE_NOT_ACTIVE', 409);
		await rejectsWith(createPending({ courseId: 'course-008' }), 'COURSE_NOT_ACTIVE', 409);
	});

	it('refuses an invalid email or a justification outside 20-500 characters', async () => {
		const emailError = await rejectsWith(createPending({ learnerEmail: 'not-an-email' }), 'INVALID_REQUEST', 400);
		expect(emailError.details[0]?.field).toBe('learnerEmail');

		const shortError = await rejectsWith(createPending({ justification: 'too short' }), 'INVALID_REQUEST', 400);
		expect(shortError.details[0]?.field).toBe('justification');

		await rejectsWith(createPending({ justification: 'x'.repeat(501) }), 'INVALID_REQUEST', 400);
		await rejectsWith(services.enrollmentRequests.create(undefined), 'INVALID_REQUEST', 400);
	});

	it('refuses a second pending or approved request for the same learner and course', async () => {
		const first = await createPending();
		await rejectsWith(createPending(), 'DUPLICATE_ACTIVE_REQUEST', 409);

		await services.enrollmentRequests.updateStatus(first.id, { status: 'approved', changedBy: 'reviewer@example.org' });
		await rejectsWith(createPending(), 'DUPLICATE_ACTIVE_REQUEST', 409);
	});

	it('allows a new request once the previous one is cancelled', async () => {
		const first = await createPending();
		await services.enrollmentRequests.updateStatus(first.id, { status: 'cancelled', changedBy: 'learner@example.org' });
		await expect(createPending()).resolves.toMatchObject({ status: 'pending' });
	});
});

describe('reading enrollment requests', () => {
	it('returns a request by id including its status history', async () => {
		const created = await createPending();
		const found = await services.enrollmentRequests.getById(created.id);
		expect(found).toEqual(created);
		expect(found.statusHistory).toHaveLength(1);
	});

	it('returns 404 for an unknown id', async () => {
		await rejectsWith(services.enrollmentRequests.getById('missing'), 'ENROLLMENT_REQUEST_NOT_FOUND', 404);
	});

	it('filters by status, courseId and learnerEmail', async () => {
		const first = await createPending();
		await createPending({ courseId: 'course-002' });
		await createPending({ learnerEmail: 'other@example.org' });
		await services.enrollmentRequests.updateStatus(first.id, { status: 'approved', changedBy: 'reviewer@example.org' });

		expect((await services.enrollmentRequests.list({})).items).toHaveLength(3);
		expect((await services.enrollmentRequests.list({ status: 'approved' })).items.map((r) => r.id)).toEqual([first.id]);
		expect((await services.enrollmentRequests.list({ courseId: 'course-002' })).items).toHaveLength(1);
		expect((await services.enrollmentRequests.list({ learnerEmail: 'other@example.org' })).items).toHaveLength(1);
		expect((await services.enrollmentRequests.list({ status: 'pending', courseId: 'course-001' })).items.map((r) => r.learnerEmail)).toEqual(['other@example.org']);
	});

	it('rejects an unsupported status filter', async () => {
		await rejectsWith(services.enrollmentRequests.list({ status: 'escalated' }), 'INVALID_QUERY_PARAMETER', 400);
	});
});

describe('enrollment request status transitions', () => {
	it('supports every documented transition and records each change', async () => {
		const pending = await createPending();
		const approved = await services.enrollmentRequests.updateStatus(pending.id, { status: 'approved', changedBy: 'reviewer@example.org' });
		expect(approved.status).toBe('approved');
		expect(approved.statusHistory).toHaveLength(2);

		const cancelled = await services.enrollmentRequests.updateStatus(pending.id, { status: 'cancelled', changedBy: 'reviewer@example.org' });
		expect(cancelled.status).toBe('cancelled');
		expect(cancelled.statusHistory.map((entry) => entry.toStatus)).toEqual(['pending', 'approved', 'cancelled']);
		expect(cancelled.updatedAt >= cancelled.createdAt).toBe(true);

		const rejected = await services.enrollmentRequests.updateStatus((await createPending({ courseId: 'course-002' })).id, {
			status: 'rejected',
			changedBy: 'reviewer@example.org',
			reason: 'Learner has not completed the prerequisite course.',
		});
		expect(rejected.statusHistory[1]).toMatchObject({ fromStatus: 'pending', toStatus: 'rejected', reason: 'Learner has not completed the prerequisite course.' });

		const directlyCancelled = await services.enrollmentRequests.updateStatus((await createPending({ courseId: 'course-003' })).id, { status: 'cancelled', changedBy: 'learner@example.org' });
		expect(directlyCancelled.status).toBe('cancelled');
	});

	it('returns 409 for a transition the state machine forbids', async () => {
		const pending = await createPending();
		await services.enrollmentRequests.updateStatus(pending.id, { status: 'rejected', changedBy: 'reviewer@example.org', reason: 'Not eligible.' });
		await rejectsWith(services.enrollmentRequests.updateStatus(pending.id, { status: 'approved', changedBy: 'reviewer@example.org' }), 'INVALID_STATUS_TRANSITION', 409);
	});

	it('requires a reason when rejecting', async () => {
		const pending = await createPending();
		const error = await rejectsWith(services.enrollmentRequests.updateStatus(pending.id, { status: 'rejected', changedBy: 'reviewer@example.org' }), 'INVALID_REQUEST', 400);
		expect(error.details.map((detail) => detail.field)).toEqual(['reason']);
	});

	it('rejects an unknown status value, a missing changedBy and an unknown request', async () => {
		const pending = await createPending();
		await rejectsWith(services.enrollmentRequests.updateStatus(pending.id, { status: 'escalated', changedBy: 'reviewer@example.org' }), 'INVALID_REQUEST', 400);
		await rejectsWith(services.enrollmentRequests.updateStatus(pending.id, { status: 'approved' }), 'INVALID_REQUEST', 400);
		await rejectsWith(services.enrollmentRequests.updateStatus('missing', { status: 'approved', changedBy: 'reviewer@example.org' }), 'ENROLLMENT_REQUEST_NOT_FOUND', 404);
	});
});
