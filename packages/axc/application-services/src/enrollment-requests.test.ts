import { createMemoryCatalog } from '@axc/persistence';
import { describe, expect, it } from 'vitest';
import { ApiError, type ApplicationServices, type Clock } from './index.ts';
import { createTestServices } from './test-support/context.ts';

const justification = 'I need this course to prepare for upcoming secure development work.';

function openServices(clock?: Clock): Promise<ApplicationServices> {
	return createTestServices({
		catalog: createMemoryCatalog(),
		...(clock === undefined ? {} : { clock }),
	});
}

function sequenceClock(times: readonly string[]): Clock {
	let index = 0;
	return () => {
		const value = times[index] ?? times[times.length - 1];
		if (value === undefined) {
			throw new Error('clock sequence is empty');
		}
		if (index < times.length) {
			index += 1;
		}
		return new Date(value);
	};
}

function catchError(run: () => void): ApiError {
	try {
		run();
	} catch (error) {
		if (error instanceof ApiError) {
			return error;
		}
		throw error;
	}
	throw new Error('expected ApiError');
}

function createBody(overrides: Record<string, unknown> = {}): Record<string, unknown> {
	return {
		courseId: 'course-001',
		learnerEmail: 'learner@example.org',
		justification,
		...overrides,
	};
}

describe('enrollment requests', () => {
	it('creates a pending request with an opening history entry', async () => {
		const services = await openServices();
		const created = services.enrollmentRequests.create(createBody());

		expect(created).toEqual({
			id: 'enroll-001',
			courseId: 'course-001',
			learnerEmail: 'learner@example.org',
			justification,
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
		expect(services.enrollmentRequests.getById(created.id)).toEqual(created);
	});

	it('rejects a missing, draft, or retired course', async () => {
		const services = await openServices();

		const missing = catchError(() => services.enrollmentRequests.create(createBody({ courseId: 'course-404' })));
		expect(missing.status).toBe(404);
		expect(missing.code).toBe('COURSE_NOT_FOUND');

		const draft = catchError(() => services.enrollmentRequests.create(createBody({ courseId: 'course-004' })));
		expect(draft.status).toBe(409);
		expect(draft.code).toBe('COURSE_NOT_ACTIVE');

		const retired = catchError(() => services.enrollmentRequests.create(createBody({ courseId: 'course-005' })));
		expect(retired.status).toBe(409);
		expect(retired.code).toBe('COURSE_NOT_ACTIVE');
		expect(services.enrollmentRequests.list({}).items).toEqual([]);
	});

	it('rejects an invalid email and a short justification together', async () => {
		const services = await openServices();
		const error = catchError(() => services.enrollmentRequests.create(createBody({ learnerEmail: 'not-an-email', justification: 'Too short.' })));

		expect(error.status).toBe(400);
		expect(error.code).toBe('INVALID_REQUEST');
		expect(error.message).toBe('The request could not be completed.');
		expect(error.details).toEqual([
			{ field: 'learnerEmail', message: 'learnerEmail must be a valid email address.' },
			{ field: 'justification', message: 'justification must be between 20 and 500 characters.' },
		]);
	});

	it('accepts justification at the length boundaries and rejects the neighbors', async () => {
		const services = await openServices();

		expect(services.enrollmentRequests.create(createBody({ learnerEmail: 'short-ok@example.org', justification: 'x'.repeat(20) })).status).toBe('pending');
		expect(services.enrollmentRequests.create(createBody({ learnerEmail: 'long-ok@example.org', justification: 'y'.repeat(500) })).status).toBe('pending');
		expect(catchError(() => services.enrollmentRequests.create(createBody({ justification: 'x'.repeat(19) }))).details[0]?.field).toBe('justification');
		expect(catchError(() => services.enrollmentRequests.create(createBody({ justification: 'y'.repeat(501) }))).details[0]?.field).toBe('justification');
	});

	it('prevents a second pending or approved request and allows one after rejection or cancellation', async () => {
		const services = await openServices();
		const first = services.enrollmentRequests.create(createBody());
		const duplicatePending = catchError(() => services.enrollmentRequests.create(createBody({ learnerEmail: 'Learner@Example.org' })));
		expect(duplicatePending.status).toBe(409);
		expect(duplicatePending.code).toBe('DUPLICATE_ACTIVE_REQUEST');

		services.enrollmentRequests.updateStatus(first.id, { status: 'approved', changedBy: 'reviewer@example.org' });
		const duplicateApproved = catchError(() => services.enrollmentRequests.create(createBody()));
		expect(duplicateApproved.code).toBe('DUPLICATE_ACTIVE_REQUEST');

		services.enrollmentRequests.updateStatus(first.id, { status: 'cancelled', changedBy: 'reviewer@example.org' });
		const afterCancel = services.enrollmentRequests.create(createBody());
		expect(afterCancel.id).toBe('enroll-002');
		expect(afterCancel.status).toBe('pending');

		services.enrollmentRequests.updateStatus(afterCancel.id, { status: 'rejected', changedBy: 'reviewer@example.org', reason: 'Prerequisite is missing.' });
		const afterReject = services.enrollmentRequests.create(createBody());
		expect(afterReject.status).toBe('pending');
	});

	it('filters by status, course, and learner email', async () => {
		const services = await openServices();
		const pending = services.enrollmentRequests.create(createBody({ learnerEmail: 'ada@example.org', courseId: 'course-001' }));
		const other = services.enrollmentRequests.create(createBody({ learnerEmail: 'grace@example.org', courseId: 'course-002' }));
		services.enrollmentRequests.updateStatus(other.id, { status: 'approved', changedBy: 'reviewer@example.org' });

		expect(services.enrollmentRequests.list({ status: ['pending'] }).items.map((request) => request.id)).toEqual([pending.id]);
		expect(services.enrollmentRequests.list({ courseId: ['course-002'] }).items.map((request) => request.id)).toEqual([other.id]);
		expect(services.enrollmentRequests.list({ learnerEmail: ['ADA@example.org'] }).items.map((request) => request.id)).toEqual([pending.id]);
		expect(services.enrollmentRequests.list({ status: ['approved'], courseId: ['course-002'], learnerEmail: ['grace@example.org'] }).items.map((request) => request.id)).toEqual([other.id]);
		expect(services.enrollmentRequests.list({ status: ['cancelled'] }).items).toEqual([]);
	});

	it('returns 404 for an unknown request and 400 for an invalid list filter', async () => {
		const services = await openServices();

		const missing = catchError(() => services.enrollmentRequests.getById('enroll-404'));
		expect(missing.status).toBe(404);
		expect(missing.code).toBe('ENROLLMENT_REQUEST_NOT_FOUND');

		const invalidFilter = catchError(() => services.enrollmentRequests.list({ status: ['open'], extra: ['1'] }));
		expect(invalidFilter.status).toBe(400);
		expect(invalidFilter.code).toBe('INVALID_REQUEST');
		expect(invalidFilter.details.map((detail) => detail.field)).toEqual(['extra', 'status']);
	});

	it('records valid transitions and rejects invalid ones without changing history', async () => {
		const services = await openServices(sequenceClock(['2026-06-27T10:00:00.000Z', '2026-06-27T11:00:00.000Z', '2026-06-27T12:00:00.000Z']));
		const created = services.enrollmentRequests.create(createBody({ learnerEmail: 'quinn@example.org' }));
		const approved = services.enrollmentRequests.updateStatus(created.id, { status: 'approved', changedBy: 'reviewer@example.org' });

		expect(approved.status).toBe('approved');
		expect(approved.updatedAt).toBe('2026-06-27T11:00:00.000Z');
		expect(approved.statusHistory).toHaveLength(2);
		expect(approved.statusHistory[1]).toEqual({
			fromStatus: 'pending',
			toStatus: 'approved',
			changedAt: '2026-06-27T11:00:00.000Z',
			changedBy: 'reviewer@example.org',
			reason: null,
		});

		const invalid = catchError(() => services.enrollmentRequests.updateStatus(created.id, { status: 'rejected', changedBy: 'reviewer@example.org', reason: 'Too late.' }));
		expect(invalid.status).toBe(409);
		expect(invalid.code).toBe('INVALID_STATUS_TRANSITION');
		expect(services.enrollmentRequests.getById(created.id).status).toBe('approved');
		expect(services.enrollmentRequests.getById(created.id).statusHistory).toHaveLength(2);

		const cancelled = services.enrollmentRequests.updateStatus(created.id, { status: 'cancelled', changedBy: 'reviewer@example.org', reason: 'Learner withdrew.' });
		expect(cancelled.status).toBe('cancelled');
		expect(cancelled.statusHistory).toHaveLength(3);
		expect(cancelled.statusHistory[2]?.reason).toBe('Learner withdrew.');
	});

	it('supports pending cancellation and requires a reason to reject', async () => {
		const services = await openServices();
		const created = services.enrollmentRequests.create(createBody({ learnerEmail: 'tara@example.org' }));
		const missingReason = catchError(() => services.enrollmentRequests.updateStatus(created.id, { status: 'rejected', changedBy: 'reviewer@example.org' }));

		expect(missingReason.status).toBe(400);
		expect(missingReason.code).toBe('INVALID_REQUEST');
		expect(missingReason.details).toEqual([{ field: 'reason', message: 'reason is required when rejecting a request.' }]);
		expect(services.enrollmentRequests.getById(created.id).statusHistory).toHaveLength(1);

		const blankReason = catchError(() => services.enrollmentRequests.updateStatus(created.id, { status: 'rejected', changedBy: 'reviewer@example.org', reason: '   ' }));
		expect(blankReason.status).toBe(400);

		const rejected = services.enrollmentRequests.updateStatus(created.id, { status: 'rejected', changedBy: 'reviewer@example.org', reason: 'Learner has not completed the prerequisite course.' });
		expect(rejected.status).toBe('rejected');
		expect(rejected.statusHistory[1]).toMatchObject({
			fromStatus: 'pending',
			toStatus: 'rejected',
			changedBy: 'reviewer@example.org',
			reason: 'Learner has not completed the prerequisite course.',
		});

		const another = services.enrollmentRequests.create(createBody({ learnerEmail: 'nia@example.org' }));
		const cancelled = services.enrollmentRequests.updateStatus(another.id, { status: 'cancelled', changedBy: 'learner@example.org' });
		expect(cancelled.status).toBe('cancelled');
		expect(cancelled.statusHistory).toHaveLength(2);

		const terminal = catchError(() => services.enrollmentRequests.updateStatus(rejected.id, { status: 'approved', changedBy: 'reviewer@example.org' }));
		expect(terminal.status).toBe(409);
		expect(terminal.code).toBe('INVALID_STATUS_TRANSITION');
	});

	it('rejects a malformed status change before it looks up the request', async () => {
		const services = await openServices();
		const error = catchError(() => services.enrollmentRequests.updateStatus('enroll-404', { status: 'hold', note: true }));

		expect(error.status).toBe(400);
		expect(error.code).toBe('INVALID_REQUEST');
		expect(error.details.map((detail) => detail.field)).toEqual(['note', 'status', 'changedBy']);
	});
});
