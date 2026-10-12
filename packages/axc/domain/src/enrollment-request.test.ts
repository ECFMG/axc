import { describe, expect, it } from 'vitest';
import { applyStatusChange, createEnrollmentRequest, type EnrollmentRequest, type EnrollmentRequestStatus, isActiveEnrollmentStatus, isValidStatusTransition } from './enrollment-request.ts';
import { AxcDomainError } from './errors.ts';

const CREATED_AT = '2026-06-27T10:00:00.000Z';
const CHANGED_AT = '2026-06-28T11:30:00.000Z';

const newRequest = (): EnrollmentRequest =>
	createEnrollmentRequest('enroll-001', { courseId: 'course-001', learnerEmail: 'learner@example.org', justification: 'I need this course to prepare for upcoming secure development work.' }, CREATED_AT);

const at = (status: EnrollmentRequestStatus): EnrollmentRequest =>
	status === 'pending' ? newRequest() : applyStatusChange(newRequest(), { status, changedBy: 'reviewer@example.org', reason: status === 'rejected' ? 'No prerequisite.' : null }, CHANGED_AT);

describe('createEnrollmentRequest', () => {
	it('starts pending and records the opening audit entry', () => {
		expect(newRequest()).toStrictEqual({
			id: 'enroll-001',
			courseId: 'course-001',
			learnerEmail: 'learner@example.org',
			justification: 'I need this course to prepare for upcoming secure development work.',
			status: 'pending',
			createdAt: CREATED_AT,
			updatedAt: CREATED_AT,
			statusHistory: [{ fromStatus: null, toStatus: 'pending', changedAt: CREATED_AT, changedBy: 'system', reason: null }],
		});
	});
});

describe('isActiveEnrollmentStatus', () => {
	it.each([
		['pending', true],
		['approved', true],
		['rejected', false],
		['cancelled', false],
	] as const)('treats %s as active=%s', (status, expected) => {
		expect(isActiveEnrollmentStatus(status)).toBe(expected);
	});
});

describe('isValidStatusTransition', () => {
	it.each([
		['pending', 'approved'],
		['pending', 'rejected'],
		['pending', 'cancelled'],
		['approved', 'cancelled'],
	] as const)('allows %s -> %s', (from, to) => {
		expect(isValidStatusTransition(from, to)).toBe(true);
	});

	it.each([
		['pending', 'pending'],
		['approved', 'approved'],
		['approved', 'rejected'],
		['rejected', 'approved'],
		['rejected', 'cancelled'],
		['cancelled', 'approved'],
		['cancelled', 'pending'],
	] as const)('rejects %s -> %s', (from, to) => {
		expect(isValidStatusTransition(from, to)).toBe(false);
	});
});

describe('applyStatusChange', () => {
	it('appends an audit entry and moves the status', () => {
		const approved = applyStatusChange(newRequest(), { status: 'approved', changedBy: 'reviewer@example.org', reason: null }, CHANGED_AT);

		expect(approved.status).toBe('approved');
		expect(approved.updatedAt).toBe(CHANGED_AT);
		expect(approved.createdAt).toBe(CREATED_AT);
		expect(approved.statusHistory).toStrictEqual([
			{ fromStatus: null, toStatus: 'pending', changedAt: CREATED_AT, changedBy: 'system', reason: null },
			{ fromStatus: 'pending', toStatus: 'approved', changedAt: CHANGED_AT, changedBy: 'reviewer@example.org', reason: null },
		]);
	});

	it('records the rejection reason on the audit entry', () => {
		const rejected = applyStatusChange(newRequest(), { status: 'rejected', changedBy: 'reviewer@example.org', reason: 'Learner has not completed the prerequisite course.' }, CHANGED_AT);

		expect(rejected.statusHistory.at(-1)).toMatchObject({ fromStatus: 'pending', toStatus: 'rejected', reason: 'Learner has not completed the prerequisite course.' });
	});

	it('keeps the audit trail growing across every change', () => {
		const cancelled = applyStatusChange(at('approved'), { status: 'cancelled', changedBy: 'learner@example.org', reason: null }, '2026-06-29T09:00:00.000Z');

		expect(cancelled.statusHistory.map((entry) => entry.toStatus)).toStrictEqual(['pending', 'approved', 'cancelled']);
	});

	it('does not mutate the source request', () => {
		const pending = newRequest();
		applyStatusChange(pending, { status: 'approved', changedBy: 'reviewer@example.org', reason: null }, CHANGED_AT);

		expect(pending.status).toBe('pending');
		expect(pending.statusHistory).toHaveLength(1);
	});

	it('throws INVALID_STATUS_TRANSITION for a forbidden move', () => {
		const act = () => applyStatusChange(at('rejected'), { status: 'approved', changedBy: 'reviewer@example.org', reason: null }, CHANGED_AT);

		expect(act).toThrow(AxcDomainError);
		expect(act).toThrow(/cannot move from 'rejected' to 'approved'/);
		try {
			act();
		} catch (error) {
			expect((error as AxcDomainError).code).toBe('INVALID_STATUS_TRANSITION');
		}
	});
});
