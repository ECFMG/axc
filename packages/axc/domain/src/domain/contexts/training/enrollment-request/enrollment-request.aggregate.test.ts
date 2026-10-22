import { describe, expect, it } from 'vitest';
import { EnrollmentRequest, InvalidStatusTransition, RejectionReasonRequired } from './enrollment-request.aggregate.ts';
import { EnrollmentStatus, Justification, LearnerEmail } from './enrollment-request.value-objects.ts';

const fresh = () =>
	EnrollmentRequest.getNewInstance(
		{ id: 'one', courseId: '', learnerEmail: '', justification: '', status: 'pending', createdAt: '', updatedAt: '', statusHistory: [] },
		'course-001',
		new LearnerEmail('a@example.org'),
		new Justification('x'.repeat(20)),
		'2026-01-01',
	);
describe('EnrollmentRequest aggregate', () => {
	it('starts pending with creation history', () => {
		const request = fresh();
		expect(request.status).toBe('pending');
		expect(request.statusHistory).toEqual([{ fromStatus: null, toStatus: 'pending', changedAt: '2026-01-01', changedBy: 'system', reason: null }]);
	});
	it.each(['approved', 'rejected', 'cancelled'] as const)('allows pending to %s and records audit', (status) => {
		const request = fresh();
		request.transition(new EnrollmentStatus(status), 'reviewer', status === 'rejected' ? 'reason' : undefined, '2026-01-02');
		expect(request.status).toBe(status);
		expect(request.statusHistory[1]).toEqual({ fromStatus: 'pending', toStatus: status, changedAt: '2026-01-02', changedBy: 'reviewer', reason: status === 'rejected' ? 'reason' : null });
	});
	it('allows approved to cancelled', () => {
		const request = fresh();
		request.transition(new EnrollmentStatus('approved'), 'reviewer', undefined, '2026-01-02');
		request.transition(new EnrollmentStatus('cancelled'), 'reviewer', undefined, '2026-01-03');
		expect(request.statusHistory).toHaveLength(3);
	});
	it('rejects invalid transitions and missing rejection reason without mutation', () => {
		const request = fresh();
		expect(() => request.transition(new EnrollmentStatus('rejected'), 'reviewer', ' ', '2026-01-02')).toThrow(RejectionReasonRequired);
		expect(() => request.transition(new EnrollmentStatus('pending'), 'reviewer', undefined, '2026-01-02')).toThrow(InvalidStatusTransition);
		expect(request.status).toBe('pending');
		expect(request.statusHistory).toHaveLength(1);
	});
});
