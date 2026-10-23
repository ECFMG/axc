import { canTransitionEnrollmentStatus, type EnrollmentRequest, type EnrollmentRequestStatus, isActiveEnrollmentRequestStatus, isEnrollmentRequestStatus, type StatusHistoryEntry } from '@axc/domain';
import type { CourseReadRepository, EnrollmentRequestRepository } from '@axc/persistence';
import { INVALID_QUERY_PARAMETER_CODE, INVALID_QUERY_PARAMETER_MESSAGE, type InvalidQueryError } from './courses.ts';

export const INVALID_REQUEST_CODE = 'INVALID_REQUEST' as const;
export const INVALID_REQUEST_MESSAGE = 'The request could not be completed.' as const;
export const COURSE_NOT_FOUND_CODE = 'COURSE_NOT_FOUND' as const;
export const COURSE_NOT_ACTIVE_CODE = 'COURSE_NOT_ACTIVE' as const;
export const DUPLICATE_ACTIVE_REQUEST_CODE = 'DUPLICATE_ACTIVE_REQUEST' as const;
export const ENROLLMENT_REQUEST_NOT_FOUND_CODE = 'ENROLLMENT_REQUEST_NOT_FOUND' as const;
export const INVALID_STATUS_TRANSITION_CODE = 'INVALID_STATUS_TRANSITION' as const;

const MIN_JUSTIFICATION_LENGTH = 20;
const MAX_JUSTIFICATION_LENGTH = 500;
const LEARNER_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface ErrorFieldDetail {
	field: string;
	message: string;
}

export interface EnrollmentRequestError {
	code: string;
	message: string;
	details: ErrorFieldDetail[];
}

export type EnrollmentRequestFailureStatus = 400 | 404 | 409;

export type EnrollmentRequestOutcome<T> = { ok: true; value: T } | { ok: false; status: EnrollmentRequestFailureStatus; error: EnrollmentRequestError | InvalidQueryError };

export interface EnrollmentRequestListQuery {
	status?: string | undefined;
	courseId?: string | undefined;
	learnerEmail?: string | undefined;
}

export interface EnrollmentRequestListResult {
	items: EnrollmentRequest[];
}

export interface EnrollmentRequestService {
	create(input: unknown): EnrollmentRequestOutcome<EnrollmentRequest>;
	getById(id: string): EnrollmentRequestOutcome<EnrollmentRequest>;
	list(query: EnrollmentRequestListQuery): EnrollmentRequestOutcome<EnrollmentRequestListResult>;
	updateStatus(id: string, input: unknown): EnrollmentRequestOutcome<EnrollmentRequest>;
}

export function createEnrollmentRequestService(catalog: CourseReadRepository, store: EnrollmentRequestRepository): EnrollmentRequestService {
	let nextSequence = 1;

	return {
		create(input: unknown): EnrollmentRequestOutcome<EnrollmentRequest> {
			const parsed = parseCreateInput(input);
			if (!parsed.ok) {
				return parsed;
			}

			const course = catalog.list().find((candidate) => candidate.id === parsed.value.courseId);
			if (course === undefined) {
				return failure(404, COURSE_NOT_FOUND_CODE, 'The specified course was not found.', [{ field: 'courseId', message: 'courseId must reference an existing course.' }]);
			}

			if (course.status !== 'active') {
				return failure(409, COURSE_NOT_ACTIVE_CODE, 'A request may be created only for an active course.', [{ field: 'courseId', message: 'courseId must reference a course with status active.' }]);
			}

			const duplicate = store.list().find((record) => record.courseId === parsed.value.courseId && record.learnerEmail === parsed.value.learnerEmail && isActiveEnrollmentRequestStatus(record.status));
			if (duplicate !== undefined) {
				return failure(409, DUPLICATE_ACTIVE_REQUEST_CODE, 'A pending or approved request already exists for this learner and course.', [
					{ field: 'learnerEmail', message: 'A learner may not have more than one pending or approved request for the same course.' },
				]);
			}

			const now = new Date().toISOString();
			const created: EnrollmentRequest = {
				id: nextEnrollmentRequestId(store, () => nextSequence++),
				courseId: parsed.value.courseId,
				learnerEmail: parsed.value.learnerEmail,
				justification: parsed.value.justification,
				status: 'pending',
				createdAt: now,
				updatedAt: now,
				statusHistory: [historyEntry(null, 'pending', now, 'system', null)],
			};
			store.save(created);
			return { ok: true, value: created };
		},

		getById(id: string): EnrollmentRequestOutcome<EnrollmentRequest> {
			const record = store.getById(id);
			if (record === undefined) {
				return failure(404, ENROLLMENT_REQUEST_NOT_FOUND_CODE, 'The specified enrollment request was not found.', [{ field: 'id', message: 'id must reference an existing enrollment request.' }]);
			}

			return { ok: true, value: record };
		},

		list(query: EnrollmentRequestListQuery): EnrollmentRequestOutcome<EnrollmentRequestListResult> {
			const parsed = parseListQuery(query);
			if (!parsed.ok) {
				return parsed;
			}

			const items = store.list().filter((record) => matchesEnrollmentRequest(record, parsed.value));
			return { ok: true, value: { items } };
		},

		updateStatus(id: string, input: unknown): EnrollmentRequestOutcome<EnrollmentRequest> {
			const parsed = parseStatusUpdateInput(input);
			if (!parsed.ok) {
				return parsed;
			}

			const record = store.getById(id);
			if (record === undefined) {
				return failure(404, ENROLLMENT_REQUEST_NOT_FOUND_CODE, 'The specified enrollment request was not found.', [{ field: 'id', message: 'id must reference an existing enrollment request.' }]);
			}

			if (!canTransitionEnrollmentStatus(record.status, parsed.value.status)) {
				return failure(409, INVALID_STATUS_TRANSITION_CODE, 'The requested status transition is not allowed.', [{ field: 'status', message: `Cannot change status from ${record.status} to ${parsed.value.status}.` }]);
			}

			const now = new Date().toISOString();
			const updated: EnrollmentRequest = {
				...record,
				status: parsed.value.status,
				updatedAt: now,
				statusHistory: [...record.statusHistory, historyEntry(record.status, parsed.value.status, now, parsed.value.changedBy, parsed.value.reason)],
			};
			store.save(updated);
			return { ok: true, value: updated };
		},
	};
}

interface ParsedCreateInput {
	courseId: string;
	learnerEmail: string;
	justification: string;
}

function parseCreateInput(input: unknown): EnrollmentRequestOutcome<ParsedCreateInput> {
	if (!isJsonObject(input)) {
		return invalidRequest([{ field: 'body', message: 'Request body must be a JSON object.' }]);
	}

	const details: ErrorFieldDetail[] = [];
	const courseId = readRequiredString(input.courseId, 'courseId', details);
	const learnerEmail = readRequiredString(input.learnerEmail, 'learnerEmail', details);
	const justification = readRequiredString(input.justification, 'justification', details);

	if (learnerEmail !== undefined && !LEARNER_EMAIL_PATTERN.test(learnerEmail)) {
		details.push({ field: 'learnerEmail', message: 'learnerEmail must be a valid email address.' });
	}

	if (justification !== undefined && (justification.length < MIN_JUSTIFICATION_LENGTH || justification.length > MAX_JUSTIFICATION_LENGTH)) {
		details.push({ field: 'justification', message: 'justification must be between 20 and 500 characters.' });
	}

	if (details.length > 0 || courseId === undefined || learnerEmail === undefined || justification === undefined) {
		return invalidRequest(details);
	}

	return {
		ok: true,
		value: {
			courseId,
			learnerEmail: learnerEmail.toLocaleLowerCase(),
			justification,
		},
	};
}

interface ParsedListQuery {
	status?: EnrollmentRequestStatus | undefined;
	courseId?: string | undefined;
	learnerEmail?: string | undefined;
}

function parseListQuery(input: EnrollmentRequestListQuery): EnrollmentRequestOutcome<ParsedListQuery> {
	const details: ErrorFieldDetail[] = [];
	const query: ParsedListQuery = {};

	if (input.status !== undefined && input.status.trim() !== '') {
		if (isEnrollmentRequestStatus(input.status)) {
			query.status = input.status;
		} else {
			details.push({ field: 'status', message: 'status must be one of: pending, approved, rejected, cancelled.' });
		}
	}

	const courseId = normalizeOptionalText(input.courseId);
	if (courseId !== undefined) {
		query.courseId = courseId;
	}

	const learnerEmail = normalizeOptionalText(input.learnerEmail);
	if (learnerEmail !== undefined) {
		query.learnerEmail = learnerEmail.toLocaleLowerCase();
	}

	if (details.length > 0) {
		return {
			ok: false,
			status: 400,
			error: {
				code: INVALID_QUERY_PARAMETER_CODE,
				message: INVALID_QUERY_PARAMETER_MESSAGE,
				details,
			},
		};
	}

	return { ok: true, value: query };
}

interface ParsedStatusUpdate {
	status: EnrollmentRequestStatus;
	changedBy: string;
	reason: string | null;
}

function parseStatusUpdateInput(input: unknown): EnrollmentRequestOutcome<ParsedStatusUpdate> {
	if (!isJsonObject(input)) {
		return invalidRequest([{ field: 'body', message: 'Request body must be a JSON object.' }]);
	}

	const details: ErrorFieldDetail[] = [];
	const rawStatus = readRequiredString(input.status, 'status', details);
	const changedBy = readRequiredString(input.changedBy, 'changedBy', details);
	const reason = readOptionalReason(input.reason, details);

	let status: EnrollmentRequestStatus | undefined;
	if (rawStatus !== undefined) {
		if (isEnrollmentRequestStatus(rawStatus)) {
			status = rawStatus;
		} else {
			details.push({ field: 'status', message: 'status must be one of: pending, approved, rejected, cancelled.' });
		}
	}

	if (status === 'rejected' && (reason === null || reason === undefined)) {
		details.push({ field: 'reason', message: 'reason is required when rejecting an enrollment request.' });
	}

	if (details.length > 0 || status === undefined || changedBy === undefined) {
		return invalidRequest(details);
	}

	return {
		ok: true,
		value: {
			status,
			changedBy,
			reason: reason ?? null,
		},
	};
}

function matchesEnrollmentRequest(record: EnrollmentRequest, query: ParsedListQuery): boolean {
	if (query.status !== undefined && record.status !== query.status) {
		return false;
	}

	if (query.courseId !== undefined && record.courseId !== query.courseId) {
		return false;
	}

	if (query.learnerEmail !== undefined && record.learnerEmail !== query.learnerEmail) {
		return false;
	}

	return true;
}

function readRequiredString(value: unknown, field: string, details: ErrorFieldDetail[]): string | undefined {
	if (value === undefined || value === null) {
		details.push({ field, message: `${field} is required.` });
		return undefined;
	}

	if (typeof value !== 'string') {
		details.push({ field, message: `${field} must be a string.` });
		return undefined;
	}

	const normalized = value.trim();
	if (normalized === '') {
		details.push({ field, message: `${field} is required.` });
		return undefined;
	}

	return normalized;
}

function readOptionalReason(value: unknown, details: ErrorFieldDetail[]): string | null | undefined {
	if (value === undefined || value === null) {
		return null;
	}

	if (typeof value !== 'string') {
		details.push({ field: 'reason', message: 'reason must be a string.' });
		return undefined;
	}

	const trimmed = value.trim();
	return trimmed === '' ? null : trimmed;
}

function invalidRequest(details: ErrorFieldDetail[]): EnrollmentRequestOutcome<never> {
	return failure(400, INVALID_REQUEST_CODE, INVALID_REQUEST_MESSAGE, details);
}

function failure(status: EnrollmentRequestFailureStatus, code: string, message: string, details: ErrorFieldDetail[]): EnrollmentRequestOutcome<never> {
	return {
		ok: false,
		status,
		error: { code, message, details },
	};
}

interface JsonObject {
	courseId?: unknown;
	learnerEmail?: unknown;
	justification?: unknown;
	status?: unknown;
	changedBy?: unknown;
	reason?: unknown;
}

function isJsonObject(value: unknown): value is JsonObject {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeOptionalText(value: string | undefined): string | undefined {
	if (value === undefined) {
		return undefined;
	}

	const trimmed = value.trim();
	return trimmed === '' ? undefined : trimmed;
}

function nextEnrollmentRequestId(store: EnrollmentRequestRepository, nextSequence: () => number): string {
	let id = `enroll-${String(nextSequence()).padStart(3, '0')}`;
	while (store.getById(id) !== undefined) {
		id = `enroll-${String(nextSequence()).padStart(3, '0')}`;
	}

	return id;
}

function historyEntry(fromStatus: EnrollmentRequestStatus | null, toStatus: EnrollmentRequestStatus, changedAt: string, changedBy: string, reason: string | null): StatusHistoryEntry {
	return { fromStatus, toStatus, changedAt, changedBy, reason };
}
