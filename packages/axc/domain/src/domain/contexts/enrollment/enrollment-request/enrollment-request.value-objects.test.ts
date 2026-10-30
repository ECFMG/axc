import { describe, expect, it } from 'vitest';
import { EnrollmentTransitions, isEnrollmentStatus, Justification, LearnerEmail } from './enrollment-request.value-objects.ts';

describe('enrollment request value objects', () => {
	it('validates and normalises learner email', () => {
		expect(new LearnerEmail('A@B.org').value).toBe('a@b.org');
		for (const bad of ['a@b', 'a b@c.org', '', 42]) expect(() => new LearnerEmail(bad)).toThrow();
	});

	it('bounds justification to 20-500 characters', () => {
		expect(new Justification('x'.repeat(500)).value).toHaveLength(500);
		expect(() => new Justification('x'.repeat(19))).toThrow();
		expect(() => new Justification('x'.repeat(501))).toThrow();
	});

	it('lists only the allowed transitions', () => {
		expect(EnrollmentTransitions).toEqual({ pending: ['approved', 'rejected', 'cancelled'], approved: ['cancelled'], rejected: [], cancelled: [] });
		expect(isEnrollmentStatus('pending')).toBe(true);
		expect(isEnrollmentStatus('archived')).toBe(false);
	});
});
