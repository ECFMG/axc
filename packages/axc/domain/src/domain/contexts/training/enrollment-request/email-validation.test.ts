import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';
import { validateEnrollmentInput } from './enrollment-request.value-objects.ts';

const feature = await loadFeature(new URL('./features/email-validation.feature', import.meta.url).pathname);
describeFeature(feature, ({ Scenario }) => {
	Scenario('Leading local dot', ({ Given, When, Then }) => {
		let errors: ReturnType<typeof validateEnrollmentInput>;
		Given('email ".learner@example.org"', () => expect('.learner@example.org').toBeTypeOf('string'));
		When('the email format is validated', () => {
			errors = validateEnrollmentInput('.learner@example.org', 'x'.repeat(20));
		});
		Then('learnerEmail has 1 validation error', () => expect(errors).toEqual([{ field: 'learnerEmail', message: 'learnerEmail must be a valid email address.' }]));
	});
	Scenario('Consecutive local dots', ({ Given, When, Then }) => {
		let errors: ReturnType<typeof validateEnrollmentInput>;
		Given('email "learner..name@example.org"', () => expect('learner..name@example.org').toBeTypeOf('string'));
		When('the email format is validated', () => {
			errors = validateEnrollmentInput('learner..name@example.org', 'x'.repeat(20));
		});
		Then('learnerEmail has 1 validation error', () => expect(errors).toEqual([{ field: 'learnerEmail', message: 'learnerEmail must be a valid email address.' }]));
	});
	Scenario('Leading domain hyphen', ({ Given, When, Then }) => {
		let errors: ReturnType<typeof validateEnrollmentInput>;
		Given('email "learner@-example.org"', () => expect('learner@-example.org').toBeTypeOf('string'));
		When('the email format is validated', () => {
			errors = validateEnrollmentInput('learner@-example.org', 'x'.repeat(20));
		});
		Then('learnerEmail has 1 validation error', () => expect(errors).toEqual([{ field: 'learnerEmail', message: 'learnerEmail must be a valid email address.' }]));
	});
	Scenario('Trailing domain hyphen', ({ Given, When, Then }) => {
		let errors: ReturnType<typeof validateEnrollmentInput>;
		Given('email "learner@example-.org"', () => expect('learner@example-.org').toBeTypeOf('string'));
		When('the email format is validated', () => {
			errors = validateEnrollmentInput('learner@example-.org', 'x'.repeat(20));
		});
		Then('learnerEmail has 1 validation error', () => expect(errors).toEqual([{ field: 'learnerEmail', message: 'learnerEmail must be a valid email address.' }]));
	});
	Scenario('Invalid domain characters', ({ Given, When, Then }) => {
		let errors: ReturnType<typeof validateEnrollmentInput>;
		Given('email "learner@exam!ple.org"', () => expect('learner@exam!ple.org').toBeTypeOf('string'));
		When('the email format is validated', () => {
			errors = validateEnrollmentInput('learner@exam!ple.org', 'x'.repeat(20));
		});
		Then('learnerEmail has 1 validation error', () => expect(errors).toEqual([{ field: 'learnerEmail', message: 'learnerEmail must be a valid email address.' }]));
	});
});
