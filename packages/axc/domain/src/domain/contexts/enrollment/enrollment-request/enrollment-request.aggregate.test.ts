import { describe, expect, it } from 'vitest';
import { EnrollmentRequest } from './enrollment-request.aggregate.ts';

const T0 = '2026-06-27T10:00:00.000Z';
const T1 = '2026-06-28T10:00:00.000Z';
const newRequest = () => EnrollmentRequest.create('enroll-001', { courseId: 'course-001', learnerEmail: 'learner@example.org', justification: 'I need this course for upcoming work.' }, T0);

describe('EnrollmentRequest', () => {
	it('starts pending with a creation audit entry', () => {
		const request = newRequest();
		expect(request.props.status).toBe('pending');
		expect(request.isActive).toBe(true);
		expect(request.toReference().statusHistory).toEqual([{ fromStatus: null, toStatus: 'pending', changedAt: T0, changedBy: 'system', reason: null }]);
	});

	it.each([
		['approved', [], true],
		['rejected', [], false],
		['cancelled', [], false],
		['cancelled', ['approved'], false],
	] as const)('allows transition to %s after %o', (to, before, active) => {
		const request = newRequest();
		for (const status of before) request.changeStatus({ status, changedBy: 'r@example.org' }, T1);
		request.changeStatus({ status: to, changedBy: 'r@example.org', reason: 'Not eligible for this course.' }, T1);
		expect(request.props.status).toBe(to);
		expect(request.props.updatedAt).toBe(T1);
		expect(request.isActive).toBe(active);
		expect(request.props.statusHistory).toHaveLength(before.length + 2);
		expect(request.props.statusHistory.at(-1)).toMatchObject({ toStatus: to, changedBy: 'r@example.org', changedAt: T1 });
	});

	it.each([
		['approved', 'approved'],
		['rejected', 'approved'],
		['cancelled', 'pending'],
	] as const)('rejects transition from %s to %s with INVALID_STATUS_TRANSITION', (from, to) => {
		const request = newRequest();
		request.changeStatus({ status: from, changedBy: 'r', reason: 'because' }, T1);
		expect(() => request.changeStatus({ status: to, changedBy: 'r' }, T1)).toThrow(expect.objectContaining({ code: 'INVALID_STATUS_TRANSITION' }));
		expect(request.props.statusHistory).toHaveLength(2);
	});

	it.each([
		[{ status: 'done', changedBy: 'r' }, 'status'],
		[{ status: 'approved', changedBy: undefined }, 'changedBy'],
		[{ status: 'rejected', changedBy: 'r', reason: '  ' }, 'reason'],
	])('rejects invalid input %o with INVALID_REQUEST', (input, field) => {
		expect(() => newRequest().changeStatus(input, T1)).toThrow(expect.objectContaining({ code: 'INVALID_REQUEST', details: [expect.objectContaining({ field })] }));
	});
});
