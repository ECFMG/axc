import { describe, expect, it } from 'vitest';
import { EnrollmentStatus, Justification, LearnerEmail } from './enrollment-request.value-objects.ts';

describe('enrollment values', () => {
	it('normalizes email and rejects malformed addresses', () => {
		expect(new LearnerEmail(' A@Example.org ').valueOf()).toBe('a@example.org');
		expect(() => new LearnerEmail('bad@')).toThrow();
	});
	it('enforces justification boundaries', () => {
		expect(() => new Justification('x'.repeat(19))).toThrow();
		expect(new Justification('x'.repeat(20)).valueOf()).toHaveLength(20);
		expect(new Justification('x'.repeat(500)).valueOf()).toHaveLength(500);
		expect(() => new Justification('x'.repeat(501))).toThrow();
	});
	it('rejects unknown status', () => expect(() => new EnrollmentStatus('other' as 'pending')).toThrow());
});
