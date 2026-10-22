import { type CourseRepository, canTransition, type EnrollmentRequest, type EnrollmentRequestRepository, type EnrollmentStatus, EntityNotFoundError, isActiveEnrollmentStatus, isEnrollmentStatus } from '@axc/domain';
import { ApplicationError, type FieldError } from './errors.ts';
import { type RawQuery, readSingle } from './query.ts';

const INVALID_REQUEST_MESSAGE = 'The request could not be completed.';
const JUSTIFICATION_MESSAGE = 'justification must be between 20 and 500 characters.';
const MIN_JUSTIFICATION_LENGTH = 20;
const MAX_JUSTIFICATION_LENGTH = 500;
const EMAIL_PATTERN = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
const LIST_FIELDS = new Set(['status', 'courseId', 'learnerEmail']);

export interface EnrollmentList {
	items: EnrollmentRequest[];
}

interface StatusChange {
	status: EnrollmentStatus;
	changedBy: string;
	reason: string | null;
}

export function createEnrollmentRequests(
	courses: CourseRepository,
	enrollmentRequests: EnrollmentRequestRepository,
	clock: { now(): string },
): {
	create(body: unknown): Promise<EnrollmentRequest>;
	getById(id: string): Promise<EnrollmentRequest>;
	list(query: RawQuery): Promise<EnrollmentList>;
	updateStatus(id: string, body: unknown): Promise<EnrollmentRequest>;
} {
	return {
		async create(body: unknown): Promise<EnrollmentRequest> {
			const input = parseCreate(body);
			const course = await findCourse(courses, input.courseId);
			if (course.status !== 'active') {
				throw new ApplicationError('COURSE_NOT_ACTIVE', 'Enrollment requests require an active course.', [{ field: 'courseId', message: 'The course is not active.' }]);
			}
			const existing = await enrollmentRequests.list();
			// The duplicate check and insert stay synchronous so two in-flight creates cannot both pass.
			if (existing.some((request) => isDuplicateActiveRequest(request, input.courseId, input.learnerEmail))) {
				throw new ApplicationError('DUPLICATE_ACTIVE_REQUEST', 'An active enrollment request already exists for this learner and course.', [
					{ field: 'learnerEmail', message: 'This learner already has a pending or approved request for the course.' },
				]);
			}
			const now = clock.now();
			const created: EnrollmentRequest = {
				id: enrollmentRequests.allocateId(),
				courseId: input.courseId,
				learnerEmail: input.learnerEmail,
				justification: input.justification,
				status: 'pending',
				createdAt: now,
				updatedAt: now,
				statusHistory: [
					{
						fromStatus: null,
						toStatus: 'pending',
						changedAt: now,
						changedBy: 'system',
						reason: null,
					},
				],
			};
			return await enrollmentRequests.save(created);
		},
		async getById(id: string): Promise<EnrollmentRequest> {
			return await findRequest(enrollmentRequests, id);
		},
		async list(query: RawQuery): Promise<EnrollmentList> {
			const filters = parseListQuery(query);
			const all = await enrollmentRequests.list();
			const items = all.filter((request) => matchesFilter(request, filters)).sort(compareRequests);
			return { items };
		},
		async updateStatus(id: string, body: unknown): Promise<EnrollmentRequest> {
			const change = parseStatusChange(body);
			const current = await findRequest(enrollmentRequests, id);
			if (!canTransition(current.status, change.status)) {
				const message = `Cannot change status from ${current.status} to ${change.status}.`;
				throw new ApplicationError('INVALID_STATUS_TRANSITION', message, [{ field: 'status', message }]);
			}
			const now = clock.now();
			const updated: EnrollmentRequest = {
				...current,
				status: change.status,
				updatedAt: now,
				statusHistory: [
					...current.statusHistory,
					{
						fromStatus: current.status,
						toStatus: change.status,
						changedAt: now,
						changedBy: change.changedBy,
						reason: change.reason,
					},
				],
			};
			return await enrollmentRequests.save(updated);
		},
	};
}

interface CreateInput {
	courseId: string;
	learnerEmail: string;
	justification: string;
}

interface ListFilters {
	status?: EnrollmentStatus;
	courseId?: string;
	learnerEmail?: string;
}

function parseCreate(body: unknown): CreateInput {
	const details: FieldError[] = [];
	const record = requireRecord(body, details);
	if (record === undefined) {
		throw new ApplicationError('INVALID_REQUEST', INVALID_REQUEST_MESSAGE, details);
	}

	const courseId = readTrimmedRequired(record, 'courseId', details);
	const learnerEmailRaw = readTrimmedRequired(record, 'learnerEmail', details);
	let learnerEmail: string | undefined;
	if (learnerEmailRaw !== undefined) {
		if (!EMAIL_PATTERN.test(learnerEmailRaw)) {
			details.push({ field: 'learnerEmail', message: 'learnerEmail must be a valid email address.' });
		} else {
			learnerEmail = learnerEmailRaw;
		}
	}

	// biome-ignore lint/complexity/useLiteralKeys: Record<string, unknown> is an index signature under noPropertyAccessFromIndexSignature
	const justificationValue = record['justification'];
	let justification: string | undefined;
	if (typeof justificationValue !== 'string') {
		details.push({ field: 'justification', message: 'justification is required.' });
	} else if (justificationValue.length < MIN_JUSTIFICATION_LENGTH || justificationValue.length > MAX_JUSTIFICATION_LENGTH) {
		details.push({ field: 'justification', message: JUSTIFICATION_MESSAGE });
	} else {
		justification = justificationValue;
	}

	if (details.length > 0 || courseId === undefined || learnerEmail === undefined || justification === undefined) {
		throw new ApplicationError('INVALID_REQUEST', INVALID_REQUEST_MESSAGE, details);
	}
	return { courseId, learnerEmail, justification };
}

function parseStatusChange(body: unknown): StatusChange {
	const details: FieldError[] = [];
	const record = requireRecord(body, details);
	if (record === undefined) {
		throw new ApplicationError('INVALID_REQUEST', INVALID_REQUEST_MESSAGE, details);
	}

	// biome-ignore lint/complexity/useLiteralKeys: Record<string, unknown> is an index signature under noPropertyAccessFromIndexSignature
	const statusValue = record['status'];
	let status: EnrollmentStatus | undefined;
	if (typeof statusValue !== 'string' || !isEnrollmentStatus(statusValue)) {
		details.push({ field: 'status', message: 'status must be one of pending, approved, rejected, or cancelled.' });
	} else {
		status = statusValue;
	}

	const changedBy = readTrimmedRequired(record, 'changedBy', details);
	const reason = readReason(record, status, details);
	if (details.length > 0 || status === undefined || changedBy === undefined) {
		throw new ApplicationError('INVALID_REQUEST', INVALID_REQUEST_MESSAGE, details);
	}
	return { status, changedBy, reason };
}

function parseListQuery(query: RawQuery): ListFilters {
	const details: FieldError[] = [];
	for (const field of Object.keys(query)) {
		if (!LIST_FIELDS.has(field)) {
			details.push({ field, message: `${field} is not a supported query parameter.` });
		}
	}
	const statusRaw = readSingle(query, 'status', details);
	const courseIdRaw = readSingle(query, 'courseId', details);
	const learnerEmailRaw = readSingle(query, 'learnerEmail', details);

	let status: EnrollmentStatus | undefined;
	if (statusRaw !== undefined) {
		if (!isEnrollmentStatus(statusRaw)) {
			details.push({ field: 'status', message: 'status must be one of pending, approved, rejected, or cancelled.' });
		} else {
			status = statusRaw;
		}
	}

	let courseId: string | undefined;
	if (courseIdRaw !== undefined) {
		const trimmed = courseIdRaw.trim();
		if (trimmed.length === 0) {
			details.push({ field: 'courseId', message: 'courseId must be a non-empty string.' });
		} else {
			courseId = trimmed;
		}
	}

	let learnerEmail: string | undefined;
	if (learnerEmailRaw !== undefined) {
		const trimmed = learnerEmailRaw.trim();
		if (trimmed.length === 0) {
			details.push({ field: 'learnerEmail', message: 'learnerEmail must be a non-empty string.' });
		} else {
			learnerEmail = trimmed;
		}
	}

	if (details.length > 0) {
		throw new ApplicationError('INVALID_REQUEST', INVALID_REQUEST_MESSAGE, details);
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

function readReason(record: Record<string, unknown>, status: EnrollmentStatus | undefined, details: FieldError[]): string | null {
	// biome-ignore lint/complexity/useLiteralKeys: Record<string, unknown> is an index signature under noPropertyAccessFromIndexSignature
	const value = record['reason'];
	if (status === 'rejected') {
		if (typeof value !== 'string' || value.trim().length === 0) {
			details.push({ field: 'reason', message: 'reason is required when rejecting an enrollment request.' });
			return null;
		}
		return value.trim();
	}
	if (value === undefined || value === null) {
		return null;
	}
	if (typeof value !== 'string') {
		details.push({ field: 'reason', message: 'reason must be a string.' });
		return null;
	}
	const trimmed = value.trim();
	return trimmed.length === 0 ? null : trimmed;
}

function requireRecord(body: unknown, details: FieldError[]): Record<string, unknown> | undefined {
	if (!isRecord(body)) {
		details.push({ field: 'body', message: 'Request body must be a JSON object.' });
		return undefined;
	}
	return body;
}

function isRecord(body: unknown): body is Record<string, unknown> {
	return typeof body === 'object' && body !== null && !Array.isArray(body);
}

function readTrimmedRequired(record: Record<string, unknown>, field: string, details: FieldError[]): string | undefined {
	const value = record[field];
	if (typeof value !== 'string' || value.trim().length === 0) {
		details.push({ field, message: `${field} is required.` });
		return undefined;
	}
	return value.trim();
}

async function findCourse(courses: CourseRepository, courseId: string) {
	try {
		return await courses.get(courseId);
	} catch (error) {
		if (error instanceof EntityNotFoundError) {
			throw new ApplicationError('COURSE_NOT_FOUND', 'The course does not exist.', [{ field: 'courseId', message: 'The course does not exist.' }]);
		}
		throw error;
	}
}

async function findRequest(enrollmentRequests: EnrollmentRequestRepository, id: string): Promise<EnrollmentRequest> {
	try {
		return await enrollmentRequests.get(id);
	} catch (error) {
		if (error instanceof EntityNotFoundError) {
			throw new ApplicationError('ENROLLMENT_REQUEST_NOT_FOUND', 'The enrollment request does not exist.', [{ field: 'id', message: 'The enrollment request does not exist.' }]);
		}
		throw error;
	}
}

function isDuplicateActiveRequest(request: EnrollmentRequest, courseId: string, learnerEmail: string): boolean {
	return request.courseId === courseId && request.learnerEmail.toLowerCase() === learnerEmail.toLowerCase() && isActiveEnrollmentStatus(request.status);
}

function matchesFilter(request: EnrollmentRequest, filters: ListFilters): boolean {
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

function compareRequests(left: EnrollmentRequest, right: EnrollmentRequest): number {
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
