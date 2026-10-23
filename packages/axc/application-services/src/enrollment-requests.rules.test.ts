import { describe, expect, it } from 'vitest';
import { canTransitionEnrollmentStatus, isValidJustification, isValidLearnerEmail, JUSTIFICATION_MAX, JUSTIFICATION_MIN } from './enrollment-requests.rules.ts';
import { enrollmentStatuses } from './enrollment-requests.ts';

describe('canTransitionEnrollmentStatus', () => {
	const allowed = new Set(['pending>approved', 'pending>rejected', 'pending>cancelled', 'approved>cancelled']);

	for (const from of enrollmentStatuses) {
		for (const to of enrollmentStatuses) {
			it(`${from} -> ${to}`, () => {
				expect(canTransitionEnrollmentStatus(from, to)).toBe(allowed.has(`${from}>${to}`));
			});
		}
	}
});

describe('isValidLearnerEmail', () => {
	it('accepts a trimmed email address', () => {
		expect(isValidLearnerEmail('learner@example.org')).toBe(true);
		expect(isValidLearnerEmail(' Learner@Example.org ')).toBe(true);
	});

	it('rejects missing domains and non-strings', () => {
		expect(isValidLearnerEmail('learner@example')).toBe(false);
		expect(isValidLearnerEmail('not-an-email')).toBe(false);
		expect(isValidLearnerEmail('a b@example.org')).toBe(false);
		expect(isValidLearnerEmail('')).toBe(false);
		expect(isValidLearnerEmail(undefined)).toBe(false);
	});
});

describe('isValidJustification', () => {
	it('accepts the inclusive length bounds', () => {
		expect(isValidJustification('a'.repeat(JUSTIFICATION_MIN))).toBe(true);
		expect(isValidJustification('a'.repeat(JUSTIFICATION_MAX))).toBe(true);
	});

	it('rejects short, long, and non-string values', () => {
		expect(isValidJustification('a'.repeat(JUSTIFICATION_MIN - 1))).toBe(false);
		expect(isValidJustification('a'.repeat(JUSTIFICATION_MAX + 1))).toBe(false);
		expect(isValidJustification('too short')).toBe(false);
		expect(isValidJustification(20)).toBe(false);
	});
});
