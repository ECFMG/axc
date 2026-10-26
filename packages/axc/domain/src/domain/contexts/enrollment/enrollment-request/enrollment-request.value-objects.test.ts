import { describe, expect, it } from 'vitest';
import { isEnrollmentStatus, Justification, LearnerEmail } from './enrollment-request.value-objects.ts';

describe('enrollment request value objects', () => {
	it('normalises a valid email and rejects invalid ones', () => {
		expect(new LearnerEmail(' Learner@Example.org ').value).toBe('learner@example.org');
		for (const bad of ['nope', 'a@b', 'a b@c.de', 42, undefined]) {
			expect(() => new LearnerEmail(bad)).toThrow(expect.objectContaining({ code: 'INVALID_REQUEST' }));
		}
	});

	it('bounds justification to 20..500 characters', () => {
		expect(new Justification('x'.repeat(20)).value).toHaveLength(20);
		expect(new Justification('x'.repeat(500)).value).toHaveLength(500);
		expect(() => new Justification('x'.repeat(19))).toThrow(expect.objectContaining({ code: 'INVALID_REQUEST', details: [expect.objectContaining({ field: 'justification' })] }));
		expect(() => new Justification('x'.repeat(501))).toThrow(expect.objectContaining({ code: 'INVALID_REQUEST' }));
	});

	it('recognises statuses', () => {
		expect(isEnrollmentStatus('approved')).toBe(true);
		expect(isEnrollmentStatus('done')).toBe(false);
	});
});
