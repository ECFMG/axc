import { describe, expect, it } from 'vitest';
import { ApiError, type ApplicationServices, buildApplicationServicesFactory, toErrorBody } from './index.ts';

const VALID_JUSTIFICATION = 'I need this course to prepare for upcoming secure development work.';
const CREATED_AT = '2026-06-27T10:00:00.000Z';
const UPDATED_AT = '2026-06-27T11:00:00.000Z';
const LATER_AT = '2026-06-27T12:00:00.000Z';

async function openServices(times: readonly string[] = [CREATED_AT]): Promise<ApplicationServices> {
	let index = 0;
	return await buildApplicationServicesFactory(
		{ environment: 'test' },
		{
			now: () => {
				const value = times[index] ?? times[times.length - 1];
				if (value === undefined) {
					throw new Error('clock has no times');
				}
				index += 1;
				return value;
			},
		},
	).forRequest();
}

function createBody(overrides: Record<string, unknown> = {}): Record<string, unknown> {
	return {
		courseId: 'course-001',
		learnerEmail: 'learner@example.org',
		justification: VALID_JUSTIFICATION,
		...overrides,
	};
}

function expectApiError(run: () => unknown, status: number, code: string): ApiError {
	try {
		run();
	} catch (error) {
		expect(error).toBeInstanceOf(ApiError);
		if (!(error instanceof ApiError)) {
			throw error;
		}
		expect(error.status).toBe(status);
		expect(error.code).toBe(code);
		return error;
	}
	throw new Error('expected an ApiError');
}

describe('enrollment requests', () => {
	it('creates a pending request and records the initial history entry', async () => {
		const services = await openServices();
		const created = services.enrollmentRequests.create(createBody({ status: 'approved', id: 'client-id', changedBy: 'learner@example.org' }));

		expect(created).toEqual({
			id: 'enroll-001',
			courseId: 'course-001',
			learnerEmail: 'learner@example.org',
			justification: VALID_JUSTIFICATION,
			status: 'pending',
			createdAt: CREATED_AT,
			updatedAt: CREATED_AT,
			statusHistory: [
				{
					fromStatus: null,
					toStatus: 'pending',
					changedAt: CREATED_AT,
					changedBy: 'system',
					reason: null,
				},
			],
		});
		expect(toErrorBody(new ApiError(400, 'INVALID_REQUEST', 'The request could not be completed.', []))).toEqual({
			error: { code: 'INVALID_REQUEST', message: 'The request could not be completed.', details: [] },
		});
	});

	it('rejects a missing, draft, or retired course', async () => {
		const services = await openServices();

		const missing = expectApiError(() => services.enrollmentRequests.create(createBody({ courseId: 'course-999' })), 404, 'COURSE_NOT_FOUND');
		expect(missing.details[0]?.field).toBe('courseId');
		expectApiError(() => services.enrollmentRequests.create(createBody({ courseId: 'course-005' })), 409, 'COURSE_NOT_ACTIVE');
		expectApiError(() => services.enrollmentRequests.create(createBody({ courseId: 'course-006' })), 409, 'COURSE_NOT_ACTIVE');
		expect(services.enrollmentRequests.list({}).items).toEqual([]);
	});

	it('rejects an invalid email and a short or long justification', async () => {
		const services = await openServices();
		const invalid = expectApiError(() => services.enrollmentRequests.create(createBody({ learnerEmail: 'not-an-email', justification: 'too short' })), 400, 'INVALID_REQUEST');

		expect(invalid.message).toBe('The request could not be completed.');
		expect(invalid.details).toEqual([
			{ field: 'learnerEmail', message: 'learnerEmail must be a valid email address.' },
			{ field: 'justification', message: 'justification must be between 20 and 500 characters.' },
		]);
		expectApiError(() => services.enrollmentRequests.create(createBody({ justification: 'a'.repeat(501) })), 400, 'INVALID_REQUEST');
		expectApiError(() => services.enrollmentRequests.create(['not-an-object']), 400, 'INVALID_REQUEST');

		const minimum = services.enrollmentRequests.create(createBody({ justification: 'a'.repeat(20) }));
		const maximum = services.enrollmentRequests.create(createBody({ learnerEmail: 'other@example.org', justification: 'b'.repeat(500) }));
		expect(minimum.justification).toHaveLength(20);
		expect(maximum.justification).toHaveLength(500);
	});

	it('prevents a second pending or approved request for the same learner and course', async () => {
		const services = await openServices([CREATED_AT, UPDATED_AT, LATER_AT]);
		services.enrollmentRequests.create(createBody());
		expectApiError(() => services.enrollmentRequests.create(createBody({ learnerEmail: 'Learner@Example.org' })), 409, 'DUPLICATE_ACTIVE_REQUEST');

		const approved = services.enrollmentRequests.create(createBody({ learnerEmail: 'approved@example.org' }));
		services.enrollmentRequests.updateStatus(approved.id, { status: 'approved', changedBy: 'reviewer@example.org' });
		expectApiError(() => services.enrollmentRequests.create(createBody({ learnerEmail: 'approved@example.org' })), 409, 'DUPLICATE_ACTIVE_REQUEST');

		const rejected = services.enrollmentRequests.create(createBody({ learnerEmail: 'rejected@example.org' }));
		services.enrollmentRequests.updateStatus(rejected.id, { status: 'rejected', changedBy: 'reviewer@example.org', reason: 'Prerequisite is missing from the learner record.' });
		const replacement = services.enrollmentRequests.create(createBody({ learnerEmail: 'rejected@example.org' }));
		expect(replacement.status).toBe('pending');

		const cancelled = services.enrollmentRequests.create(createBody({ learnerEmail: 'cancelled@example.org' }));
		services.enrollmentRequests.updateStatus(cancelled.id, { status: 'cancelled', changedBy: 'learner@example.org' });
		expect(services.enrollmentRequests.create(createBody({ learnerEmail: 'cancelled@example.org' })).status).toBe('pending');

		expect(services.enrollmentRequests.create(createBody({ courseId: 'course-002' })).courseId).toBe('course-002');
		expect(services.enrollmentRequests.create(createBody({ learnerEmail: 'second@example.org' })).learnerEmail).toBe('second@example.org');
	});

	it('returns a request by id with its status history', async () => {
		const services = await openServices();
		const created = services.enrollmentRequests.create(createBody());
		const found = services.enrollmentRequests.getById(created.id);

		expect(found).toEqual(created);
		expect(found.statusHistory).toHaveLength(1);
		expectApiError(() => services.enrollmentRequests.getById('enroll-missing'), 404, 'ENROLLMENT_REQUEST_NOT_FOUND');
	});

	it('filters the list by status, courseId, and learnerEmail', async () => {
		const services = await openServices();
		const pending = services.enrollmentRequests.create(createBody({ learnerEmail: 'filter-match@example.org' }));
		services.enrollmentRequests.create(createBody({ courseId: 'course-002', learnerEmail: 'filter-match@example.org' }));
		services.enrollmentRequests.create(createBody({ learnerEmail: 'filter-other@example.org' }));
		const approved = services.enrollmentRequests.create(createBody({ courseId: 'course-004', learnerEmail: 'filter-approved@example.org' }));
		services.enrollmentRequests.updateStatus(approved.id, { status: 'approved', changedBy: 'reviewer@example.org' });

		const byStatus = services.enrollmentRequests.list({ status: ['pending'] });
		expect(byStatus.items.every((request) => request.status === 'pending')).toBe(true);
		expect(byStatus.items.map((request) => request.id)).toContain(pending.id);
		expect(byStatus.items.map((request) => request.id)).not.toContain(approved.id);

		const byCourse = services.enrollmentRequests.list({ courseId: ['course-002'] });
		expect(byCourse.items.every((request) => request.courseId === 'course-002')).toBe(true);
		expect(byCourse.items).toHaveLength(1);

		const byEmail = services.enrollmentRequests.list({ learnerEmail: ['Filter-Other@example.org'] });
		expect(byEmail.items).toHaveLength(1);
		expect(byEmail.items[0]?.learnerEmail).toBe('filter-other@example.org');

		const combined = services.enrollmentRequests.list({ status: ['pending'], courseId: ['course-001'], learnerEmail: ['filter-match@example.org'] });
		expect(combined.items.map((request) => request.id)).toEqual([pending.id]);
		expectApiError(() => services.enrollmentRequests.list({ status: ['bogus'] }), 400, 'INVALID_REQUEST');
	});

	it('applies the allowed status transitions and appends history', async () => {
		const services = await openServices([CREATED_AT, UPDATED_AT, LATER_AT]);
		const approved = services.enrollmentRequests.create(createBody({ learnerEmail: 'transition-approved@example.org' }));
		const approvedResult = services.enrollmentRequests.updateStatus(approved.id, { status: 'approved', changedBy: 'reviewer@example.org' });
		expect(approvedResult.status).toBe('approved');
		expect(approvedResult.statusHistory.map((entry) => entry.toStatus)).toEqual(['pending', 'approved']);
		expect(approvedResult.statusHistory[1]).toMatchObject({ fromStatus: 'pending', toStatus: 'approved', changedAt: UPDATED_AT, changedBy: 'reviewer@example.org', reason: null });

		const rejected = services.enrollmentRequests.create(createBody({ learnerEmail: 'transition-rejected@example.org' }));
		const rejectedResult = services.enrollmentRequests.updateStatus(rejected.id, { status: 'rejected', changedBy: 'reviewer@example.org', reason: 'Learner has not completed the prerequisite course.' });
		expect(rejectedResult.status).toBe('rejected');
		expect(rejectedResult.statusHistory[1]?.reason).toBe('Learner has not completed the prerequisite course.');

		const cancelled = services.enrollmentRequests.create(createBody({ learnerEmail: 'transition-cancelled@example.org' }));
		expect(services.enrollmentRequests.updateStatus(cancelled.id, { status: 'cancelled', changedBy: 'learner@example.org' }).status).toBe('cancelled');

		const approvedThenCancelled = services.enrollmentRequests.create(createBody({ learnerEmail: 'transition-approved-cancelled@example.org' }));
		services.enrollmentRequests.updateStatus(approvedThenCancelled.id, { status: 'approved', changedBy: 'reviewer@example.org' });
		const finalStatus = services.enrollmentRequests.updateStatus(approvedThenCancelled.id, { status: 'cancelled', changedBy: 'reviewer@example.org', reason: 'The cohort was withdrawn.' });
		expect(finalStatus.status).toBe('cancelled');
		expect(finalStatus.updatedAt).toBe(LATER_AT);
		expect(finalStatus.statusHistory).toHaveLength(3);
		expect(finalStatus.statusHistory.map((entry) => `${entry.fromStatus ?? 'null'}->${entry.toStatus}`)).toEqual(['null->pending', 'pending->approved', 'approved->cancelled']);
	});

	it('rejects an invalid transition without changing history', async () => {
		const services = await openServices([CREATED_AT, UPDATED_AT]);
		const created = services.enrollmentRequests.create(createBody({ learnerEmail: 'invalid-transition@example.org' }));
		services.enrollmentRequests.updateStatus(created.id, { status: 'approved', changedBy: 'reviewer@example.org' });

		const error = expectApiError(() => services.enrollmentRequests.updateStatus(created.id, { status: 'rejected', changedBy: 'reviewer@example.org', reason: 'This transition is not allowed.' }), 409, 'INVALID_STATUS_TRANSITION');
		expect(error.details[0]?.field).toBe('status');
		const current = services.enrollmentRequests.getById(created.id);
		expect(current.status).toBe('approved');
		expect(current.statusHistory).toHaveLength(2);

		expectApiError(() => services.enrollmentRequests.updateStatus(created.id, { status: 'approved', changedBy: 'reviewer@example.org' }), 409, 'INVALID_STATUS_TRANSITION');
		expectApiError(() => services.enrollmentRequests.updateStatus('enroll-missing', { status: 'approved', changedBy: 'reviewer@example.org' }), 404, 'ENROLLMENT_REQUEST_NOT_FOUND');
	});

	it('requires a non-empty reason when rejecting', async () => {
		const services = await openServices();
		const created = services.enrollmentRequests.create(createBody({ learnerEmail: 'needs-reason@example.org' }));

		const missing = expectApiError(() => services.enrollmentRequests.updateStatus(created.id, { status: 'rejected', changedBy: 'reviewer@example.org' }), 400, 'INVALID_REQUEST');
		expect(missing.details).toEqual([{ field: 'reason', message: 'reason is required when rejecting a request.' }]);
		expectApiError(() => services.enrollmentRequests.updateStatus(created.id, { status: 'rejected', changedBy: 'reviewer@example.org', reason: '   ' }), 400, 'INVALID_REQUEST');
		expectApiError(() => services.enrollmentRequests.updateStatus(created.id, { status: 'bogus', changedBy: 'reviewer@example.org' }), 400, 'INVALID_REQUEST');
		expectApiError(() => services.enrollmentRequests.updateStatus(created.id, { status: 'approved' }), 400, 'INVALID_REQUEST');

		const unchanged = services.enrollmentRequests.getById(created.id);
		expect(unchanged.status).toBe('pending');
		expect(unchanged.statusHistory).toHaveLength(1);
	});

	it('keeps course search available after enrollment requests are created', async () => {
		const services = await openServices();
		services.enrollmentRequests.create(createBody());

		expect(services.courses.search({ q: ['security'], modality: ['online'], status: ['active'], tag: ['ai'] }).items.map((course) => course.id)).toEqual(['course-001']);
	});
});
