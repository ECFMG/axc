import { describe, expect, it } from 'vitest';
import { type Passport, PassportFactory } from '../../passport.ts';
import { EnrollmentRequest, type EnrollmentRequestNewInput } from './enrollment-request.aggregate.ts';
import type { EnrollmentRequestProps, EnrollmentRequestStatus } from './enrollment-request.entity.ts';
import { CourseNotActiveError, EnrollmentRequestValidationError, InvalidStatusTransitionError } from './enrollment-request.value-objects.ts';

const blankProps = (): EnrollmentRequestProps => ({
	id: 'enroll-001',
	courseId: '',
	learnerEmail: '',
	justification: '',
	status: 'pending',
	statusHistory: [],
	createdAt: new Date('2026-06-27T10:00:00.000Z'),
	updatedAt: new Date('2026-06-27T10:00:00.000Z'),
	schemaVersion: '1.0.0',
});

const validInput: EnrollmentRequestNewInput = {
	course: { id: 'course-001', status: 'active' },
	learnerEmail: '  Learner@Example.org ',
	justification: 'I need this course to prepare for upcoming secure development work.',
};

const newRequest = (input: Partial<EnrollmentRequestNewInput> = {}, passport: Passport = PassportFactory.forSystem()) => EnrollmentRequest.getNewInstance(blankProps(), passport, { ...validInput, ...input });

const requestIn = (status: EnrollmentRequestStatus) => {
	const request = newRequest();
	if (status === 'approved' || status === 'cancelled' || status === 'rejected') {
		request.changeStatus({ status: status === 'cancelled' ? 'approved' : status, changedBy: 'reviewer@example.org', reason: 'Setup step.' });
	}
	if (status === 'cancelled') {
		request.changeStatus({ status: 'cancelled', changedBy: 'reviewer@example.org' });
	}
	return request;
};

describe('EnrollmentRequest creation', () => {
	it('B-AC2 B-AC12 starts pending with a creation history entry from the system', () => {
		const request = newRequest();

		expect(request.status).toBe('pending');
		expect(request.courseId).toBe('course-001');
		expect(request.learnerEmail).toBe('learner@example.org');
		expect(request.justification).toBe(validInput.justification);
		expect(request.statusHistory).toHaveLength(1);
		expect(request.statusHistory[0]).toMatchObject({ fromStatus: null, toStatus: 'pending', changedBy: 'system', reason: null });
		expect(request.statusHistory[0]?.changedAt).toBeInstanceOf(Date);
	});

	it.each(['draft', 'retired'])('B-AC4 rejects a %s course', (status) => {
		expect(() => newRequest({ course: { id: 'course-009', status } })).toThrow(CourseNotActiveError);
	});

	it.each(['not-an-email', 'a@b', 'two@@example.org', 'spaces in@example.org', ''])('B-AC5 rejects learnerEmail %j', (learnerEmail) => {
		expect(() => newRequest({ learnerEmail })).toThrow(expect.objectContaining({ field: 'learnerEmail' }));
	});

	it('B-AC5 enforces justification between 20 and 500 characters after trimming', () => {
		expect(() => newRequest({ justification: 'Too short.' })).toThrow(EnrollmentRequestValidationError);
		expect(() => newRequest({ justification: `   ${'x'.repeat(19)}   ` })).toThrow(expect.objectContaining({ field: 'justification' }));
		expect(() => newRequest({ justification: 'x'.repeat(501) })).toThrow(expect.objectContaining({ field: 'justification' }));
		expect(newRequest({ justification: 'x'.repeat(20) }).justification).toHaveLength(20);
		expect(newRequest({ justification: 'x'.repeat(500) }).justification).toHaveLength(500);
	});
});

describe('EnrollmentRequest status transitions', () => {
	it.each([
		['pending', 'approved'],
		['pending', 'rejected'],
		['pending', 'cancelled'],
		['approved', 'cancelled'],
	] as const)('B-AC9 B-AC12 allows %s -> %s and appends a history entry', (from, to) => {
		const request = requestIn(from);
		const historyBefore = request.statusHistory.length;

		request.changeStatus({ status: to, changedBy: ' reviewer@example.org ', reason: 'Reviewed by the training team.' });

		expect(request.status).toBe(to);
		expect(request.statusHistory).toHaveLength(historyBefore + 1);
		expect(request.statusHistory.at(-1)).toMatchObject({ fromStatus: from, toStatus: to, changedBy: 'reviewer@example.org', reason: 'Reviewed by the training team.' });
	});

	it.each([
		['pending', 'pending'],
		['approved', 'approved'],
		['approved', 'pending'],
		['approved', 'rejected'],
		['rejected', 'approved'],
		['rejected', 'cancelled'],
		['cancelled', 'pending'],
		['cancelled', 'approved'],
	] as const)('B-AC10 refuses %s -> %s without changing the request', (from, to) => {
		const request = requestIn(from);
		const historyBefore = request.statusHistory;

		expect(() => request.changeStatus({ status: to, changedBy: 'reviewer@example.org', reason: 'Attempted change.' })).toThrow(InvalidStatusTransitionError);
		expect(request.status).toBe(from);
		expect(request.statusHistory).toStrictEqual(historyBefore);
	});

	it.each([undefined, '', '   '])('B-AC11 requires a non-empty reason to reject (reason %j)', (reason) => {
		const request = newRequest();
		const change = reason === undefined ? { status: 'rejected' as const, changedBy: 'reviewer@example.org' } : { status: 'rejected' as const, changedBy: 'reviewer@example.org', reason };

		expect(() => request.changeStatus(change)).toThrow(expect.objectContaining({ field: 'reason' }));
		expect(request.status).toBe('pending');
		expect(request.statusHistory).toHaveLength(1);
	});

	it('B-AC12 records null for an omitted reason and requires changedBy', () => {
		const request = newRequest();
		expect(() => request.changeStatus({ status: 'approved', changedBy: '  ' })).toThrow(expect.objectContaining({ field: 'changedBy' }));

		request.changeStatus({ status: 'approved', changedBy: 'reviewer@example.org' });
		request.changeStatus({ status: 'cancelled', changedBy: 'learner@example.org' });

		expect(request.statusHistory.map((entry) => [entry.fromStatus, entry.toStatus, entry.reason])).toStrictEqual([
			[null, 'pending', null],
			['pending', 'approved', null],
			['approved', 'cancelled', null],
		]);
	});

	it('refuses review without the review permission', () => {
		const deny: Passport = { enrollment: { forEnrollmentRequest: () => ({ determineIf: () => false }) } };
		const request = newRequest({}, deny);

		expect(() => request.changeStatus({ status: 'approved', changedBy: 'reviewer@example.org' })).toThrow('permission');
	});
});
