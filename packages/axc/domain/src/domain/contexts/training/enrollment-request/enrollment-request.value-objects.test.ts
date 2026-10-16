import { describe, expect, it } from 'vitest';
import { Justification, LearnerEmail, Status } from './enrollment-request.value-objects.ts';

describe('enrollment values', () => {
	it('normalizes email and rejects invalid email', () => {
		expect(new LearnerEmail(' Learner@Example.org ').valueOf()).toBe('learner@example.org');
		expect(() => new LearnerEmail('bad@')).toThrow();
	});
	it('enforces both justification boundaries', () => {
		expect(new Justification('a'.repeat(20)).valueOf()).toHaveLength(20);
		expect(new Justification('a'.repeat(500)).valueOf()).toHaveLength(500);
		expect(() => new Justification('a'.repeat(19))).toThrow();
		expect(() => new Justification('a'.repeat(501))).toThrow();
	});
	it('rejects unknown statuses', () => {
		expect(() => new Status('unknown')).toThrow();
	});
});
