import { courseCatalog, type EnrollmentRequest, type EnrollmentStatus } from '@axc/domain';
import { describe, expect, it } from 'vitest';
import { type ApplicationServices, buildApplicationServicesFactory, type ServiceResult } from './index.ts';

const justification = 'I need this course to prepare for upcoming secure development work.';

describe('enrollment requests', () => {
	it('creates a pending request and records the initial history entry', async () => {
		const { application } = harness();
		const created = await create(application);
		expect(created.ok).toBe(true);
		if (!created.ok) {
			return;
		}
		expect(created.value).toMatchObject({
			id: 'enroll-001',
			courseId: 'course-001',
			learnerEmail: 'learner@example.org',
			justification,
			status: 'pending',
			createdAt: '2026-06-27T10:00:01.000Z',
			updatedAt: '2026-06-27T10:00:01.000Z',
		});
		expect(created.value.statusHistory).toEqual([
			{
				fromStatus: null,
				toStatus: 'pending',
				changedAt: '2026-06-27T10:00:01.000Z',
				changedBy: 'system',
				reason: null,
			},
		]);

		const loaded = await application.enrollmentRequests.getById(created.value.id);
		expect(loaded).toEqual(created);
	});

	it('rejects a missing, draft, or retired course', async () => {
		const { application } = harness();
		await expectFailure(create(application, { courseId: 'course-404' }), 404, 'COURSE_NOT_FOUND');
		await expectFailure(create(application, { courseId: 'course-003' }), 409, 'COURSE_NOT_ACTIVE');
		await expectFailure(create(application, { courseId: 'course-004' }), 409, 'COURSE_NOT_ACTIVE');
	});

	it('rejects an invalid email and a justification outside 20 to 500 characters', async () => {
		const { application } = harness();
		const invalidEmail = await create(application, { learnerEmail: 'not-an-email' });
		await expectFailure(Promise.resolve(invalidEmail), 400, 'INVALID_REQUEST', 'learnerEmail');

		const tooShort = await create(application, { justification: 'too short' });
		expect(tooShort.ok).toBe(false);
		if (!tooShort.ok) {
			expect(tooShort.error.details).toEqual([{ field: 'justification', message: 'justification must be between 20 and 500 characters.' }]);
		}

		await expectFailure(create(application, { justification: 'a'.repeat(501) }), 400, 'INVALID_REQUEST', 'justification');
		const minimum = await create(application, { justification: 'a'.repeat(20) });
		const maximum = await create(application, { learnerEmail: 'other@example.org', justification: 'b'.repeat(500) });
		expect(minimum.ok).toBe(true);
		expect(maximum.ok).toBe(true);
	});

	it('blocks a second pending or approved request and allows one after cancellation', async () => {
		const { application } = harness();
		const first = await create(application);
		expect(first.ok).toBe(true);
		await expectFailure(create(application), 409, 'DUPLICATE_ACTIVE_REQUEST');
		await expectFailure(create(application, { learnerEmail: 'Learner@example.org' }), 409, 'DUPLICATE_ACTIVE_REQUEST');

		if (!first.ok) {
			return;
		}
		const approved = await application.enrollmentRequests.updateStatus(first.value.id, { status: 'approved', changedBy: 'reviewer@example.org' });
		expect(approved.ok).toBe(true);
		await expectFailure(create(application), 409, 'DUPLICATE_ACTIVE_REQUEST');

		const cancelled = await application.enrollmentRequests.updateStatus(first.value.id, { status: 'cancelled', changedBy: 'reviewer@example.org' });
		expect(cancelled.ok).toBe(true);
		const again = await create(application);
		expect(again.ok).toBe(true);
	});

	it('filters by status, courseId, and learnerEmail', async () => {
		const { application } = harness();
		await create(application);
		const other = await create(application, { courseId: 'course-005', learnerEmail: 'other@example.org' });
		expect(other.ok).toBe(true);
		if (!other.ok) {
			return;
		}
		await application.enrollmentRequests.updateStatus(other.value.id, { status: 'approved', changedBy: 'reviewer@example.org' });

		const pending = await application.enrollmentRequests.list({ status: 'pending' });
		const byCourse = await application.enrollmentRequests.list({ courseId: 'course-005' });
		const byEmail = await application.enrollmentRequests.list({ learnerEmail: 'OTHER@example.org' });
		const combined = await application.enrollmentRequests.list({ status: 'pending', courseId: 'course-001', learnerEmail: 'learner@example.org' });
		expect(ids(pending)).toEqual(['enroll-001']);
		expect(ids(byCourse)).toEqual(['enroll-002']);
		expect(ids(byEmail)).toEqual(['enroll-002']);
		expect(ids(combined)).toEqual(['enroll-001']);

		await expectFailure(application.enrollmentRequests.list({ status: 'closed' }), 400, 'INVALID_REQUEST', 'status');
	});

	it('applies the valid status transitions and appends history', async () => {
		const { application } = harness();
		await expectTransition(application, 'approved', null);
		await expectTransition(application, 'rejected', 'Learner has not completed the prerequisite course.');
		await expectTransition(application, 'cancelled', null);

		const approved = await create(application, { learnerEmail: 'fourth@example.org' });
		expect(approved.ok).toBe(true);
		if (!approved.ok) {
			return;
		}
		await application.enrollmentRequests.updateStatus(approved.value.id, { status: 'approved', changedBy: 'reviewer@example.org' });
		const cancelled = await application.enrollmentRequests.updateStatus(approved.value.id, { status: 'cancelled', changedBy: 'reviewer@example.org' });
		expect(cancelled.ok).toBe(true);
		if (!cancelled.ok) {
			return;
		}
		expect(cancelled.value.status).toBe('cancelled');
		expect(cancelled.value.statusHistory.map((entry) => entry.toStatus)).toEqual(['pending', 'approved', 'cancelled']);
		expect(cancelled.value.statusHistory[2]).toMatchObject({ fromStatus: 'approved', changedBy: 'reviewer@example.org', reason: null });
	});

	it('rejects an invalid transition and a rejection without a reason', async () => {
		const { application } = harness();
		const created = await create(application);
		expect(created.ok).toBe(true);
		if (!created.ok) {
			return;
		}
		await expectFailure(application.enrollmentRequests.updateStatus(created.value.id, { status: 'rejected', changedBy: 'reviewer@example.org' }), 400, 'INVALID_REQUEST', 'reason');
		await expectFailure(application.enrollmentRequests.updateStatus(created.value.id, { status: 'rejected', changedBy: 'reviewer@example.org', reason: '   ' }), 400, 'INVALID_REQUEST', 'reason');
		await expectFailure(application.enrollmentRequests.updateStatus(created.value.id, { status: 'closed', changedBy: 'reviewer@example.org' }), 400, 'INVALID_REQUEST', 'status');

		await application.enrollmentRequests.updateStatus(created.value.id, { status: 'approved', changedBy: 'reviewer@example.org' });
		await expectFailure(application.enrollmentRequests.updateStatus(created.value.id, { status: 'rejected', changedBy: 'reviewer@example.org', reason: 'Too late.' }), 409, 'INVALID_STATUS_TRANSITION');
		await expectFailure(application.enrollmentRequests.getById('missing'), 404, 'ENROLLMENT_REQUEST_NOT_FOUND');
		await expectFailure(application.enrollmentRequests.updateStatus('missing', { status: 'approved', changedBy: 'reviewer@example.org' }), 404, 'ENROLLMENT_REQUEST_NOT_FOUND');
	});
});

async function expectTransition(application: Pick<ApplicationServices, 'enrollmentRequests'>, status: EnrollmentStatus, reason: string | null): Promise<void> {
	const created = await create(application, { learnerEmail: `${status}@example.org` });
	expect(created.ok).toBe(true);
	if (!created.ok) {
		return;
	}
	const body = reason === null ? { status, changedBy: 'reviewer@example.org' } : { status, changedBy: 'reviewer@example.org', reason };
	const updated = await application.enrollmentRequests.updateStatus(created.value.id, body);
	expect(updated.ok).toBe(true);
	if (!updated.ok) {
		return;
	}
	expect(updated.value.status).toBe(status);
	expect(updated.value.statusHistory).toHaveLength(2);
	expect(updated.value.statusHistory[1]).toMatchObject({ fromStatus: 'pending', toStatus: status, changedBy: 'reviewer@example.org', reason });
}

function harness() {
	let tick = 0;
	let sequence = 0;
	const enrollmentRequests = enrollmentRepository();
	const applicationPromise = buildApplicationServicesFactory(
		{ environment: 'test' },
		{
			courses: {
				list: () => Promise.resolve(courseCatalog.map((course) => structuredClone(course))),
				getById: (id) => {
					const found = courseCatalog.find((course) => course.id === id);
					return Promise.resolve(found === undefined ? undefined : structuredClone(found));
				},
			},
			enrollmentRequests,
			now: () => {
				tick += 1;
				return `2026-06-27T10:00:${String(tick).padStart(2, '0')}.000Z`;
			},
			createEnrollmentId: () => {
				sequence += 1;
				return `enroll-${String(sequence).padStart(3, '0')}`;
			},
		},
	).forRequest();
	return {
		application: {
			enrollmentRequests: {
				create: (body: unknown) => applicationPromise.then((application) => application.enrollmentRequests.create(body)),
				getById: (id: string) => applicationPromise.then((application) => application.enrollmentRequests.getById(id)),
				list: (query: Readonly<Record<string, string>>) => applicationPromise.then((application) => application.enrollmentRequests.list(query)),
				updateStatus: (id: string, body: unknown) => applicationPromise.then((application) => application.enrollmentRequests.updateStatus(id, body)),
			},
		} satisfies Pick<ApplicationServices, 'enrollmentRequests'>,
	};
}

function create(application: Pick<ApplicationServices, 'enrollmentRequests'>, overrides: { courseId?: string; learnerEmail?: string; justification?: string } = {}) {
	return application.enrollmentRequests.create({
		courseId: overrides.courseId ?? 'course-001',
		learnerEmail: overrides.learnerEmail ?? 'learner@example.org',
		justification: overrides.justification ?? justification,
	});
}

async function expectFailure(result: Promise<ServiceResult<unknown>>, status: number, code: string, field?: string): Promise<void> {
	const resolved = await result;
	expect(resolved.ok).toBe(false);
	if (!resolved.ok) {
		expect(resolved.error.status).toBe(status);
		expect(resolved.error.code).toBe(code);
		if (field !== undefined) {
			expect(resolved.error.details.some((detail) => detail.field === field)).toBe(true);
		}
	}
}

function ids(result: ServiceResult<{ items: EnrollmentRequest[] }>): string[] {
	expect(result.ok).toBe(true);
	return result.ok ? result.value.items.map((item) => item.id) : [];
}

function enrollmentRepository() {
	const stored: EnrollmentRequest[] = [];
	return {
		list: () => Promise.resolve(stored.map((request) => structuredClone(request))),
		getById: (id: string) => {
			const found = stored.find((request) => request.id === id);
			return Promise.resolve(found === undefined ? undefined : structuredClone(found));
		},
		save: (request: EnrollmentRequest) => {
			const copy = structuredClone(request);
			const index = stored.findIndex((existing) => existing.id === copy.id);
			if (index === -1) {
				stored.push(copy);
			} else {
				stored[index] = copy;
			}
			return Promise.resolve(structuredClone(copy));
		},
	};
}
