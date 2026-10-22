import { canTransitionEnrollmentStatus, ENROLLMENT_CREATED_BY, type EnrollmentRequest, type EnrollmentStatus, isEnrollmentStatus, isValidJustification, normalizeLearnerEmail } from '@axc/domain';
import type { CourseCatalog, EnrollmentRequestStore } from '@axc/persistence';
import { ApplicationError, type ErrorDetail } from './errors.ts';

export interface EnrollmentListInput {
	status?: string;
	courseId?: string;
	learnerEmail?: string;
}

export interface EnrollmentRequestList {
	items: EnrollmentRequest[];
}

export interface EnrollmentRequestService {
	create(input: unknown): EnrollmentRequest;
	getById(id: string): EnrollmentRequest;
	list(input: EnrollmentListInput): EnrollmentRequestList;
	updateStatus(id: string, input: unknown): EnrollmentRequest;
}

interface EnrollmentRequestDependencies {
	catalog: CourseCatalog;
	requests: EnrollmentRequestStore;
	now?: () => string;
}

export function createEnrollmentRequests(dependencies: EnrollmentRequestDependencies): EnrollmentRequestService {
	const now = dependencies.now ?? (() => new Date().toISOString());

	return {
		create(input: unknown): EnrollmentRequest {
			const body = readJsonObject(input);
			const details: ErrorDetail[] = [];
			const courseIdValue = readRequiredString(body, 'courseId', details);
			const emailValue = readRequiredString(body, 'learnerEmail', details);
			const justification = readRequiredString(body, 'justification', details);
			const courseId = courseIdValue === undefined ? undefined : nonEmpty(courseIdValue, 'courseId', 'courseId is required.', details);
			const learnerEmail = emailValue === undefined ? undefined : parseLearnerEmail(emailValue, details);

			if (justification !== undefined && !isValidJustification(justification)) {
				details.push({ field: 'justification', message: 'justification must be between 20 and 500 characters.' });
			}

			if (details.length > 0 || courseId === undefined || learnerEmail === undefined || justification === undefined) {
				throw new ApplicationError('INVALID_REQUEST', details);
			}

			const course = dependencies.catalog.getById(courseId);
			if (course === null) {
				throw new ApplicationError('COURSE_NOT_FOUND', [{ field: 'courseId', message: 'Course does not exist.' }]);
			}
			if (course.status !== 'active') {
				throw new ApplicationError('COURSE_NOT_ACTIVE', [{ field: 'courseId', message: 'Course must be active.' }]);
			}
			if (dependencies.requests.findActive(learnerEmail, courseId) !== null) {
				throw new ApplicationError('DUPLICATE_ACTIVE_REQUEST', [{ field: 'learnerEmail', message: 'A pending or approved request already exists for this learner and course.' }]);
			}

			const timestamp = now();
			return dependencies.requests.insert({
				id: dependencies.requests.nextId(),
				courseId,
				learnerEmail,
				justification,
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
			});
		},

		getById(id: string): EnrollmentRequest {
			return requireRequest(dependencies.requests, id);
		},

		list(input: EnrollmentListInput): EnrollmentRequestList {
			const details: ErrorDetail[] = [];
			const status = parseStatusFilter(input.status, details);
			const courseId = parseOptionalFilter(input.courseId, 'courseId', details);
			const learnerEmail = parseOptionalFilter(input.learnerEmail, 'learnerEmail', details)?.toLowerCase();
			if (details.length > 0) {
				throw new ApplicationError('INVALID_REQUEST', details);
			}

			const items = dependencies.requests
				.list()
				.filter((request) => matchesListFilter(request, status, courseId, learnerEmail))
				.sort(compareByCreatedAt);
			return { items };
		},

		updateStatus(id: string, input: unknown): EnrollmentRequest {
			const body = readJsonObject(input);
			const details: ErrorDetail[] = [];
			const status = parseStatusValue(readRequiredString(body, 'status', details), details);
			const changedBy = parseChangedBy(readRequiredString(body, 'changedBy', details), details);
			const reason = parseReason(body, status, details);

			if (details.length > 0 || status === undefined || changedBy === undefined) {
				throw new ApplicationError('INVALID_REQUEST', details);
			}

			const existing = requireRequest(dependencies.requests, id);
			if (!canTransitionEnrollmentStatus(existing.status, status)) {
				throw new ApplicationError('INVALID_STATUS_TRANSITION', [{ field: 'status', message: `Cannot transition from ${existing.status} to ${status}.` }]);
			}

			const timestamp = now();
			return dependencies.requests.replace({
				...existing,
				status,
				updatedAt: timestamp,
				statusHistory: [
					...existing.statusHistory,
					{
						fromStatus: existing.status,
						toStatus: status,
						changedAt: timestamp,
						changedBy,
						reason,
					},
				],
			});
		},
	};
}

function requireRequest(requests: EnrollmentRequestStore, id: string): EnrollmentRequest {
	const request = requests.getById(id);
	if (request === null) {
		throw new ApplicationError('ENROLLMENT_REQUEST_NOT_FOUND', [{ field: 'id', message: 'Enrollment request does not exist.' }]);
	}
	return request;
}

function matchesListFilter(request: EnrollmentRequest, status: EnrollmentStatus | undefined, courseId: string | undefined, learnerEmail: string | undefined): boolean {
	if (status !== undefined && request.status !== status) {
		return false;
	}
	if (courseId !== undefined && request.courseId !== courseId) {
		return false;
	}
	if (learnerEmail !== undefined && request.learnerEmail !== learnerEmail) {
		return false;
	}
	return true;
}

function compareByCreatedAt(left: EnrollmentRequest, right: EnrollmentRequest): number {
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

function parseLearnerEmail(value: string, details: ErrorDetail[]): string | undefined {
	const normalized = normalizeLearnerEmail(value);
	if (normalized === null) {
		details.push({ field: 'learnerEmail', message: 'learnerEmail must be a valid email address.' });
		return undefined;
	}
	return normalized;
}

function parseStatusFilter(value: string | undefined, details: ErrorDetail[]): EnrollmentStatus | undefined {
	if (value === undefined) {
		return undefined;
	}
	return parseStatusValue(value, details);
}

function parseStatusValue(value: string | undefined, details: ErrorDetail[]): EnrollmentStatus | undefined {
	if (value === undefined) {
		return undefined;
	}
	if (!isEnrollmentStatus(value)) {
		details.push({ field: 'status', message: 'status must be one of pending, approved, rejected, cancelled.' });
		return undefined;
	}
	return value;
}

function parseChangedBy(value: string | undefined, details: ErrorDetail[]): string | undefined {
	if (value === undefined) {
		return undefined;
	}
	const trimmed = value.trim();
	if (trimmed.length === 0) {
		details.push({ field: 'changedBy', message: 'changedBy is required.' });
		return undefined;
	}
	return trimmed;
}

function parseReason(body: Record<string, unknown>, status: EnrollmentStatus | undefined, details: ErrorDetail[]): string | null {
	let reason: string | null = null;
	const value = readOwn(body, 'reason');
	if (value !== undefined && value !== null) {
		if (typeof value !== 'string') {
			details.push({ field: 'reason', message: 'reason must be a string.' });
			return null;
		}
		const trimmed = value.trim();
		reason = trimmed.length === 0 ? null : trimmed;
	}

	if (status === 'rejected' && reason === null && !details.some((detail) => detail.field === 'reason')) {
		details.push({ field: 'reason', message: 'reason is required when rejecting a request.' });
	}

	return reason;
}

function parseOptionalFilter(value: string | undefined, field: string, details: ErrorDetail[]): string | undefined {
	if (value === undefined) {
		return undefined;
	}
	return nonEmpty(value, field, `${field} must be a non-empty string.`, details);
}

function nonEmpty(value: string, field: string, message: string, details: ErrorDetail[]): string | undefined {
	const trimmed = value.trim();
	if (trimmed.length === 0) {
		details.push({ field, message });
		return undefined;
	}
	return trimmed;
}

function readJsonObject(input: unknown): Record<string, unknown> {
	if (typeof input !== 'object' || input === null || Array.isArray(input)) {
		throw new ApplicationError('INVALID_REQUEST', [{ field: 'body', message: 'Request body must be a JSON object.' }]);
	}
	return input as Record<string, unknown>;
}

function readOwn(body: Record<string, unknown>, field: string): unknown {
	if (!Object.hasOwn(body, field)) {
		return undefined;
	}
	return body[field];
}

function readRequiredString(body: Record<string, unknown>, field: string, details: ErrorDetail[]): string | undefined {
	const value = readOwn(body, field);
	if (value === undefined || value === null) {
		details.push({ field, message: `${field} is required.` });
		return undefined;
	}
	if (typeof value !== 'string') {
		details.push({ field, message: `${field} must be a string.` });
		return undefined;
	}
	return value;
}
