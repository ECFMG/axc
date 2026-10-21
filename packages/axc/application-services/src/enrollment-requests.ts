import {
	type Course,
	canTransitionEnrollmentRequest,
	createPendingEnrollmentRequest,
	type EnrollmentRequest,
	type EnrollmentRequestStatus,
	type EnrollmentRequestStore,
	type EnrollmentStatusUpdateTarget,
	enrollmentRequestStatuses,
	enrollmentStatusUpdateTargets,
	hasActiveEnrollmentRequest,
	isEnrollmentRequestStatus,
	isEnrollmentStatusUpdateTarget,
	isValidLearnerEmail,
	JUSTIFICATION_MAX_LENGTH,
	JUSTIFICATION_MIN_LENGTH,
	transitionEnrollmentRequest,
} from '@axc/domain';
import { type ApiErrorBody, type ApiErrorDetail, invalidRequestError } from './api-error.ts';
import { type QueryValues, readSingleQueryValue, readUnknownQueryParameters } from './query-values.ts';

const listParameters = ['status', 'courseId', 'learnerEmail'] as const;

export interface EnrollmentRequestList {
	items: EnrollmentRequest[];
}

export type EnrollmentResult<T> = { ok: true; value: T } | { ok: false; error: ApiErrorBody };

interface EnrollmentRequestService {
	create(body: unknown): EnrollmentResult<EnrollmentRequest>;
	getById(id: string): EnrollmentResult<EnrollmentRequest>;
	list(query: QueryValues): EnrollmentResult<EnrollmentRequestList>;
	updateStatus(id: string, body: unknown): EnrollmentResult<EnrollmentRequest>;
}

export function createEnrollmentRequestService(dependencies: { courses: readonly Course[]; store: EnrollmentRequestStore; now: () => string }): EnrollmentRequestService {
	const { courses, store, now } = dependencies;

	return {
		create(body: unknown): EnrollmentResult<EnrollmentRequest> {
			if (!isRecord(body)) {
				return invalid('body', 'Request body must be a JSON object.');
			}
			const details: ApiErrorDetail[] = [];
			const courseId = readRequiredString(body.courseId, 'courseId', details);
			const learnerEmail = readLearnerEmail(body.learnerEmail, details);
			const justification = readJustification(body.justification, details);
			if (courseId === undefined || learnerEmail === undefined || justification === undefined) {
				return { ok: false, error: invalidRequestError(details) };
			}
			const course = courses.find((item) => item.id === courseId);
			if (course === undefined) {
				return failure('COURSE_NOT_FOUND', 'The course does not exist.', 'courseId', 'The course does not exist.');
			}
			if (course.status !== 'active') {
				return failure('COURSE_NOT_ACTIVE', 'The course is not active.', 'courseId', 'Enrollment requests require an active course.');
			}
			if (hasActiveEnrollmentRequest(store.list(), courseId, learnerEmail)) {
				return failure(
					'DUPLICATE_ACTIVE_REQUEST',
					'An active enrollment request already exists for this learner and course.',
					'learnerEmail',
					'A learner cannot have more than one pending or approved request for the same course.',
				);
			}
			const request = createPendingEnrollmentRequest({
				id: store.nextId(),
				courseId,
				learnerEmail,
				justification,
				changedAt: now(),
			});
			return { ok: true, value: store.insert(request) };
		},

		getById(id: string): EnrollmentResult<EnrollmentRequest> {
			return readExisting(store, id);
		},

		list(query: QueryValues): EnrollmentResult<EnrollmentRequestList> {
			const parsed = parseListQuery(query);
			if (!parsed.ok) {
				return parsed;
			}
			const { status, courseId, learnerEmail } = parsed.value;
			const items = store
				.list()
				.filter((request) => matchesFilter(request, status, courseId, learnerEmail))
				.sort(compareRequests);
			return { ok: true, value: { items } };
		},

		updateStatus(id: string, body: unknown): EnrollmentResult<EnrollmentRequest> {
			if (!isRecord(body)) {
				return invalid('body', 'Request body must be a JSON object.');
			}
			const details: ApiErrorDetail[] = [];
			const status = readUpdateStatus(body.status, details);
			const changedBy = readRequiredString(body.changedBy, 'changedBy', details);
			const reason = readReason(body.reason, status, details);
			if (status === undefined || changedBy === undefined || reason === undefined) {
				return { ok: false, error: invalidRequestError(details) };
			}
			const current = store.findById(id);
			if (current === undefined) {
				return failure('ENROLLMENT_REQUEST_NOT_FOUND', 'The enrollment request does not exist.', 'id', 'The enrollment request does not exist.');
			}
			if (!canTransitionEnrollmentRequest(current.status, status)) {
				return failure('INVALID_STATUS_TRANSITION', 'The status transition is not allowed.', 'status', `Cannot change status from ${current.status} to ${status}.`);
			}
			const updated = transitionEnrollmentRequest(current, {
				toStatus: status,
				changedBy,
				reason,
				changedAt: now(),
			});
			return { ok: true, value: store.update(updated) };
		},
	};
}

interface ListFilters {
	status: EnrollmentRequestStatus | undefined;
	courseId: string | undefined;
	learnerEmail: string | undefined;
}

function parseListQuery(query: QueryValues): EnrollmentResult<ListFilters> {
	const details: ApiErrorDetail[] = [];
	const status = readStatusFilter(readSingleQueryValue(query, 'status', details), details);
	const courseId = readCourseIdFilter(readSingleQueryValue(query, 'courseId', details), details);
	const learnerEmail = readEmailFilter(readSingleQueryValue(query, 'learnerEmail', details), details);
	readUnknownQueryParameters(query, listParameters, details);
	if (details.length > 0) {
		return { ok: false, error: invalidRequestError(details) };
	}
	return { ok: true, value: { status, courseId, learnerEmail } };
}

function readExisting(store: EnrollmentRequestStore, id: string): EnrollmentResult<EnrollmentRequest> {
	const request = store.findById(id);
	if (request === undefined) {
		return failure('ENROLLMENT_REQUEST_NOT_FOUND', 'The enrollment request does not exist.', 'id', 'The enrollment request does not exist.');
	}
	return { ok: true, value: request };
}

function matchesFilter(request: EnrollmentRequest, status: EnrollmentRequestStatus | undefined, courseId: string | undefined, learnerEmail: string | undefined): boolean {
	if (status !== undefined && request.status !== status) {
		return false;
	}
	if (courseId !== undefined && request.courseId !== courseId) {
		return false;
	}
	if (learnerEmail !== undefined && normalizeEmail(request.learnerEmail) !== normalizeEmail(learnerEmail)) {
		return false;
	}
	return true;
}

function compareRequests(left: EnrollmentRequest, right: EnrollmentRequest): number {
	const byCreatedAt = left.createdAt.localeCompare(right.createdAt);
	if (byCreatedAt !== 0) {
		return byCreatedAt;
	}
	return left.id.localeCompare(right.id);
}

function readRequiredString(value: unknown, field: string, details: ApiErrorDetail[]): string | undefined {
	if (typeof value !== 'string' || value.trim().length === 0) {
		details.push({ field, message: `${field} is required.` });
		return undefined;
	}
	return value.trim();
}

function readLearnerEmail(value: unknown, details: ApiErrorDetail[]): string | undefined {
	if (typeof value !== 'string' || value.trim().length === 0) {
		details.push({ field: 'learnerEmail', message: 'learnerEmail is required.' });
		return undefined;
	}
	const email = value.trim();
	if (!isValidLearnerEmail(email)) {
		details.push({ field: 'learnerEmail', message: 'learnerEmail must be a valid email address.' });
		return undefined;
	}
	return email;
}

function readJustification(value: unknown, details: ApiErrorDetail[]): string | undefined {
	if (typeof value !== 'string') {
		details.push({ field: 'justification', message: 'justification is required.' });
		return undefined;
	}
	const justification = value.trim();
	if (justification.length < JUSTIFICATION_MIN_LENGTH || justification.length > JUSTIFICATION_MAX_LENGTH) {
		details.push({ field: 'justification', message: 'justification must be between 20 and 500 characters.' });
		return undefined;
	}
	return justification;
}

function readUpdateStatus(value: unknown, details: ApiErrorDetail[]): EnrollmentStatusUpdateTarget | undefined {
	if (typeof value !== 'string' || !isEnrollmentStatusUpdateTarget(value)) {
		details.push({ field: 'status', message: `status must be one of ${formatChoices(enrollmentStatusUpdateTargets)}.` });
		return undefined;
	}
	return value;
}

function readReason(value: unknown, status: EnrollmentStatusUpdateTarget | undefined, details: ApiErrorDetail[]): string | null | undefined {
	if (value !== undefined && value !== null && typeof value !== 'string') {
		details.push({ field: 'reason', message: 'reason must be a string.' });
		return undefined;
	}
	const reason = typeof value === 'string' ? value.trim() : '';
	if (status === 'rejected' && reason.length === 0) {
		details.push({ field: 'reason', message: 'reason is required when rejecting a request.' });
		return undefined;
	}
	return reason.length === 0 ? null : reason;
}

function readStatusFilter(value: string | undefined, details: ApiErrorDetail[]): EnrollmentRequestStatus | undefined {
	if (value === undefined) {
		return undefined;
	}
	const status = value.trim();
	if (!isEnrollmentRequestStatus(status)) {
		details.push({ field: 'status', message: `status must be one of ${formatChoices(enrollmentRequestStatuses)}.` });
		return undefined;
	}
	return status;
}

function readCourseIdFilter(value: string | undefined, details: ApiErrorDetail[]): string | undefined {
	if (value === undefined) {
		return undefined;
	}
	const courseId = value.trim();
	if (courseId.length === 0) {
		details.push({ field: 'courseId', message: 'courseId must be a non-empty string.' });
		return undefined;
	}
	return courseId;
}

function readEmailFilter(value: string | undefined, details: ApiErrorDetail[]): string | undefined {
	if (value === undefined) {
		return undefined;
	}
	const email = value.trim();
	if (!isValidLearnerEmail(email)) {
		details.push({ field: 'learnerEmail', message: 'learnerEmail must be a valid email address.' });
		return undefined;
	}
	return email;
}

function invalid(field: string, message: string): EnrollmentResult<never> {
	return { ok: false, error: invalidRequestError([{ field, message }]) };
}

function failure(code: Exclude<ApiErrorBody['code'], 'INVALID_REQUEST'>, message: string, field: string, detail: string): EnrollmentResult<never> {
	return {
		ok: false,
		error: {
			code,
			message,
			details: [{ field, message: detail }],
		},
	};
}

interface RequestBody {
	courseId?: unknown;
	learnerEmail?: unknown;
	justification?: unknown;
	status?: unknown;
	changedBy?: unknown;
	reason?: unknown;
}

function isRecord(value: unknown): value is RequestBody {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeEmail(email: string): string {
	return email.trim().toLocaleLowerCase('en-US');
}

function formatChoices(values: readonly string[]): string {
	const last = values[values.length - 1];
	if (last === undefined || values.length === 1) {
		return last ?? '';
	}
	return `${values.slice(0, -1).join(', ')}, or ${last}`;
}
