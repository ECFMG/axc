import { canTransitionEnrollmentStatus, type EnrollmentRequest, type EnrollmentRequestStatus, isActiveEnrollmentRequestStatus, isEnrollmentRequestStatus, type StatusHistoryEntry } from '@axc/domain';
import { getCourseById, InvalidQueryParameterError } from './courses.ts';

export interface EnrollmentRequestListQueryInput {
	status?: string;
	courseId?: string;
	learnerEmail?: string;
}

export interface EnrollmentRequestListResult {
	items: EnrollmentRequest[];
}

interface QueryFieldDetail {
	field: string;
	message: string;
}

export class ApplicationError extends Error {
	readonly code: string;
	readonly httpStatus: 400 | 404 | 409;
	readonly details: QueryFieldDetail[];

	constructor(code: string, message: string, httpStatus: 400 | 404 | 409, details: QueryFieldDetail[] = []) {
		super(message);
		this.name = 'ApplicationError';
		this.code = code;
		this.httpStatus = httpStatus;
		this.details = details;
	}
}

const MIN_JUSTIFICATION_LENGTH = 20;
const MAX_JUSTIFICATION_LENGTH = 500;
const LEARNER_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface EnrollmentRequestService {
	create(input: unknown): EnrollmentRequest;
	getById(id: string): EnrollmentRequest;
	list(query: EnrollmentRequestListQueryInput): EnrollmentRequestListResult;
	updateStatus(id: string, input: unknown): EnrollmentRequest;
}

export function createEnrollmentRequestService(): EnrollmentRequestService {
	const records: EnrollmentRequest[] = [];
	let nextSequence = 1;

	return {
		create(input: unknown): EnrollmentRequest {
			const parsed = parseCreateInput(input);
			const course = getCourseById(parsed.courseId);
			if (course === undefined) {
				throw new ApplicationError('COURSE_NOT_FOUND', 'The specified course was not found.', 404, [{ field: 'courseId', message: 'courseId must reference an existing course.' }]);
			}
			if (course.status !== 'active') {
				throw new ApplicationError('COURSE_NOT_ACTIVE', 'A request may be created only for an active course.', 409, [{ field: 'courseId', message: 'courseId must reference a course with status active.' }]);
			}

			const duplicate = records.find((record) => record.courseId === parsed.courseId && record.learnerEmail === parsed.learnerEmail && isActiveEnrollmentRequestStatus(record.status));
			if (duplicate !== undefined) {
				throw new ApplicationError('DUPLICATE_ACTIVE_REQUEST', 'A pending or approved request already exists for this learner and course.', 409, [
					{ field: 'learnerEmail', message: 'A learner may not have more than one pending or approved request for the same course.' },
				]);
			}

			const now = new Date().toISOString();
			const created: EnrollmentRequest = {
				id: nextEnrollmentRequestId(nextSequence),
				courseId: parsed.courseId,
				learnerEmail: parsed.learnerEmail,
				justification: parsed.justification,
				status: 'pending',
				createdAt: now,
				updatedAt: now,
				statusHistory: [historyEntry(null, 'pending', now, 'system', null)],
			};
			nextSequence += 1;
			records.push(created);
			return cloneEnrollmentRequest(created);
		},

		getById(id: string): EnrollmentRequest {
			return cloneEnrollmentRequest(requireEnrollmentRequest(records, id));
		},

		list(query: EnrollmentRequestListQueryInput): EnrollmentRequestListResult {
			const filters = parseListQuery(query);
			const items = records.filter((record) => matchesEnrollmentRequest(record, filters)).map(cloneEnrollmentRequest);
			return { items };
		},

		updateStatus(id: string, input: unknown): EnrollmentRequest {
			const record = requireEnrollmentRequest(records, id);
			const parsed = parseStatusUpdateInput(input);
			if (!canTransitionEnrollmentStatus(record.status, parsed.status)) {
				throw new ApplicationError('INVALID_STATUS_TRANSITION', 'The requested status transition is not allowed.', 409, [{ field: 'status', message: `Cannot change status from ${record.status} to ${parsed.status}.` }]);
			}

			const now = new Date().toISOString();
			record.statusHistory.push(historyEntry(record.status, parsed.status, now, parsed.changedBy, parsed.reason));
			record.status = parsed.status;
			record.updatedAt = now;
			return cloneEnrollmentRequest(record);
		},
	};
}

interface ParsedCreateInput {
	courseId: string;
	learnerEmail: string;
	justification: string;
}

interface ParsedListQuery {
	status?: EnrollmentRequestStatus;
	courseId?: string;
	learnerEmail?: string;
}

interface ParsedStatusUpdateInput {
	status: EnrollmentRequestStatus;
	changedBy: string;
	reason: string | null;
}

function parseCreateInput(input: unknown): ParsedCreateInput {
	if (!isJsonObject(input)) {
		throw invalidRequest([{ field: 'body', message: 'Request body must be a JSON object.' }]);
	}

	const details: QueryFieldDetail[] = [];
	const courseId = readRequiredString(readProperty(input, 'courseId'), 'courseId', details);
	const learnerEmail = readRequiredString(readProperty(input, 'learnerEmail'), 'learnerEmail', details);
	const justification = readRequiredString(readProperty(input, 'justification'), 'justification', details);

	if (learnerEmail !== undefined && !LEARNER_EMAIL_PATTERN.test(learnerEmail)) {
		details.push({ field: 'learnerEmail', message: 'learnerEmail must be a valid email address.' });
	}

	if (justification !== undefined && (justification.length < MIN_JUSTIFICATION_LENGTH || justification.length > MAX_JUSTIFICATION_LENGTH)) {
		details.push({ field: 'justification', message: 'justification must be between 20 and 500 characters.' });
	}

	if (details.length > 0 || courseId === undefined || learnerEmail === undefined || justification === undefined) {
		throw invalidRequest(details);
	}

	return {
		courseId,
		learnerEmail: learnerEmail.toLowerCase(),
		justification,
	};
}

function parseListQuery(input: EnrollmentRequestListQueryInput): ParsedListQuery {
	const details: QueryFieldDetail[] = [];
	const query: ParsedListQuery = {};

	if (input.status !== undefined && input.status !== '') {
		if (isEnrollmentRequestStatus(input.status)) {
			query.status = input.status;
		} else {
			details.push({ field: 'status', message: 'status must be one of: pending, approved, rejected, cancelled.' });
		}
	} else if (input.status === '') {
		details.push({ field: 'status', message: 'status must be one of: pending, approved, rejected, cancelled.' });
	}

	const courseId = normalizeOptionalText(input.courseId);
	if (courseId !== undefined) {
		query.courseId = courseId;
	}

	const learnerEmail = normalizeOptionalText(input.learnerEmail);
	if (learnerEmail !== undefined) {
		query.learnerEmail = learnerEmail.toLowerCase();
	}

	if (details.length > 0) {
		throw new InvalidQueryParameterError(details);
	}

	return query;
}

function parseStatusUpdateInput(input: unknown): ParsedStatusUpdateInput {
	if (!isJsonObject(input)) {
		throw invalidRequest([{ field: 'body', message: 'Request body must be a JSON object.' }]);
	}

	const details: QueryFieldDetail[] = [];
	const rawStatus = readRequiredString(readProperty(input, 'status'), 'status', details);
	const changedBy = readRequiredString(readProperty(input, 'changedBy'), 'changedBy', details);
	const reason = readOptionalReason(readProperty(input, 'reason'), details);

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
		throw invalidRequest(details);
	}

	return {
		status,
		changedBy,
		reason: reason ?? null,
	};
}

function requireEnrollmentRequest(records: EnrollmentRequest[], id: string): EnrollmentRequest {
	const record = records.find((candidate) => candidate.id === id);
	if (record === undefined) {
		throw new ApplicationError('ENROLLMENT_REQUEST_NOT_FOUND', 'The specified enrollment request was not found.', 404, [{ field: 'id', message: 'id must reference an existing enrollment request.' }]);
	}
	return record;
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

function readRequiredString(value: unknown, field: string, details: QueryFieldDetail[], trim = true): string | undefined {
	if (value === undefined || value === null) {
		details.push({ field, message: `${field} is required.` });
		return undefined;
	}
	if (typeof value !== 'string') {
		details.push({ field, message: `${field} must be a string.` });
		return undefined;
	}
	const normalized = trim ? value.trim() : value;
	if (normalized === '') {
		details.push({ field, message: `${field} is required.` });
		return undefined;
	}
	return normalized;
}

function readOptionalReason(value: unknown, details: QueryFieldDetail[]): string | null | undefined {
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

function invalidRequest(details: QueryFieldDetail[]): ApplicationError {
	return new ApplicationError('INVALID_REQUEST', 'The request could not be completed.', 400, details);
}

function isJsonObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readProperty(input: Record<string, unknown>, field: string): unknown {
	return input[field];
}

function normalizeOptionalText(value: string | undefined): string | undefined {
	if (value === undefined) {
		return undefined;
	}
	const trimmed = value.trim();
	return trimmed === '' ? undefined : trimmed;
}

function nextEnrollmentRequestId(sequence: number): string {
	return `enroll-${String(sequence).padStart(3, '0')}`;
}

function historyEntry(fromStatus: EnrollmentRequestStatus | null, toStatus: EnrollmentRequestStatus, changedAt: string, changedBy: string, reason: string | null): StatusHistoryEntry {
	return { fromStatus, toStatus, changedAt, changedBy, reason };
}

function cloneEnrollmentRequest(record: EnrollmentRequest): EnrollmentRequest {
	return {
		...record,
		statusHistory: record.statusHistory.map((entry) => ({ ...entry })),
	};
}
