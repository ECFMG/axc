import { describe, expect, it } from 'vitest';
import { canTransition } from './enrollment-requests.rules.ts';

describe('enrollment request transitions', () => {
	it('allows pending to approved, rejected, and cancelled', () => {
		expect(canTransition('pending', 'approved')).toBe(true);
		expect(canTransition('pending', 'rejected')).toBe(true);
		expect(canTransition('pending', 'cancelled')).toBe(true);
	});

	it('allows approved to cancelled', () => {
		expect(canTransition('approved', 'cancelled')).toBe(true);
	});

	it('rejects invalid transitions', () => {
		expect(canTransition('approved', 'rejected')).toBe(false);
		expect(canTransition('rejected', 'approved')).toBe(false);
		expect(canTransition('cancelled', 'pending')).toBe(false);
		expect(canTransition('pending', 'pending')).toBe(false);
	});
});
