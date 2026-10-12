import { describe, expect, it } from 'vitest';
import {
	isValidEmail,
	MAX_JUSTIFICATION_LENGTH,
	MIN_JUSTIFICATION_LENGTH,
	normalizeEmail,
	validateChangeEnrollmentRequestStatus,
	validateCreateEnrollmentRequest,
	validateEnrollmentRequestFilters,
} from './enrollment-request-commands.ts';
import type { AxcDomainError } from './errors.ts';

const JUSTIFICATION = 'I need this course to prepare for upcoming secure development work.';

const validBody = (overrides: Record<string, unknown> = {}) => ({
	courseId: 'course-001',
	learnerEmail: 'learner@example.org',
	justification: JUSTIFICATION,
	...overrides,
});

const captureError = (act: () => unknown): AxcDomainError => {
	try {
		act();
	} catch (error) {
		return error as AxcDomainError;
	}
	return expect.unreachable('expected a domain error') as never;
};

describe('isValidEmail', () => {
	it.each(['learner@example.org', 'first.last+tag@sub.domain.example'])('accepts %s', (value) => {
		expect(isValidEmail(value)).toBe(true);
	});

	it.each(['learner', 'learner@', '@example.org', 'learner@example', 'learner example.org', 'learner@exa mple.org'])('rejects %s', (value) => {
		expect(isValidEmail(value)).toBe(false);
	});
});

describe('normalizeEmail', () => {
	it('trims and lowercases so duplicate detection is case-insensitive', () => {
		expect(normalizeEmail('  Learner@Example.ORG ')).toBe('learner@example.org');
	});
});

describe('validateCreateEnrollmentRequest', () => {
	it('returns a command with a normalised learner email', () => {
		expect(validateCreateEnrollmentRequest(validBody({ learnerEmail: 'Learner@Example.ORG' }))).toStrictEqual({
			courseId: 'course-001',
			learnerEmail: 'learner@example.org',
			justification: JUSTIFICATION,
		});
	});

	it('accepts justifications at both length boundaries', () => {
		expect(validateCreateEnrollmentRequest(validBody({ justification: 'a'.repeat(MIN_JUSTIFICATION_LENGTH) })).justification).toHaveLength(MIN_JUSTIFICATION_LENGTH);
		expect(validateCreateEnrollmentRequest(validBody({ justification: 'a'.repeat(MAX_JUSTIFICATION_LENGTH) })).justification).toHaveLength(MAX_JUSTIFICATION_LENGTH);
	});

	it.each([null, 'a string', 42, ['an', 'array']])('rejects a body that is not a JSON object: %s', (input) => {
		const error = captureError(() => validateCreateEnrollmentRequest(input));

		expect(error.code).toBe('INVALID_REQUEST');
		expect(error.details.map((detail) => detail.field)).toStrictEqual(['body']);
	});

	it('rejects an invalid learner email', () => {
		const error = captureError(() => validateCreateEnrollmentRequest(validBody({ learnerEmail: 'not-an-email' })));

		expect(error.code).toBe('INVALID_REQUEST');
		expect(error.details).toStrictEqual([{ field: 'learnerEmail', message: 'learnerEmail must be a valid email address.' }]);
	});

	it.each([
		['too short', 'a'.repeat(MIN_JUSTIFICATION_LENGTH - 1)],
		['too long', 'a'.repeat(MAX_JUSTIFICATION_LENGTH + 1)],
	])('rejects a justification that is %s', (_label, justification) => {
		const error = captureError(() => validateCreateEnrollmentRequest(validBody({ justification })));

		expect(error.code).toBe('INVALID_REQUEST');
		expect(error.details[0]?.field).toBe('justification');
		expect(error.details[0]?.message).toBe(`justification must be between ${MIN_JUSTIFICATION_LENGTH} and ${MAX_JUSTIFICATION_LENGTH} characters.`);
	});

	it.each(['courseId', 'learnerEmail', 'justification'])('rejects a missing %s', (field) => {
		const error = captureError(() => validateCreateEnrollmentRequest(validBody({ [field]: undefined })));

		expect(error.details.map((detail) => detail.field)).toContain(field);
	});

	it('reports every invalid field in a single error', () => {
		const error = captureError(() => validateCreateEnrollmentRequest({ learnerEmail: 'nope', justification: 'too short' }));

		expect(error.details.map((detail) => detail.field)).toStrictEqual(['courseId', 'learnerEmail', 'justification']);
	});
});

describe('validateChangeEnrollmentRequestStatus', () => {
	it('returns the command and defaults changedBy to the system actor', () => {
		expect(validateChangeEnrollmentRequestStatus({ status: 'approved' })).toStrictEqual({ status: 'approved', changedBy: 'system', reason: null });
	});

	it('keeps the supplied reviewer and reason', () => {
		expect(validateChangeEnrollmentRequestStatus({ status: 'rejected', changedBy: 'reviewer@example.org', reason: 'Learner has not completed the prerequisite course.' })).toStrictEqual({
			status: 'rejected',
			changedBy: 'reviewer@example.org',
			reason: 'Learner has not completed the prerequisite course.',
		});
	});

	it.each(['archived', '', 42, undefined])('rejects an invalid status value: %s', (status) => {
		const error = captureError(() => validateChangeEnrollmentRequestStatus({ status }));

		expect(error.code).toBe('INVALID_REQUEST');
		expect(error.details.map((detail) => detail.field)).toContain('status');
	});

	it.each([undefined, null, '', '   '])('rejects a rejection without a reason: %s', (reason) => {
		const error = captureError(() => validateChangeEnrollmentRequestStatus({ status: 'rejected', changedBy: 'reviewer@example.org', reason }));

		expect(error.code).toBe('INVALID_REQUEST');
		expect(error.details.map((detail) => detail.field)).toContain('reason');
	});
});

describe('validateEnrollmentRequestFilters', () => {
	it('returns undefined for every omitted filter', () => {
		expect(validateEnrollmentRequestFilters({})).toStrictEqual({ status: undefined, courseId: undefined, learnerEmail: undefined });
	});

	it('normalises the learner email filter', () => {
		expect(validateEnrollmentRequestFilters({ status: 'pending', courseId: 'course-001', learnerEmail: 'Learner@Example.ORG' })).toStrictEqual({
			status: 'pending',
			courseId: 'course-001',
			learnerEmail: 'learner@example.org',
		});
	});

	it('rejects an unknown status filter with INVALID_QUERY_PARAMETER', () => {
		const error = captureError(() => validateEnrollmentRequestFilters({ status: 'archived' }));

		expect(error.code).toBe('INVALID_QUERY_PARAMETER');
		expect(error.details.map((detail) => detail.field)).toStrictEqual(['status']);
	});
});
