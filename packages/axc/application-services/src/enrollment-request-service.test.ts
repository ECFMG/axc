import type { EnrollmentRequest } from '@axc/domain';
import { createInMemoryCourseRepository, createInMemoryEnrollmentRequestRepository } from '@axc/persistence';
import { beforeEach, describe, expect, it } from 'vitest';
import { createEnrollmentRequestService, type EnrollmentRequestService } from './enrollment-request-service.ts';

const ACTIVE_COURSE = 'course-001';
const DRAFT_COURSE = 'course-005';
const RETIRED_COURSE = 'course-006';
const LEARNER = 'learner@example.org';
const JUSTIFICATION = 'I need this course to prepare for upcoming secure development work.';

const body = (overrides: Record<string, unknown> = {}) => ({ courseId: ACTIVE_COURSE, learnerEmail: LEARNER, justification: JUSTIFICATION, ...overrides });

let service: EnrollmentRequestService;

beforeEach(() => {
	service = createEnrollmentRequestService(createInMemoryCourseRepository(), createInMemoryEnrollmentRequestRepository());
});

const createdRequest = (overrides: Record<string, unknown> = {}): Promise<EnrollmentRequest> => service.create(body(overrides));

describe('create', () => {
	it('creates a pending request carrying the opening audit entry', async () => {
		const created = await createdRequest();

		expect(created).toMatchObject({
			id: 'enroll-001',
			courseId: ACTIVE_COURSE,
			learnerEmail: LEARNER,
			justification: JUSTIFICATION,
			status: 'pending',
		});
		expect(created.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
		expect(created.updatedAt).toBe(created.createdAt);
		expect(created.statusHistory).toStrictEqual([{ fromStatus: null, toStatus: 'pending', changedAt: created.createdAt, changedBy: 'system', reason: null }]);
	});

	it('rejects a request for a course that does not exist', async () => {
		await expect(createdRequest({ courseId: 'course-404' })).rejects.toMatchObject({ code: 'COURSE_NOT_FOUND' });
	});

	it.each([
		['draft', DRAFT_COURSE],
		['retired', RETIRED_COURSE],
	])('rejects a request for a %s course', async (_status, courseId) => {
		await expect(createdRequest({ courseId })).rejects.toMatchObject({ code: 'COURSE_NOT_ACTIVE' });
	});

	it.each([
		['an invalid email', { learnerEmail: 'not-an-email' }],
		['a justification that is too short', { justification: 'too short' }],
		['a justification that is too long', { justification: 'a'.repeat(501) }],
	])('rejects %s', async (_label, overrides) => {
		await expect(createdRequest(overrides)).rejects.toMatchObject({ code: 'INVALID_REQUEST' });
	});

	it('rejects a duplicate pending request for the same learner and course', async () => {
		await createdRequest();

		await expect(createdRequest()).rejects.toMatchObject({ code: 'DUPLICATE_ACTIVE_REQUEST' });
	});

	it('rejects a duplicate request even when the learner email casing differs', async () => {
		await createdRequest();

		await expect(createdRequest({ learnerEmail: 'LEARNER@Example.ORG' })).rejects.toMatchObject({ code: 'DUPLICATE_ACTIVE_REQUEST' });
	});

	it('rejects a duplicate request when the existing one is approved', async () => {
		const created = await createdRequest();
		await service.changeStatus(created.id, { status: 'approved', changedBy: 'reviewer@example.org' });

		await expect(createdRequest()).rejects.toMatchObject({ code: 'DUPLICATE_ACTIVE_REQUEST' });
	});

	it.each(['rejected', 'cancelled'])('allows a new request once the previous one is %s', async (status) => {
		const created = await createdRequest();
		await service.changeStatus(created.id, { status, changedBy: 'reviewer@example.org', reason: 'Not this time.' });

		await expect(createdRequest()).resolves.toMatchObject({ id: 'enroll-002', status: 'pending' });
	});

	it('allows the same learner to request a different course', async () => {
		await createdRequest();

		await expect(createdRequest({ courseId: 'course-003' })).resolves.toMatchObject({ courseId: 'course-003', status: 'pending' });
	});
});

describe('getById', () => {
	it('returns the stored request with its status history', async () => {
		const created = await createdRequest();

		await expect(service.getById(created.id)).resolves.toStrictEqual(created);
	});

	it('reports a missing request as ENROLLMENT_REQUEST_NOT_FOUND', async () => {
		await expect(service.getById('enroll-404')).rejects.toMatchObject({ code: 'ENROLLMENT_REQUEST_NOT_FOUND' });
	});
});

describe('list', () => {
	beforeEach(async () => {
		await createdRequest();
		await createdRequest({ courseId: 'course-003', learnerEmail: 'other@example.org' });
		const third = await createdRequest({ courseId: 'course-004' });
		await service.changeStatus(third.id, { status: 'approved', changedBy: 'reviewer@example.org' });
	});

	it('returns every request, most recently created first', async () => {
		await expect(service.list({})).resolves.toMatchObject([{ id: 'enroll-003' }, { id: 'enroll-002' }, { id: 'enroll-001' }]);
	});

	it('filters by status', async () => {
		await expect(service.list({ status: 'approved' })).resolves.toMatchObject([{ id: 'enroll-003' }]);
		await expect(service.list({ status: 'pending' })).resolves.toMatchObject([{ id: 'enroll-002' }, { id: 'enroll-001' }]);
	});

	it('filters by courseId', async () => {
		await expect(service.list({ courseId: 'course-003' })).resolves.toMatchObject([{ id: 'enroll-002' }]);
	});

	it('filters by learnerEmail, ignoring casing', async () => {
		await expect(service.list({ learnerEmail: 'OTHER@example.org' })).resolves.toMatchObject([{ id: 'enroll-002' }]);
	});

	it('combines filters', async () => {
		await expect(service.list({ status: 'pending', learnerEmail: LEARNER, courseId: ACTIVE_COURSE })).resolves.toMatchObject([{ id: 'enroll-001' }]);
	});

	it('returns an empty list when nothing matches', async () => {
		await expect(service.list({ learnerEmail: 'nobody@example.org' })).resolves.toStrictEqual([]);
	});

	it('rejects an unknown status filter', async () => {
		await expect(service.list({ status: 'archived' })).rejects.toMatchObject({ code: 'INVALID_QUERY_PARAMETER' });
	});
});

describe('changeStatus', () => {
	it.each([
		['approved', undefined],
		['rejected', 'Learner has not completed the prerequisite course.'],
		['cancelled', undefined],
	])('moves a pending request to %s', async (status, reason) => {
		const created = await createdRequest();

		const updated = await service.changeStatus(created.id, { status, changedBy: 'reviewer@example.org', reason });

		expect(updated.status).toBe(status);
		expect(updated.statusHistory).toHaveLength(2);
		expect(updated.statusHistory.at(-1)).toMatchObject({ fromStatus: 'pending', toStatus: status, changedBy: 'reviewer@example.org', reason: reason ?? null });
	});

	it('moves an approved request to cancelled and keeps the whole audit trail', async () => {
		const created = await createdRequest();
		await service.changeStatus(created.id, { status: 'approved', changedBy: 'reviewer@example.org' });

		const cancelled = await service.changeStatus(created.id, { status: 'cancelled', changedBy: 'learner@example.org' });

		expect(cancelled.status).toBe('cancelled');
		expect(cancelled.statusHistory.map((entry) => entry.toStatus)).toStrictEqual(['pending', 'approved', 'cancelled']);
		expect(cancelled.statusHistory.map((entry) => entry.fromStatus)).toStrictEqual([null, 'pending', 'approved']);
	});

	it('persists the change so later reads see it', async () => {
		const created = await createdRequest();
		await service.changeStatus(created.id, { status: 'approved', changedBy: 'reviewer@example.org' });

		await expect(service.getById(created.id)).resolves.toMatchObject({ status: 'approved' });
	});

	it('defaults changedBy to the system actor', async () => {
		const created = await createdRequest();

		const updated = await service.changeStatus(created.id, { status: 'cancelled' });

		expect(updated.statusHistory.at(-1)).toMatchObject({ changedBy: 'system' });
	});

	it.each([
		['approved', 'approved'],
		['approved', 'rejected'],
		['rejected', 'approved'],
		['cancelled', 'approved'],
		['pending', 'pending'],
	])('rejects the %s -> %s transition', async (from, to) => {
		const created = await createdRequest();
		if (from !== 'pending') {
			await service.changeStatus(created.id, { status: from, changedBy: 'reviewer@example.org', reason: 'Initial move.' });
		}

		await expect(service.changeStatus(created.id, { status: to, changedBy: 'reviewer@example.org', reason: 'Follow-up move.' })).rejects.toMatchObject({ code: 'INVALID_STATUS_TRANSITION' });
	});

	it('leaves the stored request untouched when the transition is invalid', async () => {
		const created = await createdRequest();
		await service.changeStatus(created.id, { status: 'cancelled', changedBy: 'learner@example.org' });

		await expect(service.changeStatus(created.id, { status: 'approved', changedBy: 'reviewer@example.org' })).rejects.toMatchObject({ code: 'INVALID_STATUS_TRANSITION' });
		await expect(service.getById(created.id)).resolves.toMatchObject({ status: 'cancelled', statusHistory: [expect.anything(), expect.anything()] });
	});

	it('requires a reason when rejecting', async () => {
		const created = await createdRequest();

		await expect(service.changeStatus(created.id, { status: 'rejected', changedBy: 'reviewer@example.org' })).rejects.toMatchObject({ code: 'INVALID_REQUEST' });
	});

	it('rejects an unknown status value', async () => {
		const created = await createdRequest();

		await expect(service.changeStatus(created.id, { status: 'archived', changedBy: 'reviewer@example.org' })).rejects.toMatchObject({ code: 'INVALID_REQUEST' });
	});

	it('reports a missing request as ENROLLMENT_REQUEST_NOT_FOUND', async () => {
		await expect(service.changeStatus('enroll-404', { status: 'approved', changedBy: 'reviewer@example.org' })).rejects.toMatchObject({ code: 'ENROLLMENT_REQUEST_NOT_FOUND' });
	});
});
