import type { CatalogStore, EnrollmentRequest, EnrollmentStatus } from '@axc/domain';
import { applyStatusChange, canTransition, isActiveEnrollmentStatus, isEnrollmentStatus, isValidEmail, isValidJustification, newEnrollmentRequest } from '@axc/domain';
import { ApiError, type ApiFieldError } from './errors.ts';
import { type EnrollmentRequestList, toEnrollmentRequestList, toEnrollmentRequestResponse } from './mappers.ts';
import { pushDuplicate, type RawQuery, readQueryParam } from './query.ts';

const INVALID_REQUEST_MESSAGE = 'The request could not be completed.';
const EMAIL_MESSAGE = 'learnerEmail must be a valid email address.';
const JUSTIFICATION_MESSAGE = 'justification must be between 20 and 500 characters.';
const STATUS_MESSAGE = 'status must be one of pending, approved, rejected, or cancelled.';

interface CreateInput {
	courseId: string;
	learnerEmail: string;
	justification: string;
}

interface StatusChangeInput {
	status: EnrollmentStatus;
	changedBy: string;
	reason: string | null;
}

interface ListFilters {
	status?: EnrollmentStatus;
	courseId?: string;
	learnerEmail?: string;
}

export function createEnrollmentRequest(catalog: CatalogStore, body: unknown): EnrollmentRequest {
	const input = parseCreateBody(body);
	const course = catalog.findCourseById(input.courseId);
	if (course === undefined) {
		throw new ApiError(404, 'COURSE_NOT_FOUND', 'The course does not exist.', [{ field: 'courseId', message: 'No course exists with the given id.' }]);
	}
	if (course.status !== 'active') {
		throw new ApiError(409, 'COURSE_NOT_ACTIVE', 'Enrollment requests can only be created for active courses.', [{ field: 'courseId', message: 'Enrollment requests require an active course.' }]);
	}
	const duplicate = catalog.listEnrollmentRequests().some((request) => isActiveDuplicate(request, input.courseId, input.learnerEmail));
	if (duplicate) {
		throw new ApiError(409, 'DUPLICATE_ACTIVE_REQUEST', 'An active enrollment request already exists for this learner and course.', [
			{ field: 'learnerEmail', message: 'This learner already has a pending or approved request for the course.' },
		]);
	}
	const created = newEnrollmentRequest({
		id: catalog.nextEnrollmentId(),
		courseId: input.courseId,
		learnerEmail: input.learnerEmail,
		justification: input.justification,
		changedAt: catalog.now(),
	});
	catalog.addEnrollmentRequest(created);
	return toEnrollmentRequestResponse(created);
}

export function getEnrollmentRequest(catalog: CatalogStore, id: string): EnrollmentRequest {
	const request = catalog.findEnrollmentRequestById(id);
	if (request === undefined) {
		throw enrollmentNotFound();
	}
	return toEnrollmentRequestResponse(request);
}

export function listEnrollmentRequests(catalog: CatalogStore, query: RawQuery): EnrollmentRequestList {
	const filters = parseListQuery(query);
	const items = catalog
		.listEnrollmentRequests()
		.filter((request) => matchesListFilters(request, filters))
		.sort(compareEnrollmentRequests);
	return toEnrollmentRequestList(items);
}

export function updateEnrollmentRequestStatus(catalog: CatalogStore, id: string, body: unknown): EnrollmentRequest {
	const change = parseStatusChange(body);
	const current = catalog.findEnrollmentRequestById(id);
	if (current === undefined) {
		throw enrollmentNotFound();
	}
	if (!canTransition(current.status, change.status)) {
		throw new ApiError(409, 'INVALID_STATUS_TRANSITION', 'The status transition is not allowed.', [{ field: 'status', message: 'The status transition is not allowed.' }]);
	}
	const updated = applyStatusChange(current, {
		toStatus: change.status,
		changedAt: catalog.now(),
		changedBy: change.changedBy,
		reason: change.reason,
	});
	catalog.replaceEnrollmentRequest(updated);
	return toEnrollmentRequestResponse(updated);
}

function parseCreateBody(body: unknown): CreateInput {
	if (!isRecord(body)) {
		throw new ApiError(400, 'INVALID_REQUEST', INVALID_REQUEST_MESSAGE, [{ field: 'body', message: 'Request body must be a JSON object.' }]);
	}
	const errors: ApiFieldError[] = [];
	const courseId = readTrimmedId(body, 'courseId', errors, 'courseId is required.');
	const learnerEmail = readEmail(body, errors);
	const justification = readJustification(body, errors);
	if (errors.length > 0 || courseId === undefined || learnerEmail === undefined || justification === undefined) {
		throw new ApiError(400, 'INVALID_REQUEST', INVALID_REQUEST_MESSAGE, errors);
	}
	return { courseId, learnerEmail, justification };
}

function parseStatusChange(body: unknown): StatusChangeInput {
	if (!isRecord(body)) {
		throw new ApiError(400, 'INVALID_REQUEST', INVALID_REQUEST_MESSAGE, [{ field: 'body', message: 'Request body must be a JSON object.' }]);
	}
	const errors: ApiFieldError[] = [];
	const status = readStatus(body, errors);
	const changedBy = readChangedBy(body, errors);
	const reason = readReason(body, errors);
	if (status === 'rejected' && reason === null && !errors.some((detail) => detail.field === 'reason')) {
		errors.push({ field: 'reason', message: 'reason is required when rejecting a request.' });
	}
	if (errors.length > 0 || status === undefined || changedBy === undefined) {
		throw new ApiError(400, 'INVALID_REQUEST', INVALID_REQUEST_MESSAGE, errors);
	}
	return { status, changedBy, reason };
}

function parseListQuery(query: RawQuery): ListFilters {
	const errors: ApiFieldError[] = [];
	const status = readListStatus(query, errors);
	const courseId = readOptionalIdFilter(query, 'courseId', errors);
	const learnerEmail = readOptionalIdFilter(query, 'learnerEmail', errors);
	if (errors.length > 0) {
		throw new ApiError(400, 'INVALID_REQUEST', INVALID_REQUEST_MESSAGE, errors);
	}
	const filters: ListFilters = {};
	if (status !== undefined) {
		filters.status = status;
	}
	if (courseId !== undefined) {
		filters.courseId = courseId;
	}
	if (learnerEmail !== undefined) {
		filters.learnerEmail = learnerEmail;
	}
	return filters;
}

function readTrimmedId(body: Record<string, unknown>, field: string, errors: ApiFieldError[], message: string): string | undefined {
	const value = readString(body, field, errors, message);
	if (value === undefined) {
		return undefined;
	}
	const trimmed = value.trim();
	if (trimmed === '') {
		errors.push({ field, message });
		return undefined;
	}
	return trimmed;
}

function readEmail(body: Record<string, unknown>, errors: ApiFieldError[]): string | undefined {
	const value = readString(body, 'learnerEmail', errors, EMAIL_MESSAGE);
	if (value === undefined) {
		return undefined;
	}
	const trimmed = value.trim();
	if (!isValidEmail(trimmed)) {
		errors.push({ field: 'learnerEmail', message: EMAIL_MESSAGE });
		return undefined;
	}
	return trimmed;
}

function readJustification(body: Record<string, unknown>, errors: ApiFieldError[]): string | undefined {
	const value = readString(body, 'justification', errors, JUSTIFICATION_MESSAGE);
	if (value === undefined) {
		return undefined;
	}
	if (!isValidJustification(value)) {
		errors.push({ field: 'justification', message: JUSTIFICATION_MESSAGE });
		return undefined;
	}
	return value;
}

function readStatus(body: Record<string, unknown>, errors: ApiFieldError[]): EnrollmentStatus | undefined {
	const value = readString(body, 'status', errors, STATUS_MESSAGE);
	if (value === undefined) {
		return undefined;
	}
	const trimmed = value.trim();
	if (!isEnrollmentStatus(trimmed)) {
		errors.push({ field: 'status', message: STATUS_MESSAGE });
		return undefined;
	}
	return trimmed;
}

function readChangedBy(body: Record<string, unknown>, errors: ApiFieldError[]): string | undefined {
	const value = readString(body, 'changedBy', errors, 'changedBy is required.');
	if (value === undefined) {
		return undefined;
	}
	const trimmed = value.trim();
	if (trimmed === '') {
		errors.push({ field: 'changedBy', message: 'changedBy is required.' });
		return undefined;
	}
	return trimmed;
}

function readReason(body: Record<string, unknown>, errors: ApiFieldError[]): string | null {
	if (!Object.hasOwn(body, 'reason')) {
		return null;
	}
	// biome-ignore lint/complexity/useLiteralKeys: Record index signature requires a quoted key under noPropertyAccessFromIndexSignature
	const value = body['reason'];
	if (typeof value !== 'string') {
		errors.push({ field: 'reason', message: 'reason must be a string.' });
		return null;
	}
	const trimmed = value.trim();
	return trimmed === '' ? null : trimmed;
}

function readListStatus(query: RawQuery, errors: ApiFieldError[]): EnrollmentStatus | undefined {
	const param = readQueryParam(query, 'status');
	if (param.duplicate) {
		pushDuplicate(errors, 'status');
		return undefined;
	}
	if (param.value === undefined) {
		return undefined;
	}
	const trimmed = param.value.trim();
	if (!isEnrollmentStatus(trimmed)) {
		errors.push({ field: 'status', message: STATUS_MESSAGE });
		return undefined;
	}
	return trimmed;
}

function readOptionalIdFilter(query: RawQuery, field: string, errors: ApiFieldError[]): string | undefined {
	const param = readQueryParam(query, field);
	if (param.duplicate) {
		pushDuplicate(errors, field);
		return undefined;
	}
	if (param.value === undefined) {
		return undefined;
	}
	const trimmed = param.value.trim();
	return trimmed === '' ? undefined : trimmed;
}

function readString(body: Record<string, unknown>, field: string, errors: ApiFieldError[], message: string): string | undefined {
	const value = body[field];
	if (typeof value !== 'string') {
		errors.push({ field, message });
		return undefined;
	}
	return value;
}

function isActiveDuplicate(request: EnrollmentRequest, courseId: string, learnerEmail: string): boolean {
	return request.courseId === courseId && request.learnerEmail.toLowerCase() === learnerEmail.toLowerCase() && isActiveEnrollmentStatus(request.status);
}

function matchesListFilters(request: EnrollmentRequest, filters: ListFilters): boolean {
	if (filters.status !== undefined && request.status !== filters.status) {
		return false;
	}
	if (filters.courseId !== undefined && request.courseId !== filters.courseId) {
		return false;
	}
	if (filters.learnerEmail !== undefined && request.learnerEmail.toLowerCase() !== filters.learnerEmail.toLowerCase()) {
		return false;
	}
	return true;
}

function compareEnrollmentRequests(left: EnrollmentRequest, right: EnrollmentRequest): number {
	if (left.createdAt < right.createdAt) {
		return -1;
	}
	if (left.createdAt > right.createdAt) {
		return 1;
	}
	if (left.id < right.id) {
		return -1;
	}
	if (left.id > right.id) {
		return 1;
	}
	return 0;
}

function enrollmentNotFound(): ApiError {
	return new ApiError(404, 'ENROLLMENT_REQUEST_NOT_FOUND', 'The enrollment request does not exist.', [{ field: 'id', message: 'No enrollment request exists with the given id.' }]);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}
