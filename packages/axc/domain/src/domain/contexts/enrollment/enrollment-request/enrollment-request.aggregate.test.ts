import { describe, expect, it } from 'vitest';
import type { DomainError } from '../../../domain-error.ts';
import { EnrollmentRequest } from './enrollment-request.aggregate.ts';

const valid = { courseId: 'course-001', learnerEmail: 'Learner@Example.org', justification: 'I need this course for upcoming work.' };
const create = () => EnrollmentRequest.getNewInstance('e1', valid, new Date('2026-01-01T00:00:00Z'));
const codeOf = (fn: () => unknown) => {
	try {
		fn();
	} catch (e) {
		return (e as DomainError).code;
	}
	return undefined;
};

describe('EnrollmentRequest', () => {
	it('starts pending with a creation audit entry', () => {
		const r = create();
		expect(r.props.status).toBe('pending');
		expect(r.props.learnerEmail).toBe('learner@example.org');
		expect(r.props.statusHistory).toEqual([{ fromStatus: null, toStatus: 'pending', changedAt: new Date('2026-01-01T00:00:00Z'), changedBy: 'system', reason: null }]);
		expect(r.isActive).toBe(true);
	});

	it('rejects invalid email and justification length together', () => {
		try {
			EnrollmentRequest.getNewInstance('e1', { ...valid, learnerEmail: 'nope', justification: 'short' });
			expect.fail();
		} catch (e) {
			expect((e as DomainError).code).toBe('INVALID_REQUEST');
			expect((e as DomainError).details.map((d) => d.field)).toEqual(['learnerEmail', 'justification']);
		}
		expect(codeOf(() => EnrollmentRequest.getNewInstance('e1', { ...valid, justification: 'x'.repeat(501) }))).toBe('INVALID_REQUEST');
		expect(codeOf(() => EnrollmentRequest.getNewInstance('e1', { ...valid, justification: 'x'.repeat(20) }))).toBeUndefined();
	});

	it.each([
		['approved', undefined],
		['rejected', 'missing prerequisite'],
		['cancelled', undefined],
	])('allows pending -> %s and appends history', (to, reason) => {
		const r = create();
		r.changeStatus(to, 'reviewer@example.org', reason);
		expect(r.props.status).toBe(to);
		expect(r.props.statusHistory).toHaveLength(2);
		expect(r.props.statusHistory[1]).toMatchObject({ fromStatus: 'pending', toStatus: to, changedBy: 'reviewer@example.org', reason: reason ?? null });
	});

	it('allows approved -> cancelled and blocks terminal transitions with INVALID_STATUS_TRANSITION', () => {
		const r = create();
		r.changeStatus('approved', 'rev', undefined);
		expect(codeOf(() => r.changeStatus('rejected', 'rev', 'why'))).toBe('INVALID_STATUS_TRANSITION');
		r.changeStatus('cancelled', 'rev', undefined);
		expect(r.isActive).toBe(false);
		expect(codeOf(() => r.changeStatus('approved', 'rev', undefined))).toBe('INVALID_STATUS_TRANSITION');
		expect(r.props.statusHistory.map((h) => h.toStatus)).toEqual(['pending', 'approved', 'cancelled']);
	});

	it('requires a reason to reject, a valid status and changedBy', () => {
		expect(codeOf(() => create().changeStatus('rejected', 'rev', '  '))).toBe('INVALID_REQUEST');
		expect(codeOf(() => create().changeStatus('bogus', 'rev', undefined))).toBe('INVALID_REQUEST');
		expect(codeOf(() => create().changeStatus('approved', '', undefined))).toBe('INVALID_REQUEST');
	});
});
