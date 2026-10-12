/** Validation of untrusted enrollment request payloads into domain commands. */

import { type ChangeEnrollmentRequestStatusCommand, type CreateEnrollmentRequestCommand, ENROLLMENT_REQUEST_STATUSES, type EnrollmentRequestStatus, SYSTEM_ACTOR } from './enrollment-request.ts';
import { type ErrorDetail, invalidQueryParameters, invalidRequest } from './errors.ts';
import { asRawBody, type RawBody, type RawQuery, readBodyValue, readQueryValue } from './raw-input.ts';

/** Shortest accepted justification, measured after trimming. */
export const MIN_JUSTIFICATION_LENGTH = 20;

/** Longest accepted justification, measured after trimming. */
export const MAX_JUSTIFICATION_LENGTH = 500;

/**
 * Pragmatic email shape check: a non-empty local part, a single `@`, and a dotted domain.
 * The catalog never sends mail, so deliverability is out of scope.
 */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Optional filters applied when listing enrollment requests. */
export interface EnrollmentRequestFilters {
	readonly status: EnrollmentRequestStatus | undefined;
	readonly courseId: string | undefined;
	readonly learnerEmail: string | undefined;
}

/** Whether the value is a syntactically valid email address. */
export function isValidEmail(value: string): boolean {
	return EMAIL_PATTERN.test(value);
}

/** Normalises an email address for storage and comparison. */
export function normalizeEmail(value: string): string {
	return value.trim().toLowerCase();
}

/**
 * Validates a `POST /api/enrollment-requests` body.
 *
 * @throws AxcDomainError `INVALID_REQUEST` listing every invalid field.
 */
export function validateCreateEnrollmentRequest(input: unknown): CreateEnrollmentRequestCommand {
	const body = requireBody(input);
	const details: ErrorDetail[] = [];

	const courseId = readRequiredString(body, 'courseId', details);
	const learnerEmail = readRequiredString(body, 'learnerEmail', details);
	const justification = readRequiredString(body, 'justification', details);

	if (learnerEmail !== undefined && !isValidEmail(learnerEmail)) {
		details.push({ field: 'learnerEmail', message: 'learnerEmail must be a valid email address.' });
	}
	if (justification !== undefined && (justification.length < MIN_JUSTIFICATION_LENGTH || justification.length > MAX_JUSTIFICATION_LENGTH)) {
		details.push({ field: 'justification', message: `justification must be between ${MIN_JUSTIFICATION_LENGTH} and ${MAX_JUSTIFICATION_LENGTH} characters.` });
	}

	if (details.length > 0 || courseId === undefined || learnerEmail === undefined || justification === undefined) {
		throw invalidRequest(details);
	}

	return { courseId, learnerEmail: normalizeEmail(learnerEmail), justification };
}

/**
 * Validates a `PATCH /api/enrollment-requests/:id/status` body.
 *
 * @remarks
 * `changedBy` falls back to `system` when the caller omits it, matching the actor recorded for
 * the audit entry written at creation time.
 *
 * @throws AxcDomainError `INVALID_REQUEST` listing every invalid field.
 */
export function validateChangeEnrollmentRequestStatus(input: unknown): ChangeEnrollmentRequestStatusCommand {
	const body = requireBody(input);
	const details: ErrorDetail[] = [];

	const status = readEnumField(body, 'status', ENROLLMENT_REQUEST_STATUSES, details);
	const changedBy = readOptionalString(body, 'changedBy', details) ?? SYSTEM_ACTOR;
	const reason = readOptionalString(body, 'reason', details) ?? null;

	if (status === 'rejected' && reason === null) {
		details.push({ field: 'reason', message: 'reason is required when rejecting an enrollment request.' });
	}

	if (details.length > 0 || status === undefined) {
		throw invalidRequest(details);
	}

	return { status, changedBy, reason };
}

/**
 * Validates the optional filters accepted by `GET /api/enrollment-requests`.
 *
 * @throws AxcDomainError `INVALID_QUERY_PARAMETER` listing every invalid parameter.
 */
export function validateEnrollmentRequestFilters(query: RawQuery): EnrollmentRequestFilters {
	const details: ErrorDetail[] = [];
	const status = readQueryValue(query, 'status');

	if (status !== undefined && !ENROLLMENT_REQUEST_STATUSES.includes(status as EnrollmentRequestStatus)) {
		details.push({ field: 'status', message: `status must be one of: ${ENROLLMENT_REQUEST_STATUSES.join(', ')}.` });
	}
	if (details.length > 0) {
		throw invalidQueryParameters(details);
	}

	const learnerEmail = readQueryValue(query, 'learnerEmail');

	return {
		status: status as EnrollmentRequestStatus | undefined,
		courseId: readQueryValue(query, 'courseId'),
		learnerEmail: learnerEmail === undefined ? undefined : normalizeEmail(learnerEmail),
	};
}

function requireBody(input: unknown): RawBody {
	const body = asRawBody(input);
	if (body === undefined) {
		throw invalidRequest([{ field: 'body', message: 'The request body must be a JSON object.' }]);
	}
	return body;
}

function readRequiredString(body: RawBody, field: string, details: ErrorDetail[]): string | undefined {
	const value = readBodyValue(body, field);
	if (typeof value !== 'string' || value.trim().length === 0) {
		details.push({ field, message: `${field} is required and must be a non-empty string.` });
		return undefined;
	}
	return value.trim();
}

function readOptionalString(body: RawBody, field: string, details: ErrorDetail[]): string | undefined {
	const value = readBodyValue(body, field);
	if (value === undefined || value === null) {
		return undefined;
	}
	if (typeof value !== 'string' || value.trim().length === 0) {
		details.push({ field, message: `${field} must be a non-empty string when provided.` });
		return undefined;
	}
	return value.trim();
}

function readEnumField<T extends string>(body: RawBody, field: string, allowed: readonly T[], details: ErrorDetail[]): T | undefined {
	const value = readBodyValue(body, field);
	if (typeof value !== 'string' || !allowed.includes(value as T)) {
		details.push({ field, message: `${field} must be one of: ${allowed.join(', ')}.` });
		return undefined;
	}
	return value as T;
}
