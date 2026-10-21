import { courses } from './courses.ts';

export const enrollmentStatuses = ['pending', 'approved', 'rejected', 'cancelled'] as const;
export type EnrollmentStatus = (typeof enrollmentStatuses)[number];
export interface StatusHistoryEntry {
	fromStatus: EnrollmentStatus | null;
	toStatus: EnrollmentStatus;
	changedAt: string;
	changedBy: string;
	reason: string | null;
}
export interface EnrollmentRequest {
	id: string;
	courseId: string;
	learnerEmail: string;
	justification: string;
	status: EnrollmentStatus;
	createdAt: string;
	updatedAt: string;
	statusHistory: StatusHistoryEntry[];
}
export interface EnrollmentFilters {
	status?: EnrollmentStatus;
	courseId?: string;
	learnerEmail?: string;
}
export interface RequestIssue {
	field: string;
	message: string;
}
export class EnrollmentError extends Error {
	readonly status: 400 | 404 | 409;
	readonly code: string;
	readonly details: RequestIssue[];
	constructor(status: 400 | 404 | 409, code: string, message: string, details: RequestIssue[] = []) {
		super(message);
		this.status = status;
		this.code = code;
		this.details = details;
	}
}
function invalid(field: string, message: string): never {
	throw new EnrollmentError(400, 'INVALID_REQUEST', 'The request could not be completed.', [{ field, message }]);
}
type InputFields = Partial<Record<'courseId' | 'learnerEmail' | 'justification' | 'status' | 'changedBy' | 'reason', unknown>>;
function object(value: unknown): InputFields {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return invalid('body', 'body must be a JSON object.');
	return value as InputFields;
}
function text(value: unknown, field: string): string {
	if (typeof value !== 'string' || !value.trim()) return invalid(field, `${field} must be a non-empty string.`);
	return value.trim();
}
function email(value: unknown): string {
	const result = text(value, 'learnerEmail').toLowerCase();
	if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result)) return invalid('learnerEmail', 'learnerEmail must be a valid email address.');
	return result;
}
function status(value: unknown): EnrollmentStatus {
	if (!enrollmentStatuses.includes(value as EnrollmentStatus)) return invalid('status', `status must be one of: ${enrollmentStatuses.join(', ')}.`);
	return value as EnrollmentStatus;
}
const transitions: Record<EnrollmentStatus, readonly EnrollmentStatus[]> = {
	pending: ['approved', 'rejected', 'cancelled'],
	approved: ['cancelled'],
	rejected: [],
	cancelled: [],
};

/** A factory owns one sample repository, shared across its request-scoped service objects.
 * Operations are synchronous: duplicate checks and writes cannot interleave in this process.
 * Clone at the boundary so callers cannot mutate persisted state or its audit trail.
 */
export function createEnrollmentService() {
	const records = new Map<string, EnrollmentRequest>();
	function get(id: string): EnrollmentRequest {
		const found = records.get(id);
		if (!found) throw new EnrollmentError(404, 'ENROLLMENT_REQUEST_NOT_FOUND', 'Enrollment request was not found.');
		return structuredClone(found);
	}
	return {
		create(input: unknown): EnrollmentRequest {
			const body = object(input);
			const courseId = text(body.courseId, 'courseId');
			const learnerEmail = email(body.learnerEmail);
			const justification = text(body.justification, 'justification');
			if (justification.length < 20 || justification.length > 500) return invalid('justification', 'justification must be between 20 and 500 characters.');
			const course = courses.find((item) => item.id === courseId);
			if (!course) throw new EnrollmentError(404, 'COURSE_NOT_FOUND', 'Course was not found.');
			if (course.status !== 'active') throw new EnrollmentError(409, 'COURSE_NOT_ACTIVE', 'Course must be active.');
			if ([...records.values()].some((item) => item.courseId === courseId && item.learnerEmail === learnerEmail && (item.status === 'pending' || item.status === 'approved'))) {
				throw new EnrollmentError(409, 'DUPLICATE_ACTIVE_REQUEST', 'An active request already exists for this learner and course.');
			}
			const now = new Date().toISOString();
			const request: EnrollmentRequest = {
				id: `enroll-${crypto.randomUUID()}`,
				courseId,
				learnerEmail,
				justification,
				status: 'pending',
				createdAt: now,
				updatedAt: now,
				statusHistory: [{ fromStatus: null, toStatus: 'pending', changedAt: now, changedBy: 'system', reason: null }],
			};
			records.set(request.id, request);
			return structuredClone(request);
		},
		get,
		list(input: InputFields = {}): EnrollmentRequest[] {
			const filters: EnrollmentFilters = {};
			if (input.status !== undefined) filters.status = status(input.status);
			if (input.courseId !== undefined) filters.courseId = text(input.courseId, 'courseId');
			if (input.learnerEmail !== undefined) filters.learnerEmail = email(input.learnerEmail);
			return structuredClone(
				[...records.values()].filter(
					(item) => (!filters.status || item.status === filters.status) && (!filters.courseId || item.courseId === filters.courseId) && (!filters.learnerEmail || item.learnerEmail === filters.learnerEmail),
				),
			);
		},
		changeStatus(id: string, input: unknown): EnrollmentRequest {
			const body = object(input);
			const next = status(body.status);
			const changedBy = text(body.changedBy, 'changedBy');
			const reason = body.reason === undefined || body.reason === null ? null : text(body.reason, 'reason');
			if (next === 'rejected' && !reason) return invalid('reason', 'reason is required for rejection.');
			const request = get(id);
			if (!transitions[request.status].includes(next)) throw new EnrollmentError(409, 'INVALID_STATUS_TRANSITION', `Cannot transition from ${request.status} to ${next}.`);
			const now = new Date().toISOString();
			request.statusHistory.push({ fromStatus: request.status, toStatus: next, changedAt: now, changedBy, reason });
			request.status = next;
			request.updatedAt = now;
			records.set(id, request);
			return structuredClone(request);
		},
	};
}
export type EnrollmentService = ReturnType<typeof createEnrollmentService>;
