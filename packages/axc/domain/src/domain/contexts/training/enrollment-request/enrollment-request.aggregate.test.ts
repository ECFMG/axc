import { describe, expect, it } from 'vitest';
import { EnrollmentRequest, InvalidStatusTransitionError } from './enrollment-request.aggregate.ts';
import { Justification, LearnerEmail, Status } from './enrollment-request.value-objects.ts';

const make = () => EnrollmentRequest.getNewInstance('enroll-1', 'course-001', new LearnerEmail('a@example.org'), new Justification('A valid reason for this course.'), '2026-01-01T00:00:00.000Z');
describe('enrollment aggregate', () => {
	it('starts pending with a creation entry', () => {
		const request = make();
		expect(request.status).toBe('pending');
		expect(request.statusHistory).toEqual([{ fromStatus: null, toStatus: 'pending', changedAt: request.createdAt, changedBy: 'system', reason: null }]);
	});
	it.each(['approved', 'rejected', 'cancelled'] as const)('allows pending to %s with an audit entry', (status) => {
		const request = make();
		request.transition(new Status(status), 'reviewer', status === 'rejected' ? 'Missing prerequisites' : undefined, '2026-01-02T00:00:00.000Z');
		expect(request.status).toBe(status);
		expect(request.statusHistory[1]).toEqual({ fromStatus: 'pending', toStatus: status, changedAt: request.updatedAt, changedBy: 'reviewer', reason: status === 'rejected' ? 'Missing prerequisites' : null });
	});
	it('allows approved to cancelled', () => {
		const request = make();
		request.transition(new Status('approved'), 'reviewer', undefined, '2026-01-02T00:00:00.000Z');
		request.transition(new Status('cancelled'), 'reviewer', undefined, '2026-01-03T00:00:00.000Z');
		expect(request.statusHistory).toHaveLength(3);
	});
	it('rejects invalid transitions and missing rejection reasons without mutation', () => {
		const request = make();
		expect(() => request.transition(new Status('pending'), 'reviewer', undefined, '2026-01-02T00:00:00.000Z')).toThrow(InvalidStatusTransitionError);
		expect(() => request.transition(new Status('rejected'), 'reviewer', ' ', '2026-01-02T00:00:00.000Z')).toThrow();
		expect(request.status).toBe('pending');
		expect(request.statusHistory).toHaveLength(1);
	});
});
