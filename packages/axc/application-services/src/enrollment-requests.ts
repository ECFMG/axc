import {
	type CourseRepository,
	canTransitionEnrollment,
	type EnrollmentRequest,
	type EnrollmentRequestRepository,
	type EnrollmentStatus,
	isEnrollmentStatus,
	isOpenEnrollment,
	justificationError,
	normalizeLearnerEmail,
} from '@axc/domain';
import { type AppResult, type FieldError, fail } from './result.ts';

const invalidRequestMessage = 'The request could not be completed.';

export interface EnrollmentRequestServices {
	create(input: unknown): Promise<AppResult<EnrollmentRequest>>;
	getById(id: string): Promise<AppResult<EnrollmentRequest>>;
	list(query: Record<string, string | undefined>): Promise<AppResult<{ items: EnrollmentRequest[] }>>;
	updateStatus(id: string, input: unknown): Promise<AppResult<EnrollmentRequest>>;
}

export function createEnrollmentRequestServices(courses: CourseRepository, enrollmentRequests: EnrollmentRequestRepository, now: () => string, nextId: () => string): EnrollmentRequestServices {
	return {
		async create(input: unknown) {
			const parsed = parseCreate(input);
			if (!parsed.ok) {
				return parsed;
			}
			const course = await courses.getById(parsed.value.courseId);
			if (course === undefined) {
				return fail('COURSE_NOT_FOUND', 'The course does not exist.');
			}
			if (course.status !== 'active') {
				return fail('COURSE_NOT_ACTIVE', 'The course is not active.');
			}
			const duplicate = (await enrollmentRequests.list()).some((request) => request.courseId === parsed.value.courseId && request.learnerEmail === parsed.value.learnerEmail && isOpenEnrollment(request.status));
			if (duplicate) {
				return fail('DUPLICATE_ACTIVE_REQUEST', 'This learner already has a pending or approved request for the course.');
			}
			const timestamp = now();
			const request: EnrollmentRequest = {
				id: nextId(),
				courseId: parsed.value.courseId,
				learnerEmail: parsed.value.learnerEmail,
				justification: parsed.value.justification,
				status: 'pending',
				createdAt: timestamp,
				updatedAt: timestamp,
				statusHistory: [{ fromStatus: null, toStatus: 'pending', changedAt: timestamp, changedBy: 'system', reason: null }],
			};
			await enrollmentRequests.add(request);
			return { ok: true, value: request };
		},
		async getById(id: string) {
			const request = await enrollmentRequests.getById(id);
			return request === undefined ? fail('ENROLLMENT_REQUEST_NOT_FOUND', 'The enrollment request does not exist.') : { ok: true, value: request };
		},
		async list(query: Record<string, string | undefined>) {
			const parsed = parseList(query);
			if (!parsed.ok) {
				return parsed;
			}
			const items = (await enrollmentRequests.list()).filter((request) => matchesFilter(request, parsed.value));
			items.sort((left, right) => left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id));
			return { ok: true, value: { items } };
		},
		async updateStatus(id: string, input: unknown) {
			const parsed = parseStatusUpdate(input);
			if (!parsed.ok) {
				return parsed;
			}
			const current = await enrollmentRequests.getById(id);
			if (current === undefined) {
				return fail('ENROLLMENT_REQUEST_NOT_FOUND', 'The enrollment request does not exist.');
			}
			if (!canTransitionEnrollment(current.status, parsed.value.status)) {
				return fail('INVALID_STATUS_TRANSITION', 'The status transition is not allowed.');
			}
			const changedAt = now();
			const updated: EnrollmentRequest = {
				...current,
				status: parsed.value.status,
				updatedAt: changedAt,
				statusHistory: [...current.statusHistory, { fromStatus: current.status, toStatus: parsed.value.status, changedAt, changedBy: parsed.value.changedBy, reason: parsed.value.reason }],
			};
			await enrollmentRequests.save(updated);
			return { ok: true, value: updated };
		},
	};
}

interface EnrollmentFilters {
	status?: EnrollmentStatus;
	courseId?: string;
	learnerEmail?: string;
}

function matchesFilter(request: EnrollmentRequest, filters: EnrollmentFilters): boolean {
	if (filters.status !== undefined && request.status !== filters.status) {
		return false;
	}
	if (filters.courseId !== undefined && request.courseId !== filters.courseId) {
		return false;
	}
	if (filters.learnerEmail !== undefined && request.learnerEmail !== filters.learnerEmail) {
		return false;
	}
	return true;
}

function parseCreate(input: unknown): AppResult<{ courseId: string; learnerEmail: string; justification: string }> {
	if (!isRecord(input)) {
		return fail('INVALID_REQUEST', invalidRequestMessage, [{ field: 'body', message: 'Request body must be a JSON object.' }]);
	}
	const details: FieldError[] = [];
	const courseId = readRequiredString(input['courseId'], 'courseId', 'courseId is required.', details);
	const learnerEmail = readEmail(input['learnerEmail'], details);
	const justification = readJustification(input['justification'], details);
	if (courseId === undefined || learnerEmail === undefined || justification === undefined) {
		return fail('INVALID_REQUEST', invalidRequestMessage, details);
	}
	return { ok: true, value: { courseId, learnerEmail, justification } };
}

function parseList(query: Record<string, string | undefined>): AppResult<EnrollmentFilters> {
	const details: FieldError[] = [];
	const filters: EnrollmentFilters = {};
	const statusValue = query['status'];
	if (statusValue !== undefined) {
		const candidate = statusValue.trim();
		if (!isEnrollmentStatus(candidate)) {
			details.push({ field: 'status', message: 'status must be pending, approved, rejected, or cancelled.' });
		} else {
			filters.status = candidate;
		}
	}
	const courseId = blankToUndefined(query['courseId']);
	const learnerEmail = blankToUndefined(query['learnerEmail'])?.toLowerCase();
	if (courseId !== undefined) {
		filters.courseId = courseId;
	}
	if (learnerEmail !== undefined) {
		filters.learnerEmail = learnerEmail;
	}
	return details.length > 0 ? fail('INVALID_REQUEST', invalidRequestMessage, details) : { ok: true, value: filters };
}

function parseStatusUpdate(input: unknown): AppResult<{ status: EnrollmentStatus; changedBy: string; reason: string | null }> {
	if (!isRecord(input)) {
		return fail('INVALID_REQUEST', invalidRequestMessage, [{ field: 'body', message: 'Request body must be a JSON object.' }]);
	}
	const details: FieldError[] = [];
	const statusValue = input['status'];
	const status = typeof statusValue === 'string' && isEnrollmentStatus(statusValue) ? statusValue : undefined;
	if (status === undefined) {
		details.push({ field: 'status', message: 'status must be pending, approved, rejected, or cancelled.' });
	}
	const changedBy = readRequiredString(input['changedBy'], 'changedBy', 'changedBy is required.', details);
	const reason = readReason(input['reason'], status, details);
	if (status === undefined || changedBy === undefined || reason === undefined) {
		return fail('INVALID_REQUEST', invalidRequestMessage, details);
	}
	return { ok: true, value: { status, changedBy, reason } };
}

function readReason(value: unknown, status: EnrollmentStatus | undefined, details: FieldError[]): string | null | undefined {
	if (status === 'rejected') {
		if (typeof value !== 'string' || value.trim() === '') {
			details.push({ field: 'reason', message: 'reason is required when rejecting a request.' });
			return undefined;
		}
		return value.trim();
	}
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

function readEmail(value: unknown, details: FieldError[]): string | undefined {
	const email = typeof value === 'string' ? normalizeLearnerEmail(value) : undefined;
	if (email === undefined) {
		details.push({ field: 'learnerEmail', message: 'learnerEmail must be a valid email address.' });
	}
	return email;
}

function readJustification(value: unknown, details: FieldError[]): string | undefined {
	if (typeof value !== 'string') {
		details.push({ field: 'justification', message: 'justification must be between 20 and 500 characters.' });
		return undefined;
	}
	const message = justificationError(value);
	if (message !== undefined) {
		details.push({ field: 'justification', message });
		return undefined;
	}
	return value;
}

function readRequiredString(value: unknown, field: string, message: string, details: FieldError[]): string | undefined {
	if (typeof value !== 'string' || value.trim() === '') {
		details.push({ field, message });
		return undefined;
	}
	return value.trim();
}

function blankToUndefined(value: string | undefined): string | undefined {
	if (value === undefined) {
		return undefined;
	}
	const text = value.trim();
	return text === '' ? undefined : text;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}
