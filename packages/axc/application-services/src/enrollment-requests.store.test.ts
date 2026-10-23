import { describe, expect, it } from 'vitest';
import { createEnrollmentStore, EnrollmentError, type EnrollmentErrorCode, type EnrollmentStore } from './enrollment-requests.store.ts';
import type { CreateEnrollmentInput, StatusHistoryEntry } from './enrollment-requests.ts';
import { buildApplicationServicesFactory } from './index.ts';

const justification = 'I need this course to prepare for upcoming secure development work.';

const requestFor = (courseId: string, learnerEmail = 'learner@example.org'): CreateEnrollmentInput => ({
	courseId,
	learnerEmail,
	justification,
});

const createStore = (): EnrollmentStore => {
	let seq = 0;
	let tick = 0;
	return createEnrollmentStore({
		newId: () => {
			seq += 1;
			return `enroll-${String(seq).padStart(3, '0')}`;
		},
		now: () => {
			const current = new Date(Date.UTC(2026, 5, 27, 10, 0, tick));
			tick += 1;
			return current;
		},
	});
};

const errorCode = (run: () => void): EnrollmentErrorCode => {
	try {
		run();
	} catch (error) {
		if (error instanceof EnrollmentError) return error.code;
		throw error;
	}
	throw new Error('expected a throw');
};

const historyAt = (history: StatusHistoryEntry[], index: number): StatusHistoryEntry => {
	const entry = history[index];
	if (entry === undefined) throw new Error(`missing history ${index}`);
	return entry;
};

describe('enrollment request store', () => {
	it('creates a pending request with an opening history entry', () => {
		const store = createStore();
		const created = store.create(requestFor('course-001', ' Learner@Example.org '));

		expect(created).toMatchObject({
			id: 'enroll-001',
			courseId: 'course-001',
			learnerEmail: 'learner@example.org',
			justification,
			status: 'pending',
			createdAt: '2026-06-27T10:00:00.000Z',
			updatedAt: '2026-06-27T10:00:00.000Z',
		});
		expect(created.statusHistory).toEqual([
			{
				fromStatus: null,
				toStatus: 'pending',
				changedAt: '2026-06-27T10:00:00.000Z',
				changedBy: 'system',
				reason: null,
			},
		]);
		expect(store.get(created.id).statusHistory).toHaveLength(1);
	});

	it('rejects missing, draft, and retired courses without storing them', () => {
		const store = createStore();

		expect(errorCode(() => store.create(requestFor('course-missing')))).toBe('COURSE_NOT_FOUND');
		expect(errorCode(() => store.create(requestFor('course-003')))).toBe('COURSE_NOT_ACTIVE');
		expect(errorCode(() => store.create(requestFor('course-004')))).toBe('COURSE_NOT_ACTIVE');
		expect(store.list({})).toEqual([]);
	});

	it('rejects invalid email and short justification', () => {
		const store = createStore();

		expect(errorCode(() => store.create({ courseId: 'course-001', learnerEmail: 'not-an-email', justification }))).toBe('INVALID_REQUEST');
		expect(errorCode(() => store.create({ courseId: 'course-001', learnerEmail: 'learner@example.org', justification: 'too short' }))).toBe('INVALID_REQUEST');
		expect(store.list({})).toEqual([]);
	});

	it('blocks a second pending or approved request and allows one after rejection', () => {
		const pending = createStore();
		pending.create(requestFor('course-001'));
		expect(errorCode(() => pending.create(requestFor('course-001', 'LEARNER@example.org')))).toBe('DUPLICATE_ACTIVE_REQUEST');

		const approved = createStore();
		const first = approved.create(requestFor('course-002'));
		approved.changeStatus(first.id, { status: 'approved', changedBy: 'reviewer@example.org' });
		expect(errorCode(() => approved.create(requestFor('course-002')))).toBe('DUPLICATE_ACTIVE_REQUEST');

		const rejected = createStore();
		const blocked = rejected.create(requestFor('course-005'));
		rejected.changeStatus(blocked.id, { status: 'rejected', changedBy: 'reviewer@example.org', reason: 'Prerequisite is missing.' });
		const again = rejected.create(requestFor('course-005'));
		expect(again.status).toBe('pending');
		expect(rejected.list({ learnerEmail: 'learner@example.org', courseId: 'course-005' })).toHaveLength(2);
	});

	it('filters by status, course, and learner email', () => {
		const store = createStore();
		store.create(requestFor('course-001', 'a@example.org'));
		const other = store.create(requestFor('course-006', 'b@example.org'));
		store.changeStatus(other.id, { status: 'cancelled', changedBy: 'reviewer@example.org' });

		const pending = store.list({ status: 'pending' });
		expect(pending.every((item) => item.status === 'pending')).toBe(true);
		expect(pending.some((item) => item.learnerEmail === 'a@example.org')).toBe(true);

		const byCourse = store.list({ courseId: 'course-006', learnerEmail: 'B@Example.org' });
		expect(byCourse).toHaveLength(1);
		expect(byCourse[0]?.status).toBe('cancelled');
	});

	it('applies valid transitions and appends history', () => {
		const store = createStore();
		const created = store.create(requestFor('course-008'));
		const approved = store.changeStatus(created.id, { status: 'approved', changedBy: 'reviewer@example.org' });
		const cancelled = store.changeStatus(created.id, { status: 'cancelled', changedBy: 'reviewer@example.org' });

		expect(approved.status).toBe('approved');
		expect(cancelled.status).toBe('cancelled');
		expect(cancelled.statusHistory.map((entry) => entry.toStatus)).toEqual(['pending', 'approved', 'cancelled']);
		expect(historyAt(cancelled.statusHistory, 0).fromStatus).toBeNull();
		expect(historyAt(cancelled.statusHistory, 1).fromStatus).toBe('pending');
		expect(historyAt(cancelled.statusHistory, 2)).toMatchObject({ fromStatus: 'approved', toStatus: 'cancelled', changedBy: 'reviewer@example.org', reason: null });

		const direct = createStore().create(requestFor('course-009'));
		const stopped = createStore();
		const pending = stopped.create(requestFor('course-009'));
		expect(stopped.changeStatus(pending.id, { status: 'cancelled', changedBy: 'reviewer@example.org' }).status).toBe('cancelled');
		expect(direct.status).toBe('pending');
	});

	it('rejects invalid transitions and a rejection without a reason', () => {
		const store = createStore();
		const created = store.create(requestFor('course-011'));
		expect(errorCode(() => store.changeStatus(created.id, { status: 'rejected', changedBy: 'reviewer@example.org', reason: '   ' }))).toBe('INVALID_REQUEST');
		expect(store.get(created.id).status).toBe('pending');
		expect(store.get(created.id).statusHistory).toHaveLength(1);

		store.changeStatus(created.id, { status: 'approved', changedBy: 'reviewer@example.org' });
		expect(errorCode(() => store.changeStatus(created.id, { status: 'rejected', changedBy: 'reviewer@example.org', reason: 'Not allowed from approved.' }))).toBe('INVALID_STATUS_TRANSITION');
		expect(store.get(created.id).status).toBe('approved');
		expect(store.get(created.id).statusHistory).toHaveLength(2);
		expect(errorCode(() => store.changeStatus('missing', { status: 'cancelled', changedBy: 'reviewer@example.org' }))).toBe('ENROLLMENT_REQUEST_NOT_FOUND');
	});

	it('creates through the shared application service factory', async () => {
		const services = await buildApplicationServicesFactory({ environment: 'test' }).forRequest();
		const created = services.enrollmentRequests.create(requestFor('course-001', 'factory@example.org'));

		expect(created.status).toBe('pending');
		expect(services.enrollmentRequests.get(created.id).courseId).toBe('course-001');
		expect(services.courses.list({ page: 1, pageSize: 10, sort: 'title' }).totalItems).toBeGreaterThanOrEqual(12);
	});
});
