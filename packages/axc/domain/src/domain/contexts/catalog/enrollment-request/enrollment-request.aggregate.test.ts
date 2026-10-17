import { describe, expect, it } from 'vitest';
import { EnrollmentRequest, InvalidStatusTransitionError } from './enrollment-request.aggregate.ts';
import { Justification, LearnerEmail } from './enrollment-request.value-objects.ts';

const at = '2026-06-27T10:00:00.000Z';
const create = () =>
	EnrollmentRequest.getNewInstance(
		{ id: 'enroll-001', courseId: '', learnerEmail: '', justification: '', status: 'pending', createdAt: '', updatedAt: '', statusHistory: [] },
		'course-001',
		new LearnerEmail('LEARNER@example.org'),
		new Justification('I need this for professional growth.'),
		at,
	);
describe('EnrollmentRequest aggregate', () => {
	it('starts pending with normalized values and an audit entry', () => {
		const request = create();
		expect(request.learnerEmail).toBe('learner@example.org');
		expect(request.statusHistory).toMatchObject([{ fromStatus: null, toStatus: 'pending', changedBy: 'system', changedAt: at }]);
	});
	it('enforces transitions and reason without changing rejected state', () => {
		const request = create();
		expect(() => request.transition('rejected', 'reviewer', '', at)).toThrow('reason');
		expect(request.statusHistory).toHaveLength(1);
		request.transition('approved', 'reviewer', undefined, at);
		expect(() => request.transition('rejected', 'reviewer', 'No', at)).toThrow(InvalidStatusTransitionError);
		expect(request.status).toBe('approved');
		expect(request.statusHistory).toHaveLength(2);
		request.transition('cancelled', 'reviewer', undefined, at);
		expect(request.statusHistory[2]).toMatchObject({ fromStatus: 'approved', toStatus: 'cancelled' });
	});
	it('validates constrained values at boundaries', () => {
		expect(() => new LearnerEmail('invalid')).toThrow();
		expect(() => new Justification('x'.repeat(19))).toThrow();
		expect(new Justification('x'.repeat(20)).value).toHaveLength(20);
		expect(new Justification('x'.repeat(500)).value).toHaveLength(500);
		expect(() => new Justification('x'.repeat(501))).toThrow();
	});
});
