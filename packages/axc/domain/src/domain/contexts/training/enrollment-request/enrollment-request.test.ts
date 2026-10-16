import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';
import { EnrollmentRequest, type EnrollmentStatus } from './enrollment-request.ts';

const feature = await loadFeature(new URL('./features/enrollment-request.feature', import.meta.url).pathname);
const now = '2026-06-27T10:00:00.000Z';
const later = '2026-06-28T10:00:00.000Z';
const input = { courseId: 'course-001', learnerEmail: 'Learner@Example.org', justification: 'I need this course for my work.' };
const create = () => EnrollmentRequest.create('enroll-1', input, { status: 'active' }, now);

describeFeature(feature, ({ Scenario }) => {
	Scenario('Creation validates the course and learner details', ({ Then }) => {
		Then('creation enforces course eligibility and all input boundaries', () => {
			const snapshot = create().toSnapshot();
			expect(snapshot).toMatchObject({ ...input, learnerEmail: 'learner@example.org', status: 'pending', createdAt: now, updatedAt: now });
			expect(snapshot.statusHistory).toEqual([{ fromStatus: null, toStatus: 'pending', changedAt: now, changedBy: 'system', reason: null }]);
			for (const learnerEmail of ['a.b+training@example.org', 'user@sub.example.org']) {
				expect(EnrollmentRequest.create('id', { ...input, learnerEmail }, { status: 'active' }, now).toSnapshot().learnerEmail).toBe(learnerEmail);
			}
			for (const length of [20, 500]) {
				expect(EnrollmentRequest.create('id', { ...input, justification: 'a'.repeat(length) }, { status: 'active' }, now).toSnapshot().justification).toHaveLength(length);
			}
			for (const length of [0, 19, 501]) {
				expect(() => EnrollmentRequest.create('id', { ...input, justification: 'a'.repeat(length) }, { status: 'active' }, now)).toThrow('justification');
			}
			for (const learnerEmail of ['', 'bad', 'a@b', 'a b@example.org', 'a@@example.org', '.a@example.org', 'a..b@example.org', 'a@-example.org', 'a@example-.org', 'a@example/org.com']) {
				expect(() => EnrollmentRequest.create('id', { ...input, learnerEmail }, { status: 'active' }, now)).toThrow('learnerEmail');
			}
			expect(() => EnrollmentRequest.create('id', input, null, now)).toThrow('COURSE_NOT_FOUND');
			for (const status of ['draft', 'retired'] as const) {
				expect(() => EnrollmentRequest.create('id', input, { status }, now)).toThrow('COURSE_NOT_ACTIVE');
			}
		});
	});
	Scenario('Status changes follow the complete transition matrix', ({ Then }) => {
		Then('all status pairs enforce transitions and preserve audit entries', () => {
			const statuses: EnrollmentStatus[] = ['pending', 'approved', 'rejected', 'cancelled'];
			for (const fromStatus of statuses) {
				for (const toStatus of statuses) {
					const request = create();
					if (fromStatus !== 'pending') {
						request.changeStatus({ status: fromStatus, changedBy: 'reviewer', reason: 'Prerequisites missing' }, later);
					}
					const before = request.toSnapshot();
					const change = () => request.changeStatus({ status: toStatus, changedBy: 'reviewer', reason: 'A reason' }, later);
					const allowed = (fromStatus === 'pending' && toStatus !== 'pending') || (fromStatus === 'approved' && toStatus === 'cancelled');
					if (allowed) {
						change();
						expect(request.toSnapshot().statusHistory).toEqual([...before.statusHistory, { fromStatus, toStatus, changedAt: later, changedBy: 'reviewer', reason: 'A reason' }]);
						expect(request.toSnapshot()).toMatchObject({ status: toStatus, createdAt: now, updatedAt: later });
					} else {
						expect(change).toThrow('INVALID_STATUS_TRANSITION');
						expect(request.toSnapshot()).toEqual(before);
					}
				}
			}
		});
	});
	Scenario('Audit details are validated and snapshots are isolated', ({ Then }) => {
		Then('reviewer and rejection reason are required and history cannot be mutated through snapshots', () => {
			const request = create();
			for (const reason of [undefined, '', '   ']) {
				expect(() => request.changeStatus({ status: 'rejected', changedBy: 'reviewer', ...(reason === undefined ? {} : { reason }) }, later)).toThrow('reason');
			}
			for (const changedBy of ['', '   ']) {
				expect(() => request.changeStatus({ status: 'approved', changedBy }, later)).toThrow('changedBy');
			}
			request.changeStatus({ status: 'approved', changedBy: 'reviewer', reason: '  ' }, later);
			expect(request.toSnapshot().statusHistory.at(-1)?.reason).toBeNull();
			const snapshot = request.toSnapshot();
			snapshot.statusHistory.length = 0;
			expect(request.toSnapshot().statusHistory).toHaveLength(2);
		});
	});
});
