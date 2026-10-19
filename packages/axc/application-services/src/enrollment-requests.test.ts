import type { EnrollmentRequest } from '@axc/domain';
import { courseCatalog, createEnrollmentRequestRepository } from '@axc/persistence';
import { describe, expect, it } from 'vitest';
import { type ApplicationServices, buildApplicationServicesFactory, type EnrollmentRequestOutcome } from './index.ts';

const CREATED_AT = '2026-06-27T10:00:00.000Z';
const UPDATED_AT = '2026-06-27T11:00:00.000Z';
const CANCELLED_AT = '2026-06-27T12:00:00.000Z';
const JUSTIFICATION = 'I need this course to prepare for upcoming secure development work.';
const REVIEWER = 'reviewer@example.org';

describe('enrollment requests', () => {
	it('creates a pending request that matches the documented contract', async () => {
		const repository = createEnrollmentRequestRepository();
		const created = await create(repository, validBody());

		expect(created).toEqual({
			id: 'enroll-001',
			courseId: 'course-001',
			learnerEmail: 'learner@example.org',
			justification: JUSTIFICATION,
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
		expect(await get(repository, created.id)).toEqual(created);
	});

	it('trims the email and justification and keeps the submitted email case', async () => {
		const repository = createEnrollmentRequestRepository();
		const created = await create(repository, {
			courseId: ' course-001 ',
			learnerEmail: '  Learner@Example.org  ',
			justification: `  ${JUSTIFICATION}  `,
		});

		expect(created.courseId).toBe('course-001');
		expect(created.learnerEmail).toBe('Learner@Example.org');
		expect(created.justification).toBe(JUSTIFICATION);
	});

	it('accepts justification at the 20 and 500 character boundaries', async () => {
		const minimum = await create(createEnrollmentRequestRepository(), validBody({ justification: 'a'.repeat(20) }));
		const maximum = await create(createEnrollmentRequestRepository(), validBody({ justification: 'a'.repeat(500) }));

		expect(minimum.justification).toHaveLength(20);
		expect(maximum.justification).toHaveLength(500);
	});

	it('rejects a missing course, a draft course, and a retired course', async () => {
		expect(await createOutcome(createEnrollmentRequestRepository(), validBody({ courseId: 'course-404' }))).toEqual({
			ok: false,
			status: 404,
			error: {
				code: 'COURSE_NOT_FOUND',
				message: 'The course does not exist.',
				details: [{ field: 'courseId', message: 'No course exists with this id.' }],
			},
		});

		for (const courseId of ['course-003', 'course-004']) {
			const outcome = await createOutcome(createEnrollmentRequestRepository(), validBody({ courseId }));
			expect(outcome).toMatchObject({
				ok: false,
				status: 409,
				error: { code: 'COURSE_NOT_ACTIVE', details: [{ field: 'courseId' }] },
			});
			expect(courseCatalog.find((course) => course.id === courseId)?.status).not.toBe('active');
		}
	});

	it('rejects an invalid email and a short or long justification together', async () => {
		const outcome = await createOutcome(
			createEnrollmentRequestRepository(),
			validBody({
				learnerEmail: 'not-an-email',
				justification: 'too short',
			}),
		);

		expect(outcome).toEqual({
			ok: false,
			status: 400,
			error: {
				code: 'INVALID_REQUEST',
				message: 'The request could not be completed.',
				details: [
					{ field: 'learnerEmail', message: 'learnerEmail must be a valid email address.' },
					{ field: 'justification', message: 'justification must be between 20 and 500 characters.' },
				],
			},
		});

		const tooLong = await createOutcome(createEnrollmentRequestRepository(), validBody({ justification: 'a'.repeat(501) }));
		expect(tooLong).toMatchObject({
			ok: false,
			status: 400,
			error: { details: [{ field: 'justification', message: 'justification must be between 20 and 500 characters.' }] },
		});
	});

	it('validates the body before it looks up the course', async () => {
		const outcome = await createOutcome(createEnrollmentRequestRepository(), {
			courseId: 'course-404',
			learnerEmail: 'missing-at-sign',
			justification: 'short',
		});

		expect(outcome).toMatchObject({
			ok: false,
			status: 400,
			error: { code: 'INVALID_REQUEST' },
		});
	});

	it('rejects a non-object body and blank required fields', async () => {
		expect(await createOutcome(createEnrollmentRequestRepository(), [])).toMatchObject({
			ok: false,
			status: 400,
			error: { details: [{ field: 'body', message: 'Request body must be a JSON object.' }] },
		});
		expect(await createOutcome(createEnrollmentRequestRepository(), { courseId: '   ', learnerEmail: 'learner@example.org', justification: JUSTIFICATION })).toMatchObject({
			ok: false,
			error: { details: [{ field: 'courseId', message: 'courseId must be a non-empty string.' }] },
		});
	});

	it('prevents a second pending or approved request for the same learner and course', async () => {
		const pending = createEnrollmentRequestRepository();
		await create(pending, validBody({ learnerEmail: 'Learner@Example.org' }));
		expect(await createOutcome(pending, validBody({ learnerEmail: 'learner@example.org' }))).toMatchObject({
			ok: false,
			status: 409,
			error: { code: 'DUPLICATE_ACTIVE_REQUEST' },
		});

		const approved = createEnrollmentRequestRepository();
		const clock = frozenClock([CREATED_AT, UPDATED_AT]);
		const first = await create(approved, validBody(), clock);
		await update(approved, first.id, { status: 'approved', changedBy: REVIEWER }, clock);
		expect(await createOutcome(approved, validBody(), clock)).toMatchObject({
			ok: false,
			status: 409,
			error: { code: 'DUPLICATE_ACTIVE_REQUEST' },
		});
	});

	it('allows another request when the earlier one was rejected or cancelled, or when the course or learner differs', async () => {
		const repository = createEnrollmentRequestRepository();
		const clock = frozenClock([CREATED_AT, UPDATED_AT, CANCELLED_AT, CREATED_AT]);
		const rejected = await create(repository, validBody({ learnerEmail: 'one@example.org' }), clock);
		await update(repository, rejected.id, { status: 'rejected', changedBy: REVIEWER, reason: 'Prerequisite is missing.' }, clock);
		const replacement = await create(repository, validBody({ learnerEmail: 'one@example.org' }), clock);
		expect(replacement.id).toBe('enroll-002');
		expect(replacement.status).toBe('pending');

		const cancelled = await create(repository, validBody({ learnerEmail: 'two@example.org' }), clock);
		await update(repository, cancelled.id, { status: 'cancelled', changedBy: REVIEWER }, clock);
		expect((await create(repository, validBody({ learnerEmail: 'two@example.org' }), clock)).status).toBe('pending');

		expect((await create(repository, validBody({ learnerEmail: 'two@example.org', courseId: 'course-002' }), clock)).courseId).toBe('course-002');
		expect((await create(repository, validBody({ learnerEmail: 'three@example.org' }), clock)).learnerEmail).toBe('three@example.org');
	});

	it('returns a stored request with its history and 404 when the id is unknown', async () => {
		const repository = createEnrollmentRequestRepository();
		const created = await create(repository, validBody());
		expect(await get(repository, created.id)).toEqual(created);
		expect(await getOutcome(repository, 'enroll-404')).toEqual({
			ok: false,
			status: 404,
			error: {
				code: 'ENROLLMENT_REQUEST_NOT_FOUND',
				message: 'The enrollment request does not exist.',
				details: [{ field: 'id', message: 'No enrollment request exists with this id.' }],
			},
		});
	});

	it('filters by status, courseId, and learnerEmail', async () => {
		const repository = createEnrollmentRequestRepository();
		const clock = frozenClock([CREATED_AT, UPDATED_AT]);
		await create(repository, validBody({ courseId: 'course-005', learnerEmail: 'filter-one@example.org' }), clock);
		const second = await create(repository, validBody({ courseId: 'course-005', learnerEmail: 'filter-two@example.org' }), clock);
		await update(repository, second.id, { status: 'approved', changedBy: REVIEWER }, clock);
		await create(repository, validBody({ courseId: 'course-002', learnerEmail: 'filter-one@example.org' }), clock);

		const services = await open(repository, clock);
		const combined = services.enrollmentRequests.list({
			status: ['pending'],
			courseId: ['course-005'],
			learnerEmail: ['FILTER-ONE@example.org'],
		});
		expect(combined).toMatchObject({ ok: true });
		if (!combined.ok) {
			return;
		}
		expect(combined.items.map((request) => request.learnerEmail)).toEqual(['filter-one@example.org']);

		const byCourse = services.enrollmentRequests.list({ courseId: ['course-005'] });
		expect(byCourse.ok && byCourse.items).toHaveLength(2);

		const byLearner = services.enrollmentRequests.list({ learnerEmail: ['filter-one@example.org'] });
		expect(byLearner.ok && byLearner.items.map((request) => request.courseId)).toEqual(['course-005', 'course-002']);

		const byStatus = services.enrollmentRequests.list({ status: ['approved'] });
		expect(byStatus.ok && byStatus.items.map((request) => request.id)).toEqual([second.id]);

		const none = services.enrollmentRequests.list({ learnerEmail: ['nobody@example.org'] });
		expect(none).toEqual({ ok: true, items: [] });
	});

	it('rejects invalid list filters', async () => {
		const services = await open(createEnrollmentRequestRepository());
		expect(services.enrollmentRequests.list({ status: ['archived'] })).toEqual({
			ok: false,
			status: 400,
			error: {
				code: 'INVALID_REQUEST',
				message: 'The request could not be completed.',
				details: [{ field: 'status', message: 'status must be one of pending, approved, rejected, or cancelled.' }],
			},
		});
		expect(services.enrollmentRequests.list({ status: ['pending', 'approved'] })).toMatchObject({
			ok: false,
			error: { details: [{ field: 'status', message: 'status must be provided once.' }] },
		});
		expect(services.enrollmentRequests.list({ page: ['1'] })).toMatchObject({
			ok: false,
			error: { details: [{ field: 'page', message: 'Unknown query parameter.' }] },
		});
	});

	it('applies the allowed status transitions and records each change', async () => {
		const repository = createEnrollmentRequestRepository();
		const clock = frozenClock([CREATED_AT, UPDATED_AT, CANCELLED_AT]);
		const created = await create(repository, validBody(), clock);

		const approved = await update(repository, created.id, { status: 'approved', changedBy: REVIEWER }, clock);
		expect(approved.status).toBe('approved');
		expect(approved.createdAt).toBe(CREATED_AT);
		expect(approved.updatedAt).toBe(UPDATED_AT);
		expect(approved.statusHistory.map((entry) => [entry.fromStatus, entry.toStatus, entry.changedBy, entry.reason])).toEqual([
			[null, 'pending', 'system', null],
			['pending', 'approved', REVIEWER, null],
		]);

		const cancelled = await update(repository, created.id, { status: 'cancelled', changedBy: 'operator@example.org', reason: 'Learner withdrew.' }, clock);
		expect(cancelled.status).toBe('cancelled');
		expect(cancelled.updatedAt).toBe(CANCELLED_AT);
		expect(cancelled.statusHistory).toHaveLength(3);
		expect(cancelled.statusHistory[2]).toMatchObject({
			fromStatus: 'approved',
			toStatus: 'cancelled',
			changedBy: 'operator@example.org',
			reason: 'Learner withdrew.',
			changedAt: CANCELLED_AT,
		});
	});

	it('rejects a pending request only when a reason is present', async () => {
		const repository = createEnrollmentRequestRepository();
		const clock = frozenClock([CREATED_AT, UPDATED_AT]);
		const created = await create(repository, validBody(), clock);

		expect(await updateOutcome(repository, created.id, { status: 'rejected', changedBy: REVIEWER }, clock)).toEqual({
			ok: false,
			status: 400,
			error: {
				code: 'INVALID_REQUEST',
				message: 'The request could not be completed.',
				details: [{ field: 'reason', message: 'reason must be a non-empty string.' }],
			},
		});
		expect(await updateOutcome(repository, created.id, { status: 'rejected', changedBy: REVIEWER, reason: '   ' }, clock)).toMatchObject({
			ok: false,
			status: 400,
			error: { details: [{ field: 'reason' }] },
		});
		expect((await get(repository, created.id)).status).toBe('pending');
		expect((await get(repository, created.id)).statusHistory).toHaveLength(1);

		const rejected = await update(repository, created.id, { status: 'rejected', changedBy: `  ${REVIEWER}  `, reason: '  Learner has not completed the prerequisite course.  ' }, clock);
		expect(rejected.status).toBe('rejected');
		expect(rejected.statusHistory[1]).toMatchObject({
			fromStatus: 'pending',
			toStatus: 'rejected',
			changedBy: REVIEWER,
			reason: 'Learner has not completed the prerequisite course.',
		});
	});

	it('returns 409 for an invalid transition and 400 for an invalid status value', async () => {
		const repository = createEnrollmentRequestRepository();
		const clock = frozenClock([CREATED_AT, UPDATED_AT]);
		const created = await create(repository, validBody(), clock);

		expect(await updateOutcome(repository, created.id, { status: 'pending', changedBy: REVIEWER }, clock)).toMatchObject({
			ok: false,
			status: 409,
			error: {
				code: 'INVALID_STATUS_TRANSITION',
				details: [{ field: 'status', message: 'status cannot change from pending to pending.' }],
			},
		});

		await update(repository, created.id, { status: 'approved', changedBy: REVIEWER }, clock);
		expect(await updateOutcome(repository, created.id, { status: 'rejected', changedBy: REVIEWER }, clock)).toMatchObject({
			ok: false,
			status: 409,
			error: { code: 'INVALID_STATUS_TRANSITION' },
		});
		expect(await updateOutcome(repository, created.id, { status: 'rejected', changedBy: REVIEWER, reason: 'Too late.' }, clock)).toMatchObject({
			ok: false,
			status: 409,
			error: { code: 'INVALID_STATUS_TRANSITION' },
		});
		expect((await get(repository, created.id)).status).toBe('approved');

		expect(await updateOutcome(repository, created.id, { status: 'archived', changedBy: REVIEWER }, clock)).toMatchObject({
			ok: false,
			status: 400,
			error: { code: 'INVALID_REQUEST', details: [{ field: 'status' }] },
		});
		expect(await updateOutcome(repository, 'enroll-404', { status: 'approved', changedBy: REVIEWER }, clock)).toMatchObject({
			ok: false,
			status: 404,
			error: { code: 'ENROLLMENT_REQUEST_NOT_FOUND' },
		});
		expect(await updateOutcome(repository, created.id, { status: 'cancelled' }, clock)).toMatchObject({
			ok: false,
			status: 400,
			error: { details: [{ field: 'changedBy', message: 'changedBy must be a non-empty string.' }] },
		});
	});

	it('supports pending to cancelled directly', async () => {
		const repository = createEnrollmentRequestRepository();
		const clock = frozenClock([CREATED_AT, UPDATED_AT]);
		const created = await create(repository, validBody(), clock);
		const cancelled = await update(repository, created.id, { status: 'cancelled', changedBy: REVIEWER }, clock);

		expect(cancelled.statusHistory.map((entry) => entry.toStatus)).toEqual(['pending', 'cancelled']);
	});

	it('does not let callers mutate the stored history', async () => {
		const repository = createEnrollmentRequestRepository();
		const created = await create(repository, validBody());
		const returned = await get(repository, created.id);
		const entry = returned.statusHistory[0] as { toStatus: string } | undefined;
		if (entry !== undefined) {
			entry.toStatus = 'approved';
		}

		expect((await get(repository, created.id)).status).toBe('pending');
		expect((await get(repository, created.id)).statusHistory[0]?.toStatus).toBe('pending');
	});
});

function validBody(overrides: Record<string, string> = {}): Record<string, string> {
	return {
		courseId: 'course-001',
		learnerEmail: 'learner@example.org',
		justification: JUSTIFICATION,
		...overrides,
	};
}

async function create(repository: ReturnType<typeof createEnrollmentRequestRepository>, body: unknown, now: () => string = () => CREATED_AT): Promise<EnrollmentRequest> {
	const outcome = await createOutcome(repository, body, now);
	if (!outcome.ok) {
		throw new Error(`expected an enrollment request, received ${JSON.stringify(outcome.error)}`);
	}
	return outcome.request;
}

async function createOutcome(repository: ReturnType<typeof createEnrollmentRequestRepository>, body: unknown, now: () => string = () => CREATED_AT): Promise<EnrollmentRequestOutcome> {
	const services = await open(repository, now);
	return services.enrollmentRequests.create(body);
}

async function get(repository: ReturnType<typeof createEnrollmentRequestRepository>, id: string): Promise<EnrollmentRequest> {
	const outcome = await getOutcome(repository, id);
	if (!outcome.ok) {
		throw new Error(`expected an enrollment request, received ${JSON.stringify(outcome.error)}`);
	}
	return outcome.request;
}

async function getOutcome(repository: ReturnType<typeof createEnrollmentRequestRepository>, id: string): Promise<EnrollmentRequestOutcome> {
	const services = await open(repository);
	return services.enrollmentRequests.getById(id);
}

async function update(repository: ReturnType<typeof createEnrollmentRequestRepository>, id: string, body: unknown, now: () => string): Promise<EnrollmentRequest> {
	const outcome = await updateOutcome(repository, id, body, now);
	if (!outcome.ok) {
		throw new Error(`expected an updated enrollment request, received ${JSON.stringify(outcome.error)}`);
	}
	return outcome.request;
}

async function updateOutcome(repository: ReturnType<typeof createEnrollmentRequestRepository>, id: string, body: unknown, now: () => string): Promise<EnrollmentRequestOutcome> {
	const services = await open(repository, now);
	return services.enrollmentRequests.updateStatus(id, body);
}

async function open(repository: ReturnType<typeof createEnrollmentRequestRepository>, now: () => string = () => CREATED_AT): Promise<ApplicationServices> {
	return await buildApplicationServicesFactory({ environment: 'test' }, courseCatalog, repository, now).forRequest();
}

function frozenClock(timestamps: readonly string[]): () => string {
	let index = 0;
	return () => {
		const stamp = timestamps[index] ?? timestamps[timestamps.length - 1] ?? CREATED_AT;
		if (index < timestamps.length - 1) {
			index += 1;
		}
		return stamp;
	};
}
