import { describe, expect, it } from 'vitest';
import { Justification, LearnerEmail } from './enrollment-request.value-objects.ts';

describe('Enrollment request values', () => {
	it('normalizes email and rejects malformed addresses', () => {
		expect(new LearnerEmail(' LEARNER@Example.org ').value).toBe('learner@example.org');
		expect(() => new LearnerEmail('invalid')).toThrow();
	});
	it('accepts inclusive justification bounds', () => {
		expect(() => new Justification('x'.repeat(19))).toThrow();
		expect(new Justification('x'.repeat(20)).value).toHaveLength(20);
		expect(new Justification('x'.repeat(500)).value).toHaveLength(500);
		expect(() => new Justification('x'.repeat(501))).toThrow();
	});
});
