import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';
import { canTransitionEnrollmentRequest, validateEnrollmentInput, validateStatusChange } from './enrollment-request.value-objects.ts';

const feature = await loadFeature(new URL('./features/enrollment-request.feature', import.meta.url).pathname);
describeFeature(feature, ({ Scenario }) => {
	Scenario('Justification length 19', ({ Given, When, Then }) => {
		Given('enrollment request rules', () => {
			/* The case inputs are bound in the assertion below. */
		});
		When('justification has 19 characters', () => {
			/* The case inputs are bound in the assertion below. */
		});
		Then('validation returns 1 justification errors', () => {
			expect(validateEnrollmentInput('learner@example.org', 'x'.repeat(19))).toHaveLength(1);
		});
	});
	Scenario('Justification length 20', ({ Given, When, Then }) => {
		Given('enrollment request rules', () => {
			/* The case inputs are bound in the assertion below. */
		});
		When('justification has 20 characters', () => {
			/* The case inputs are bound in the assertion below. */
		});
		Then('validation returns 0 justification errors', () => {
			expect(validateEnrollmentInput('learner@example.org', 'x'.repeat(20))).toHaveLength(0);
		});
	});
	Scenario('Justification length 500', ({ Given, When, Then }) => {
		Given('enrollment request rules', () => {
			/* The case inputs are bound in the assertion below. */
		});
		When('justification has 500 characters', () => {
			/* The case inputs are bound in the assertion below. */
		});
		Then('validation returns 0 justification errors', () => {
			expect(validateEnrollmentInput('learner@example.org', 'x'.repeat(500))).toHaveLength(0);
		});
	});
	Scenario('Justification length 501', ({ Given, When, Then }) => {
		Given('enrollment request rules', () => {
			/* The case inputs are bound in the assertion below. */
		});
		When('justification has 501 characters', () => {
			/* The case inputs are bound in the assertion below. */
		});
		Then('validation returns 1 justification errors', () => {
			expect(validateEnrollmentInput('learner@example.org', 'x'.repeat(501))).toHaveLength(1);
		});
	});
	Scenario('Email learner@example.org', ({ Given, When, Then }) => {
		Given('enrollment request rules', () => {
			/* The case inputs are bound in the assertion below. */
		});
		When('email is "learner@example.org"', () => {
			/* The case inputs are bound in the assertion below. */
		});
		Then('validation returns 0 email errors', () => {
			expect(validateEnrollmentInput('learner@example.org', 'x'.repeat(20))).toHaveLength(0);
		});
	});
	Scenario('Email bad', ({ Given, When, Then }) => {
		Given('enrollment request rules', () => {
			/* The case inputs are bound in the assertion below. */
		});
		When('email is "bad"', () => {
			/* The case inputs are bound in the assertion below. */
		});
		Then('validation returns 1 email errors', () => {
			expect(validateEnrollmentInput('bad', 'x'.repeat(20))).toHaveLength(1);
		});
	});
	Scenario('Email empty', ({ Given, When, Then }) => {
		Given('enrollment request rules', () => {
			/* The case inputs are bound in the assertion below. */
		});
		When('email is ""', () => {
			/* The case inputs are bound in the assertion below. */
		});
		Then('validation returns 1 email errors', () => {
			expect(validateEnrollmentInput('', 'x'.repeat(20))).toHaveLength(1);
		});
	});
	Scenario('Email a@@b.org', ({ Given, When, Then }) => {
		Given('enrollment request rules', () => {
			/* The case inputs are bound in the assertion below. */
		});
		When('email is "a@@b.org"', () => {
			/* The case inputs are bound in the assertion below. */
		});
		Then('validation returns 1 email errors', () => {
			expect(validateEnrollmentInput('a@@b.org', 'x'.repeat(20))).toHaveLength(1);
		});
	});
	Scenario('Email a b@example.org', ({ Given, When, Then }) => {
		Given('enrollment request rules', () => {
			/* The case inputs are bound in the assertion below. */
		});
		When('email is "a b@example.org"', () => {
			/* The case inputs are bound in the assertion below. */
		});
		Then('validation returns 1 email errors', () => {
			expect(validateEnrollmentInput('a b@example.org', 'x'.repeat(20))).toHaveLength(1);
		});
	});
	Scenario('Transition pending to pending', ({ Given, When, Then }) => {
		Given('enrollment request rules', () => {
			/* The case inputs are bound in the assertion below. */
		});
		When('"pending" changes to "pending"', () => {
			/* The case inputs are bound in the assertion below. */
		});
		Then('transition is "False"', () => {
			expect(canTransitionEnrollmentRequest('pending', 'pending')).toBe(false);
		});
	});
	Scenario('Transition pending to approved', ({ Given, When, Then }) => {
		Given('enrollment request rules', () => {
			/* The case inputs are bound in the assertion below. */
		});
		When('"pending" changes to "approved"', () => {
			/* The case inputs are bound in the assertion below. */
		});
		Then('transition is "True"', () => {
			expect(canTransitionEnrollmentRequest('pending', 'approved')).toBe(true);
		});
	});
	Scenario('Transition pending to rejected', ({ Given, When, Then }) => {
		Given('enrollment request rules', () => {
			/* The case inputs are bound in the assertion below. */
		});
		When('"pending" changes to "rejected"', () => {
			/* The case inputs are bound in the assertion below. */
		});
		Then('transition is "True"', () => {
			expect(canTransitionEnrollmentRequest('pending', 'rejected')).toBe(true);
		});
	});
	Scenario('Transition pending to cancelled', ({ Given, When, Then }) => {
		Given('enrollment request rules', () => {
			/* The case inputs are bound in the assertion below. */
		});
		When('"pending" changes to "cancelled"', () => {
			/* The case inputs are bound in the assertion below. */
		});
		Then('transition is "True"', () => {
			expect(canTransitionEnrollmentRequest('pending', 'cancelled')).toBe(true);
		});
	});
	Scenario('Transition approved to pending', ({ Given, When, Then }) => {
		Given('enrollment request rules', () => {
			/* The case inputs are bound in the assertion below. */
		});
		When('"approved" changes to "pending"', () => {
			/* The case inputs are bound in the assertion below. */
		});
		Then('transition is "False"', () => {
			expect(canTransitionEnrollmentRequest('approved', 'pending')).toBe(false);
		});
	});
	Scenario('Transition approved to approved', ({ Given, When, Then }) => {
		Given('enrollment request rules', () => {
			/* The case inputs are bound in the assertion below. */
		});
		When('"approved" changes to "approved"', () => {
			/* The case inputs are bound in the assertion below. */
		});
		Then('transition is "False"', () => {
			expect(canTransitionEnrollmentRequest('approved', 'approved')).toBe(false);
		});
	});
	Scenario('Transition approved to rejected', ({ Given, When, Then }) => {
		Given('enrollment request rules', () => {
			/* The case inputs are bound in the assertion below. */
		});
		When('"approved" changes to "rejected"', () => {
			/* The case inputs are bound in the assertion below. */
		});
		Then('transition is "False"', () => {
			expect(canTransitionEnrollmentRequest('approved', 'rejected')).toBe(false);
		});
	});
	Scenario('Transition approved to cancelled', ({ Given, When, Then }) => {
		Given('enrollment request rules', () => {
			/* The case inputs are bound in the assertion below. */
		});
		When('"approved" changes to "cancelled"', () => {
			/* The case inputs are bound in the assertion below. */
		});
		Then('transition is "True"', () => {
			expect(canTransitionEnrollmentRequest('approved', 'cancelled')).toBe(true);
		});
	});
	Scenario('Transition rejected to pending', ({ Given, When, Then }) => {
		Given('enrollment request rules', () => {
			/* The case inputs are bound in the assertion below. */
		});
		When('"rejected" changes to "pending"', () => {
			/* The case inputs are bound in the assertion below. */
		});
		Then('transition is "False"', () => {
			expect(canTransitionEnrollmentRequest('rejected', 'pending')).toBe(false);
		});
	});
	Scenario('Transition rejected to approved', ({ Given, When, Then }) => {
		Given('enrollment request rules', () => {
			/* The case inputs are bound in the assertion below. */
		});
		When('"rejected" changes to "approved"', () => {
			/* The case inputs are bound in the assertion below. */
		});
		Then('transition is "False"', () => {
			expect(canTransitionEnrollmentRequest('rejected', 'approved')).toBe(false);
		});
	});
	Scenario('Transition rejected to rejected', ({ Given, When, Then }) => {
		Given('enrollment request rules', () => {
			/* The case inputs are bound in the assertion below. */
		});
		When('"rejected" changes to "rejected"', () => {
			/* The case inputs are bound in the assertion below. */
		});
		Then('transition is "False"', () => {
			expect(canTransitionEnrollmentRequest('rejected', 'rejected')).toBe(false);
		});
	});
	Scenario('Transition rejected to cancelled', ({ Given, When, Then }) => {
		Given('enrollment request rules', () => {
			/* The case inputs are bound in the assertion below. */
		});
		When('"rejected" changes to "cancelled"', () => {
			/* The case inputs are bound in the assertion below. */
		});
		Then('transition is "False"', () => {
			expect(canTransitionEnrollmentRequest('rejected', 'cancelled')).toBe(false);
		});
	});
	Scenario('Transition cancelled to pending', ({ Given, When, Then }) => {
		Given('enrollment request rules', () => {
			/* The case inputs are bound in the assertion below. */
		});
		When('"cancelled" changes to "pending"', () => {
			/* The case inputs are bound in the assertion below. */
		});
		Then('transition is "False"', () => {
			expect(canTransitionEnrollmentRequest('cancelled', 'pending')).toBe(false);
		});
	});
	Scenario('Transition cancelled to approved', ({ Given, When, Then }) => {
		Given('enrollment request rules', () => {
			/* The case inputs are bound in the assertion below. */
		});
		When('"cancelled" changes to "approved"', () => {
			/* The case inputs are bound in the assertion below. */
		});
		Then('transition is "False"', () => {
			expect(canTransitionEnrollmentRequest('cancelled', 'approved')).toBe(false);
		});
	});
	Scenario('Transition cancelled to rejected', ({ Given, When, Then }) => {
		Given('enrollment request rules', () => {
			/* The case inputs are bound in the assertion below. */
		});
		When('"cancelled" changes to "rejected"', () => {
			/* The case inputs are bound in the assertion below. */
		});
		Then('transition is "False"', () => {
			expect(canTransitionEnrollmentRequest('cancelled', 'rejected')).toBe(false);
		});
	});
	Scenario('Transition cancelled to cancelled', ({ Given, When, Then }) => {
		Given('enrollment request rules', () => {
			/* The case inputs are bound in the assertion below. */
		});
		When('"cancelled" changes to "cancelled"', () => {
			/* The case inputs are bound in the assertion below. */
		});
		Then('transition is "False"', () => {
			expect(canTransitionEnrollmentRequest('cancelled', 'cancelled')).toBe(false);
		});
	});
	Scenario('Rejection reason None', ({ Given, When, Then }) => {
		Given('enrollment request rules', () => {
			/* The case inputs are bound in the assertion below. */
		});
		When('rejection reason is "None"', () => {
			/* The case inputs are bound in the assertion below. */
		});
		Then('validation returns 1 reason errors', () => {
			expect(validateStatusChange('rejected', 'reviewer', undefined)).toHaveLength(1);
		});
	});
	Scenario("Rejection reason ''", ({ Given, When, Then }) => {
		Given('enrollment request rules', () => {
			/* The case inputs are bound in the assertion below. */
		});
		When('rejection reason is ""', () => {
			/* The case inputs are bound in the assertion below. */
		});
		Then('validation returns 1 reason errors', () => {
			expect(validateStatusChange('rejected', 'reviewer', '')).toHaveLength(1);
		});
	});
	Scenario("Rejection reason '   '", ({ Given, When, Then }) => {
		Given('enrollment request rules', () => {
			/* The case inputs are bound in the assertion below. */
		});
		When('rejection reason is "   "', () => {
			/* The case inputs are bound in the assertion below. */
		});
		Then('validation returns 1 reason errors', () => {
			expect(validateStatusChange('rejected', 'reviewer', '   ')).toHaveLength(1);
		});
	});
	Scenario("Rejection reason 'Prerequisite missing'", ({ Given, When, Then }) => {
		Given('enrollment request rules', () => {
			/* The case inputs are bound in the assertion below. */
		});
		When('rejection reason is "Prerequisite missing"', () => {
			/* The case inputs are bound in the assertion below. */
		});
		Then('validation returns 0 reason errors', () => {
			expect(validateStatusChange('rejected', 'reviewer', 'Prerequisite missing')).toHaveLength(0);
		});
	});
});
