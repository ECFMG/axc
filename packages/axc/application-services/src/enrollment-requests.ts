import { canTransition, ENROLLMENT_CREATED_BY, type EnrollmentRequest, type EnrollmentStatus, isBlockingEnrollmentStatus, isEnrollmentStatus, isValidJustification, isValidLearnerEmail } from '@axc/domain';
import type { CourseCatalog } from '@axc/persistence';
import type { Clock } from './api-context.ts';
import { ApiError, type ErrorDetail, invalidRequest, REQUEST_FAILURE_MESSAGE } from './errors.ts';
import { type QueryParameters, readQueryValues } from './query.ts';

const listFields = ['status', 'courseId', 'learnerEmail'] as const;
const createFields = new Set(['courseId', 'learnerEmail', 'justification']);
const statusFields = new Set(['status', 'changedBy', 'reason']);

export interface EnrollmentRequestList {
	items: EnrollmentRequest[];
}

interface CreateInput {
	courseId: string;
	learnerEmail: string;
	justification: string;
}

interface StatusUpdate {
	status: EnrollmentStatus;
	changedBy: string;
	reason: string | null;
}

export function createEnrollmentRequests(
	catalog: CourseCatalog,
	clock: Clock,
): {
	create(body: unknown): EnrollmentRequest;
	getById(id: string): EnrollmentRequest;
	list(query: QueryParameters): EnrollmentRequestList;
	updateStatus(id: string, body: unknown): EnrollmentRequest;
} {
	return {
		create(body: unknown): EnrollmentRequest {
			const input = parseCreateBody(body);
			const course = catalog.findCourseById(input.courseId);
			if (course === undefined) {
				throw new ApiError(404, 'COURSE_NOT_FOUND', REQUEST_FAILURE_MESSAGE, [{ field: 'courseId', message: 'No course exists with this id.' }]);
			}
			if (course.status !== 'active') {
				throw new ApiError(409, 'COURSE_NOT_ACTIVE', REQUEST_FAILURE_MESSAGE, [{ field: 'courseId', message: 'Enrollment requests can only be created for active courses.' }]);
			}
			const duplicate = catalog.listEnrollmentRequests().some((request) => request.courseId === input.courseId && sameEmail(request.learnerEmail, input.learnerEmail) && isBlockingEnrollmentStatus(request.status));
			if (duplicate) {
				throw new ApiError(409, 'DUPLICATE_ACTIVE_REQUEST', REQUEST_FAILURE_MESSAGE, [{ field: 'learnerEmail', message: 'A pending or approved request already exists for this learner and course.' }]);
			}

			const timestamp = clock().toISOString();
			const request: EnrollmentRequest = {
				id: catalog.allocateEnrollmentId(),
				courseId: input.courseId,
				learnerEmail: input.learnerEmail,
				justification: input.justification,
				status: 'pending',
				createdAt: timestamp,
				updatedAt: timestamp,
				statusHistory: [
					{
						fromStatus: null,
						toStatus: 'pending',
						changedAt: timestamp,
						changedBy: ENROLLMENT_CREATED_BY,
						reason: null,
					},
				],
			};
			catalog.addEnrollmentRequest(request);
			return request;
		},

		getById(id: string): EnrollmentRequest {
			return requireRequest(catalog, id);
		},

		list(query: QueryParameters): EnrollmentRequestList {
			const filters = parseListQuery(query);
			const items = catalog
				.listEnrollmentRequests()
				.filter((request) => {
					if (filters.status !== undefined && request.status !== filters.status) {
						return false;
					}
					if (filters.courseId !== undefined && request.courseId !== filters.courseId) {
						return false;
					}
					if (filters.learnerEmail !== undefined && !sameEmail(request.learnerEmail, filters.learnerEmail)) {
						return false;
					}
					return true;
				})
				.sort((left, right) => left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id));
			return { items };
		},

		updateStatus(id: string, body: unknown): EnrollmentRequest {
			const update = parseStatusBody(body);
			const current = requireRequest(catalog, id);
			if (!canTransition(current.status, update.status)) {
				throw new ApiError(409, 'INVALID_STATUS_TRANSITION', REQUEST_FAILURE_MESSAGE, [{ field: 'status', message: `Cannot change status from ${current.status} to ${update.status}.` }]);
			}
			const timestamp = clock().toISOString();
			const updated: EnrollmentRequest = {
				...current,
				status: update.status,
				updatedAt: timestamp,
				statusHistory: [
					...current.statusHistory,
					{
						fromStatus: current.status,
						toStatus: update.status,
						changedAt: timestamp,
						changedBy: update.changedBy,
						reason: update.reason,
					},
				],
			};
			catalog.replaceEnrollmentRequest(updated);
			return updated;
		},
	};
}

function requireRequest(catalog: CourseCatalog, id: string): EnrollmentRequest {
	const request = catalog.findEnrollmentRequestById(id);
	if (request === undefined) {
		throw new ApiError(404, 'ENROLLMENT_REQUEST_NOT_FOUND', REQUEST_FAILURE_MESSAGE, [{ field: 'id', message: 'No enrollment request exists with this id.' }]);
	}
	return request;
}

function parseCreateBody(body: unknown): CreateInput {
	if (!isRecord(body)) {
		throw invalidRequest([{ field: 'body', message: 'Request body must be a JSON object.' }]);
	}
	const details: ErrorDetail[] = [];
	for (const key of Object.keys(body)) {
		if (!createFields.has(key)) {
			details.push({ field: key, message: `${key} is not a supported field.` });
		}
	}
	const courseId = readRequiredString(body, 'courseId', 'courseId is required.', details);
	const learnerEmail = readLearnerEmail(body, details);
	const justification = readJustification(body, details);
	if (details.length > 0 || courseId === undefined || learnerEmail === undefined || justification === undefined) {
		throw invalidRequest(details);
	}
	return { courseId, learnerEmail, justification };
}

function parseStatusBody(body: unknown): StatusUpdate {
	if (!isRecord(body)) {
		throw invalidRequest([{ field: 'body', message: 'Request body must be a JSON object.' }]);
	}
	const details: ErrorDetail[] = [];
	for (const key of Object.keys(body)) {
		if (!statusFields.has(key)) {
			details.push({ field: key, message: `${key} is not a supported field.` });
		}
	}
	const status = readStatus(body, details);
	const changedBy = readRequiredString(body, 'changedBy', 'changedBy is required.', details);
	const reason = readReason(body, status, details);
	if (details.length > 0 || status === undefined || changedBy === undefined || reason === undefined) {
		throw invalidRequest(details);
	}
	return { status, changedBy, reason };
}

function parseListQuery(query: QueryParameters): { status?: EnrollmentStatus; courseId?: string; learnerEmail?: string } {
	const details: ErrorDetail[] = [];
	const values = readQueryValues(query, listFields, details);
	const filters: { status?: EnrollmentStatus; courseId?: string; learnerEmail?: string } = {};
	const status = values.get('status');
	if (status !== undefined) {
		if (isEnrollmentStatus(status)) {
			filters.status = status;
		} else {
			details.push({ field: 'status', message: 'status must be pending, approved, rejected, or cancelled.' });
		}
	}
	const courseId = values.get('courseId');
	if (courseId !== undefined) {
		filters.courseId = courseId;
	}
	const learnerEmail = values.get('learnerEmail');
	if (learnerEmail !== undefined) {
		filters.learnerEmail = learnerEmail;
	}
	if (details.length > 0) {
		throw invalidRequest(details);
	}
	return filters;
}

function readLearnerEmail(body: Record<string, unknown>, details: ErrorDetail[]): string | undefined {
	const value = body['learnerEmail'];
	if (typeof value !== 'string' || !isValidLearnerEmail(value.trim())) {
		details.push({ field: 'learnerEmail', message: 'learnerEmail must be a valid email address.' });
		return undefined;
	}
	return value.trim();
}

function readJustification(body: Record<string, unknown>, details: ErrorDetail[]): string | undefined {
	const value = body['justification'];
	if (typeof value !== 'string' || !isValidJustification(value.trim())) {
		details.push({ field: 'justification', message: 'justification must be between 20 and 500 characters.' });
		return undefined;
	}
	return value.trim();
}

function readRequiredString(body: Record<string, unknown>, field: string, message: string, details: ErrorDetail[]): string | undefined {
	const value = body[field];
	if (typeof value !== 'string' || value.trim() === '') {
		details.push({ field, message });
		return undefined;
	}
	return value.trim();
}

function readStatus(body: Record<string, unknown>, details: ErrorDetail[]): EnrollmentStatus | undefined {
	const value = body['status'];
	if (typeof value !== 'string' || !isEnrollmentStatus(value)) {
		details.push({ field: 'status', message: 'status must be pending, approved, rejected, or cancelled.' });
		return undefined;
	}
	return value;
}

function readReason(body: Record<string, unknown>, status: EnrollmentStatus | undefined, details: ErrorDetail[]): string | null | undefined {
	if (!Object.hasOwn(body, 'reason')) {
		if (status === 'rejected') {
			details.push({ field: 'reason', message: 'reason is required when rejecting a request.' });
			return undefined;
		}
		return null;
	}
	const value = body['reason'];
	if (typeof value !== 'string' || value.trim() === '') {
		details.push({ field: 'reason', message: status === 'rejected' ? 'reason is required when rejecting a request.' : 'reason must not be empty.' });
		return undefined;
	}
	return value.trim();
}

function sameEmail(left: string, right: string): boolean {
	return left.toLowerCase() === right.toLowerCase();
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}
