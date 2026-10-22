export const enrollmentStatuses = ['pending', 'approved', 'rejected', 'cancelled'] as const;
export type EnrollmentStatus = (typeof enrollmentStatuses)[number];

export const JUSTIFICATION_MIN_LENGTH = 20;
export const JUSTIFICATION_MAX_LENGTH = 500;
export const ENROLLMENT_CREATED_BY = 'system';

const learnerEmailPattern = /^[a-z0-9._%+-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i;

const allowedTransitions: Readonly<Record<EnrollmentStatus, readonly EnrollmentStatus[]>> = {
	pending: ['approved', 'rejected', 'cancelled'],
	approved: ['cancelled'],
	rejected: [],
	cancelled: [],
};

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
	statusHistory: readonly StatusHistoryEntry[];
}

export function isEnrollmentStatus(value: string): value is EnrollmentStatus {
	return enrollmentStatuses.some((item) => item === value);
}

/** Pending and approved requests block another request for the same learner and course. */
export function isBlockingEnrollmentStatus(status: EnrollmentStatus): boolean {
	return status === 'pending' || status === 'approved';
}

export function canTransition(fromStatus: EnrollmentStatus, toStatus: EnrollmentStatus): boolean {
	return allowedTransitions[fromStatus].includes(toStatus);
}

export function isValidLearnerEmail(value: string): boolean {
	if (value.length > 254 || value.includes('..')) {
		return false;
	}
	return learnerEmailPattern.test(value);
}

export function isValidJustification(value: string): boolean {
	const length = Array.from(value).length;
	return length >= JUSTIFICATION_MIN_LENGTH && length <= JUSTIFICATION_MAX_LENGTH;
}
