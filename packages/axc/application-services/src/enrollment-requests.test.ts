import type { EnrollmentRequest } from '@axc/domain';
import { describe, expect, it } from 'vitest';
import { type ApiErrorBody, buildApplicationServicesFactory, type EnrollmentResult } from './index.ts';

const NOW = '2026-06-27T10:00:00.000Z';
const LATER = '2026-06-27T11:00:00.000Z';
const JUSTIFICATION = 'I need this course to prepare for upcoming secure development work.';

describe('enrollment requests', () => {
	it('creates a pending request and records the initial history entry', async () => {
		const created = await create();
		expect(created).toEqual({
			id: 'enroll-001',
			courseId: 'course-001',
			learnerEmail: 'learner@example.org',
			justification: JUSTIFICATION,
			status: 'pending',
			createdAt: NOW,
			updatedAt: NOW,
			statusHistory: [
				{
					fromStatus: null,
					toStatus: 'pending',
					changedAt: NOW,
					changedBy: 'system',
					reason: null,
				},
			],
		});
	});

	it('rejects a missing, draft, or retired course', async () => {
		expect(code(await createResult({ courseId: 'course-404' })).code).toBe('COURSE_NOT_FOUND');
		expect(code(await createResult({ courseId: 'course-003' })).code).toBe('COURSE_NOT_ACTIVE');
		expect(code(await createResult({ courseId: 'course-006' })).code).toBe('COURSE_NOT_ACTIVE');
	});

	it('rejects an invalid email and a justification outside 20 to 500 characters', async () => {
		const invalid = await createResult({ learnerEmail: 'not-an-email', justification: 'too short' });
		expect(invalid.ok).toBe(false);
		if (invalid.ok) {
			throw new Error('expected validation errors');
		}
		expect(invalid.error).toEqual({
			code: 'INVALID_REQUEST',
			message: 'The request could not be completed.',
			details: [
				{ field: 'learnerEmail', message: 'learnerEmail must be a valid email address.' },
				{ field: 'justification', message: 'justification must be between 20 and 500 characters.' },
			],
		});
		expect((await createResult({ justification: 'x'.repeat(19) })).ok).toBe(false);
		expect((await createResult({ justification: 'x'.repeat(501) })).ok).toBe(false);
		expect((await create({ justification: 'x'.repeat(20) })).justification).toBe('x'.repeat(20));
		expect((await create({ justification: 'x'.repeat(500) })).justification).toHaveLength(500);
	});

	it('trims the email and justification before storing them', async () => {
		const created = await create({
			learnerEmail: ' Learner@Example.org ',
			justification: `  ${'x'.repeat(20)}  `,
		});
		expect(created.learnerEmail).toBe('Learner@Example.org');
		expect(created.justification).toBe('x'.repeat(20));
	});

	it('blocks a second pending or approved request and allows one after rejection or cancellation', async () => {
		const requests = await service();
		const first = expectOk(requests.create(body()));
		expect(code(requests.create(body({ learnerEmail: 'Learner@Example.org' }))).code).toBe('DUPLICATE_ACTIVE_REQUEST');
		expectOk(requests.updateStatus(first.id, { status: 'approved', changedBy: 'reviewer@example.org' }));
		expect(code(requests.create(body())).code).toBe('DUPLICATE_ACTIVE_REQUEST');

		const otherCourse = expectOk(requests.create(body({ courseId: 'course-002', learnerEmail: 'learner@example.org' })));
		expect(otherCourse.status).toBe('pending');

		const rejected = await service();
		const pending = expectOk(rejected.create(body()));
		expectOk(rejected.updateStatus(pending.id, { status: 'rejected', changedBy: 'reviewer@example.org', reason: 'Prerequisite is missing.' }));
		expect(expectOk(rejected.create(body())).id).toBe('enroll-002');

		const cancelled = await service();
		const approved = expectOk(cancelled.create(body()));
		expectOk(cancelled.updateStatus(approved.id, { status: 'approved', changedBy: 'reviewer@example.org' }));
		expectOk(cancelled.updateStatus(approved.id, { status: 'cancelled', changedBy: 'reviewer@example.org' }));
		expect(expectOk(cancelled.create(body())).status).toBe('pending');
	});

	it('returns one request, including status history', async () => {
		const requests = await service();
		const created = expectOk(requests.create(body()));
		expect(expectOk(requests.getById(created.id)).statusHistory).toHaveLength(1);
		expect(code(requests.getById('enroll-404')).code).toBe('ENROLLMENT_REQUEST_NOT_FOUND');
	});

	it('filters the list by status, course, and learner email', async () => {
		const requests = await service();
		const pending = expectOk(requests.create(body({ learnerEmail: 'learner@example.org', courseId: 'course-001' })));
		expectOk(requests.create(body({ learnerEmail: 'other@example.org', courseId: 'course-001' })));
		expectOk(requests.create(body({ learnerEmail: 'learner@example.org', courseId: 'course-002' })));
		expectOk(requests.updateStatus(pending.id, { status: 'approved', changedBy: 'reviewer@example.org' }));

		expect(ids(requests.list({ status: ['approved'], courseId: ['course-001'], learnerEmail: ['LEARNER@example.org'] }))).toEqual([pending.id]);
		expect(ids(requests.list({ status: ['pending'], courseId: ['course-001'] }))).toEqual(['enroll-002']);
		expect(ids(requests.list({ learnerEmail: ['learner@example.org'] }))).toEqual([pending.id, 'enroll-003']);
		expect(ids(requests.list({}))).toEqual([pending.id, 'enroll-002', 'enroll-003']);
		expect(code(requests.list({ status: ['active'] })).code).toBe('INVALID_REQUEST');
		expect(code(requests.list({ learnerEmail: ['not-an-email'] })).code).toBe('INVALID_REQUEST');
		expect(code(requests.list({ limit: ['1'] })).code).toBe('INVALID_REQUEST');
	});

	it('applies the allowed status transitions and records each change', async () => {
		const clock = sequentialClock();
		const requests = await service(clock);
		const created = expectOk(requests.create(body()));
		expectOk(requests.updateStatus(created.id, { status: 'approved', changedBy: 'reviewer@example.org', reason: 'Seat available.' }));
		const cancelled = expectOk(requests.updateStatus(created.id, { status: 'cancelled', changedBy: 'reviewer@example.org' }));
		expect(cancelled.status).toBe('cancelled');
		expect(cancelled.statusHistory.map((entry) => entry.toStatus)).toEqual(['pending', 'approved', 'cancelled']);
		expect(cancelled.statusHistory[1]).toMatchObject({ fromStatus: 'pending', changedBy: 'reviewer@example.org', reason: 'Seat available.' });
		expect(cancelled.statusHistory[2]).toMatchObject({ fromStatus: 'approved', toStatus: 'cancelled', reason: null });
		expect(cancelled.updatedAt).toBe(LATER);

		const pending = await service();
		const rejectedSource = expectOk(pending.create(body()));
		const rejected = expectOk(pending.updateStatus(rejectedSource.id, { status: 'rejected', changedBy: 'reviewer@example.org', reason: 'Prerequisite is missing.' }));
		expect(rejected.statusHistory).toHaveLength(2);
		expect(rejected.statusHistory[1]?.reason).toBe('Prerequisite is missing.');
		const same = await service();
		const directCancel = expectOk(same.create(body()));
		expect(expectOk(same.updateStatus(directCancel.id, { status: 'cancelled', changedBy: 'learner@example.org' })).status).toBe('cancelled');
	});

	it('keeps a failed transition and a rejection without a reason from changing history', async () => {
		const requests = await service();
		const created = expectOk(requests.create(body()));
		expectOk(requests.updateStatus(created.id, { status: 'approved', changedBy: 'reviewer@example.org' }));
		const invalid = requests.updateStatus(created.id, { status: 'rejected', changedBy: 'reviewer@example.org', reason: 'Too late.' });
		expect(code(invalid).code).toBe('INVALID_STATUS_TRANSITION');
		expect(expectOk(requests.getById(created.id)).statusHistory.map((entry) => entry.toStatus)).toEqual(['pending', 'approved']);

		const open = await service();
		const pending = expectOk(open.create(body()));
		const missingReason = open.updateStatus(pending.id, { status: 'rejected', changedBy: 'reviewer@example.org', reason: '   ' });
		expect(missingReason.ok).toBe(false);
		if (!missingReason.ok) {
			expect(missingReason.error.details).toEqual([{ field: 'reason', message: 'reason is required when rejecting a request.' }]);
		}
		expect(expectOk(open.getById(pending.id)).status).toBe('pending');
		expect(code(open.updateStatus(pending.id, { status: 'pending', changedBy: 'reviewer@example.org' })).code).toBe('INVALID_REQUEST');
		expect(code(open.updateStatus('enroll-404', { status: 'approved', changedBy: 'reviewer@example.org' })).code).toBe('ENROLLMENT_REQUEST_NOT_FOUND');
	});
});

function body(overrides: Record<string, unknown> = {}): Record<string, unknown> {
	return {
		courseId: 'course-001',
		learnerEmail: 'learner@example.org',
		justification: JUSTIFICATION,
		...overrides,
	};
}

async function service(now: () => string = () => NOW) {
	const services = await buildApplicationServicesFactory({ environment: 'test' }, { now }).forRequest();
	return services.enrollmentRequests;
}

async function create(overrides: Record<string, unknown> = {}): Promise<EnrollmentRequest> {
	return expectOk((await service()).create(body(overrides)));
}

async function createResult(overrides: Record<string, unknown>): Promise<EnrollmentResult<EnrollmentRequest>> {
	return (await service()).create(body(overrides));
}

function expectOk<T>(result: EnrollmentResult<T>): T {
	expect(result.ok).toBe(true);
	if (!result.ok) {
		throw new Error(`${result.error.code}: ${result.error.message}`);
	}
	return result.value;
}

function code<T>(result: EnrollmentResult<T>): ApiErrorBody {
	expect(result.ok).toBe(false);
	if (result.ok) {
		throw new Error('expected an error');
	}
	return result.error;
}

function ids(result: EnrollmentResult<{ items: readonly { id: string }[] }>): string[] {
	return expectOk(result).items.map((item) => item.id);
}

function sequentialClock(): () => string {
	const stamps = [NOW, '2026-06-27T10:30:00.000Z', LATER];
	let index = 0;
	return () => {
		const stamp = stamps[index] ?? LATER;
		index += 1;
		return stamp;
	};
}
