/** Enrollment request entity, its validation rules, status machine and audit trail. */

export const enrollmentStatuses = ['pending', 'approved', 'rejected', 'cancelled'] as const;
export type EnrollmentStatus = (typeof enrollmentStatuses)[number];

/** A learner may hold only one request in one of these statuses per course. */
export const activeEnrollmentStatuses: readonly EnrollmentStatus[] = ['pending', 'approved'];

export const justificationMinLength = 20;
export const justificationMaxLength = 500;

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

const allowedTransitions: Record<EnrollmentStatus, readonly EnrollmentStatus[]> = {
	pending: ['approved', 'rejected', 'cancelled'],
	approved: ['cancelled'],
	rejected: [],
	cancelled: [],
};

export function isValidTransition(from: EnrollmentStatus, to: EnrollmentStatus): boolean {
	return allowedTransitions[from].includes(to);
}

export function isEnrollmentStatus(value: unknown): value is EnrollmentStatus {
	return typeof value === 'string' && (enrollmentStatuses as readonly string[]).includes(value);
}

export function isValidLearnerEmail(value: unknown): value is string {
	return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function isValidJustification(value: unknown): value is string {
	return typeof value === 'string' && value.trim().length >= justificationMinLength && value.trim().length <= justificationMaxLength;
}

export interface NewEnrollmentRequest {
	id: string;
	courseId: string;
	learnerEmail: string;
	justification: string;
	changedBy: string;
	now: string;
}

/** A new request always starts pending with the opening audit entry. */
export function createEnrollmentRequest(input: NewEnrollmentRequest): EnrollmentRequest {
	return {
		id: input.id,
		courseId: input.courseId,
		learnerEmail: input.learnerEmail,
		justification: input.justification,
		status: 'pending',
		createdAt: input.now,
		updatedAt: input.now,
		statusHistory: [{ fromStatus: null, toStatus: 'pending', changedAt: input.now, changedBy: input.changedBy, reason: null }],
	};
}

export interface StatusChange {
	toStatus: EnrollmentStatus;
	changedBy: string;
	reason?: string | undefined;
	now: string;
}

/** Returns a copy carrying the new status and one more audit entry. Caller checks {@link isValidTransition} first. */
export function withStatusChange(request: EnrollmentRequest, change: StatusChange): EnrollmentRequest {
	return {
		...request,
		status: change.toStatus,
		updatedAt: change.now,
		statusHistory: [...request.statusHistory, { fromStatus: request.status, toStatus: change.toStatus, changedAt: change.now, changedBy: change.changedBy, reason: change.reason ?? null }],
	};
}
