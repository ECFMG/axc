import {
	type Course,
	courseAcceptsEnrollment,
	createPendingEnrollmentRequest,
	type EnrollmentRequest,
	type EnrollmentRequestFilter,
	type EnrollmentRequestRepository,
	type EnrollmentRequestStatus,
	filterEnrollmentRequests,
	findActiveEnrollmentRequest,
	isEnrollmentRequestStatus,
	normalizeJustification,
	normalizeLearnerEmail,
	transitionEnrollmentRequest,
} from '@axc/domain';

export interface EnrollmentRequestErrorDetail {
	readonly field: string;
	readonly message: string;
}

export const ENROLLMENT_REQUEST_ERROR_CODES = ['INVALID_REQUEST', 'COURSE_NOT_FOUND', 'COURSE_NOT_ACTIVE', 'DUPLICATE_ACTIVE_REQUEST', 'ENROLLMENT_REQUEST_NOT_FOUND', 'INVALID_STATUS_TRANSITION'] as const;
export type EnrollmentRequestErrorCode = (typeof ENROLLMENT_REQUEST_ERROR_CODES)[number];

export interface EnrollmentRequestError {
	readonly code: EnrollmentRequestErrorCode;
	readonly message: string;
	readonly details: readonly EnrollmentRequestErrorDetail[];
}

export type EnrollmentRequestFailure = { readonly ok: false; readonly status: 400 | 404 | 409; readonly error: EnrollmentRequestError };

export type EnrollmentRequestOutcome = { readonly ok: true; readonly request: EnrollmentRequest } | EnrollmentRequestFailure;

export type EnrollmentRequestListOutcome = { readonly ok: true; readonly items: readonly EnrollmentRequest[] } | EnrollmentRequestFailure;

const INVALID_REQUEST_MESSAGE = 'The request could not be completed.';
const COURSE_NOT_FOUND_MESSAGE = 'The course does not exist.';
const COURSE_NOT_ACTIVE_MESSAGE = 'Enrollment requests can only be created for an active course.';
const DUPLICATE_ACTIVE_REQUEST_MESSAGE = 'This learner already has a pending or approved request for the course.';
const ENROLLMENT_REQUEST_NOT_FOUND_MESSAGE = 'The enrollment request does not exist.';
const INVALID_STATUS_TRANSITION_MESSAGE = 'The status transition is not allowed.';
const EMAIL_MESSAGE = 'learnerEmail must be a valid email address.';
const JUSTIFICATION_MESSAGE = 'justification must be between 20 and 500 characters.';
const COURSE_ID_MESSAGE = 'courseId must be a non-empty string.';
const STATUS_MESSAGE = 'status must be one of pending, approved, rejected, or cancelled.';
const REASON_MESSAGE = 'reason must be a non-empty string.';
const CHANGED_BY_MESSAGE = 'changedBy must be a non-empty string.';
const BODY_MESSAGE = 'Request body must be a JSON object.';
const JSON_MESSAGE = 'Request body must be valid JSON.';
const LIST_PARAMETERS = new Set(['status', 'courseId', 'learnerEmail']);

type FieldRead = { readonly state: 'missing' } | { readonly state: 'invalid' } | { readonly state: 'value'; readonly value: string };
type TextRead = { readonly status: 'empty' } | { readonly status: 'invalid' } | { readonly status: 'value'; readonly value: string };

export function malformedEnrollmentRequestBody(): EnrollmentRequestFailure {
	return invalidRequest([{ field: 'body', message: JSON_MESSAGE }]);
}

export function createEnrollmentRequest(courses: readonly Course[], repository: EnrollmentRequestRepository, body: unknown, now: () => string): EnrollmentRequestOutcome {
	const record = readRecord(body);
	if (record === undefined) {
		return invalidRequest([{ field: 'body', message: BODY_MESSAGE }]);
	}

	const details: EnrollmentRequestErrorDetail[] = [];
	const courseId = readCourseId(record, details);
	const learnerEmail = readLearnerEmail(record, details);
	const justification = readJustification(record, details);
	if (details.length > 0 || courseId === undefined || learnerEmail === undefined || justification === undefined) {
		return invalidRequest(details);
	}

	const course = courses.find((candidate) => candidate.id === courseId);
	if (course === undefined) {
		return failure('COURSE_NOT_FOUND', COURSE_NOT_FOUND_MESSAGE, [{ field: 'courseId', message: 'No course exists with this id.' }]);
	}
	if (!courseAcceptsEnrollment(course)) {
		return failure('COURSE_NOT_ACTIVE', COURSE_NOT_ACTIVE_MESSAGE, [{ field: 'courseId', message: 'Course status must be active.' }]);
	}
	if (findActiveEnrollmentRequest(repository.list(), courseId, learnerEmail) !== undefined) {
		return failure('DUPLICATE_ACTIVE_REQUEST', DUPLICATE_ACTIVE_REQUEST_MESSAGE, [{ field: 'learnerEmail', message: 'A pending or approved request already exists for this learner and course.' }]);
	}

	const request = createPendingEnrollmentRequest({
		id: repository.nextId(),
		courseId,
		learnerEmail,
		justification,
		changedAt: now(),
	});
	repository.insert(request);
	return { ok: true, request };
}

export function getEnrollmentRequest(repository: EnrollmentRequestRepository, id: string): EnrollmentRequestOutcome {
	const request = repository.findById(id);
	if (request === undefined) {
		return failure('ENROLLMENT_REQUEST_NOT_FOUND', ENROLLMENT_REQUEST_NOT_FOUND_MESSAGE, [{ field: 'id', message: 'No enrollment request exists with this id.' }]);
	}
	return { ok: true, request };
}

export function listEnrollmentRequests(repository: EnrollmentRequestRepository, query: Readonly<Record<string, readonly string[]>>): EnrollmentRequestListOutcome {
	const details: EnrollmentRequestErrorDetail[] = [];
	const status = readStatusFilter(query, details);
	const courseId = readCourseIdFilter(query, details);
	const learnerEmail = readLearnerEmailFilter(query, details);
	appendUnknownListParameters(query, details);
	if (details.length > 0) {
		return invalidRequest(details);
	}

	const filter: EnrollmentRequestFilter = {
		...(status === undefined ? {} : { status }),
		...(courseId === undefined ? {} : { courseId }),
		...(learnerEmail === undefined ? {} : { learnerEmail }),
	};
	return { ok: true, items: filterEnrollmentRequests(repository.list(), filter) };
}

export function updateEnrollmentRequestStatus(repository: EnrollmentRequestRepository, id: string, body: unknown, now: () => string): EnrollmentRequestOutcome {
	const record = readRecord(body);
	if (record === undefined) {
		return invalidRequest([{ field: 'body', message: BODY_MESSAGE }]);
	}

	const details: EnrollmentRequestErrorDetail[] = [];
	const status = readStatusValue(record, details);
	const changedBy = readChangedBy(record, details);
	const reason = readReason(record, details);
	if (details.length > 0 || status === undefined || changedBy === undefined || reason === undefined) {
		return invalidRequest(details);
	}

	const current = repository.findById(id);
	if (current === undefined) {
		return failure('ENROLLMENT_REQUEST_NOT_FOUND', ENROLLMENT_REQUEST_NOT_FOUND_MESSAGE, [{ field: 'id', message: 'No enrollment request exists with this id.' }]);
	}

	const changedAt = now();
	const transitioned = transitionEnrollmentRequest(current, {
		status,
		changedBy,
		reason,
		changedAt,
	});
	if (transitioned === undefined) {
		return failure('INVALID_STATUS_TRANSITION', INVALID_STATUS_TRANSITION_MESSAGE, [{ field: 'status', message: `status cannot change from ${current.status} to ${status}.` }]);
	}
	if (status === 'rejected' && reason === null) {
		return invalidRequest([{ field: 'reason', message: REASON_MESSAGE }]);
	}

	repository.replace(transitioned);
	return { ok: true, request: transitioned };
}

function readCourseId(body: Record<string, unknown>, details: EnrollmentRequestErrorDetail[]): string | undefined {
	const read = readField(body, 'courseId');
	if (read.state !== 'value') {
		details.push({ field: 'courseId', message: COURSE_ID_MESSAGE });
		return undefined;
	}
	const courseId = read.value.trim();
	if (courseId.length === 0) {
		details.push({ field: 'courseId', message: COURSE_ID_MESSAGE });
		return undefined;
	}
	return courseId;
}

function readLearnerEmail(body: Record<string, unknown>, details: EnrollmentRequestErrorDetail[]): string | undefined {
	const read = readField(body, 'learnerEmail');
	if (read.state !== 'value') {
		details.push({ field: 'learnerEmail', message: EMAIL_MESSAGE });
		return undefined;
	}
	const email = normalizeLearnerEmail(read.value);
	if (email === undefined) {
		details.push({ field: 'learnerEmail', message: EMAIL_MESSAGE });
		return undefined;
	}
	return email;
}

function readJustification(body: Record<string, unknown>, details: EnrollmentRequestErrorDetail[]): string | undefined {
	const read = readField(body, 'justification');
	if (read.state !== 'value') {
		details.push({ field: 'justification', message: JUSTIFICATION_MESSAGE });
		return undefined;
	}
	const justification = normalizeJustification(read.value);
	if (justification === undefined) {
		details.push({ field: 'justification', message: JUSTIFICATION_MESSAGE });
		return undefined;
	}
	return justification;
}

function readStatusValue(body: Record<string, unknown>, details: EnrollmentRequestErrorDetail[]): EnrollmentRequestStatus | undefined {
	const read = readField(body, 'status');
	if (read.state !== 'value') {
		details.push({ field: 'status', message: STATUS_MESSAGE });
		return undefined;
	}
	const status = read.value.trim();
	if (!isEnrollmentRequestStatus(status)) {
		details.push({ field: 'status', message: STATUS_MESSAGE });
		return undefined;
	}
	return status;
}

function readChangedBy(body: Record<string, unknown>, details: EnrollmentRequestErrorDetail[]): string | undefined {
	const read = readField(body, 'changedBy');
	if (read.state !== 'value') {
		details.push({ field: 'changedBy', message: CHANGED_BY_MESSAGE });
		return undefined;
	}
	const changedBy = read.value.trim();
	if (changedBy.length === 0) {
		details.push({ field: 'changedBy', message: CHANGED_BY_MESSAGE });
		return undefined;
	}
	return changedBy;
}

function readReason(body: Record<string, unknown>, details: EnrollmentRequestErrorDetail[]): string | null | undefined {
	const field = 'reason';
	if (!Object.hasOwn(body, field)) {
		return null;
	}
	const value = body[field];
	if (value === null) {
		return null;
	}
	if (typeof value !== 'string') {
		details.push({ field, message: REASON_MESSAGE });
		return undefined;
	}
	const reason = value.trim();
	return reason.length === 0 ? null : reason;
}

function readStatusFilter(query: Readonly<Record<string, readonly string[]>>, details: EnrollmentRequestErrorDetail[]): EnrollmentRequestStatus | undefined {
	const read = readText(query, 'status', details, { blank: STATUS_MESSAGE, duplicate: 'status must be provided once.' });
	if (read.status !== 'value') {
		return undefined;
	}
	if (!isEnrollmentRequestStatus(read.value)) {
		details.push({ field: 'status', message: STATUS_MESSAGE });
		return undefined;
	}
	return read.value;
}

function readCourseIdFilter(query: Readonly<Record<string, readonly string[]>>, details: EnrollmentRequestErrorDetail[]): string | undefined {
	const read = readText(query, 'courseId', details, { blank: COURSE_ID_MESSAGE, duplicate: 'courseId must be provided once.' });
	return read.status === 'value' ? read.value : undefined;
}

function readLearnerEmailFilter(query: Readonly<Record<string, readonly string[]>>, details: EnrollmentRequestErrorDetail[]): string | undefined {
	const read = readText(query, 'learnerEmail', details, { blank: 'learnerEmail must be a non-empty string.', duplicate: 'learnerEmail must be provided once.' });
	return read.status === 'value' ? read.value : undefined;
}

function appendUnknownListParameters(query: Readonly<Record<string, readonly string[]>>, details: EnrollmentRequestErrorDetail[]): void {
	const unknown = Object.keys(query)
		.filter((field) => !LIST_PARAMETERS.has(field))
		.sort((left, right) => left.localeCompare(right, 'en'));
	for (const field of unknown) {
		details.push({ field, message: 'Unknown query parameter.' });
	}
}

function readField(body: Record<string, unknown>, field: string): FieldRead {
	if (!Object.hasOwn(body, field)) {
		return { state: 'missing' };
	}
	const value = body[field];
	if (typeof value !== 'string') {
		return { state: 'invalid' };
	}
	return { state: 'value', value };
}

function readText(query: Readonly<Record<string, readonly string[]>>, field: string, details: EnrollmentRequestErrorDetail[], messages: { readonly blank: string; readonly duplicate: string }): TextRead {
	const values = query[field];
	if (values === undefined || values.length === 0) {
		return { status: 'empty' };
	}
	if (values.length > 1) {
		details.push({ field, message: messages.duplicate });
		return { status: 'invalid' };
	}
	const value = (values[0] ?? '').trim();
	if (value.length === 0) {
		details.push({ field, message: messages.blank });
		return { status: 'invalid' };
	}
	return { status: 'value', value };
}

function readRecord(body: unknown): Record<string, unknown> | undefined {
	if (typeof body !== 'object' || body === null || Array.isArray(body)) {
		return undefined;
	}
	return body as Record<string, unknown>;
}

function invalidRequest(details: readonly EnrollmentRequestErrorDetail[]): EnrollmentRequestFailure {
	return {
		ok: false,
		status: 400,
		error: {
			code: 'INVALID_REQUEST',
			message: INVALID_REQUEST_MESSAGE,
			details,
		},
	};
}

function failure(code: EnrollmentRequestErrorCode, message: string, details: readonly EnrollmentRequestErrorDetail[]): EnrollmentRequestOutcome {
	return {
		ok: false,
		status: httpStatus(code),
		error: { code, message, details },
	};
}

function httpStatus(code: EnrollmentRequestErrorCode): 400 | 404 | 409 {
	switch (code) {
		case 'INVALID_REQUEST':
			return 400;
		case 'COURSE_NOT_FOUND':
		case 'ENROLLMENT_REQUEST_NOT_FOUND':
			return 404;
		case 'COURSE_NOT_ACTIVE':
		case 'DUPLICATE_ACTIVE_REQUEST':
		case 'INVALID_STATUS_TRANSITION':
			return 409;
	}
}
