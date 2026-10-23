const ENROLLMENT_STATUSES = ['pending', 'approved', 'rejected', 'cancelled'] as const;

/** Statuses that block another request for the same learner and course. */
const ACTIVE_REQUEST_STATUSES = ['pending', 'approved'] as const;

const JUSTIFICATION_MIN_LENGTH = 20;
const JUSTIFICATION_MAX_LENGTH = 500;

/** Actor recorded when the system creates a request. */
const SYSTEM_ACTOR = 'system';

export type EnrollmentStatus = (typeof ENROLLMENT_STATUSES)[number];

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

const ALLOWED_TRANSITIONS: Record<EnrollmentStatus, readonly EnrollmentStatus[]> = {
	pending: ['approved', 'rejected', 'cancelled'],
	approved: ['cancelled'],
	rejected: [],
	cancelled: [],
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;

export function isEnrollmentStatus(value: string): value is EnrollmentStatus {
	return (ENROLLMENT_STATUSES as readonly string[]).includes(value);
}

export function isActiveEnrollmentStatus(status: EnrollmentStatus): boolean {
	return (ACTIVE_REQUEST_STATUSES as readonly EnrollmentStatus[]).includes(status);
}

export function isValidEmail(value: string): boolean {
	return EMAIL_PATTERN.test(value);
}

export function isValidJustification(value: string): boolean {
	return value.length >= JUSTIFICATION_MIN_LENGTH && value.length <= JUSTIFICATION_MAX_LENGTH;
}

export function canTransition(fromStatus: EnrollmentStatus, toStatus: EnrollmentStatus): boolean {
	return ALLOWED_TRANSITIONS[fromStatus].includes(toStatus);
}

export function newEnrollmentRequest(input: { id: string; courseId: string; learnerEmail: string; justification: string; changedAt: string }): EnrollmentRequest {
	return {
		id: input.id,
		courseId: input.courseId,
		learnerEmail: input.learnerEmail,
		justification: input.justification,
		status: 'pending',
		createdAt: input.changedAt,
		updatedAt: input.changedAt,
		statusHistory: [
			{
				fromStatus: null,
				toStatus: 'pending',
				changedAt: input.changedAt,
				changedBy: SYSTEM_ACTOR,
				reason: null,
			},
		],
	};
}

export function applyStatusChange(request: EnrollmentRequest, change: { toStatus: EnrollmentStatus; changedAt: string; changedBy: string; reason: string | null }): EnrollmentRequest {
	return {
		...request,
		status: change.toStatus,
		updatedAt: change.changedAt,
		statusHistory: [
			...request.statusHistory,
			{
				fromStatus: request.status,
				toStatus: change.toStatus,
				changedAt: change.changedAt,
				changedBy: change.changedBy,
				reason: change.reason,
			},
		],
	};
}
