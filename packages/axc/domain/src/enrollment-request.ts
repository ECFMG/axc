export const ENROLLMENT_REQUEST_STATUSES = ['pending', 'approved', 'rejected', 'cancelled'] as const;
export type EnrollmentRequestStatus = (typeof ENROLLMENT_REQUEST_STATUSES)[number];

export const ACTIVE_ENROLLMENT_REQUEST_STATUSES = ['pending', 'approved'] as const;
export type ActiveEnrollmentRequestStatus = (typeof ACTIVE_ENROLLMENT_REQUEST_STATUSES)[number];

export const ENROLLMENT_STATUS_TRANSITIONS: Record<EnrollmentRequestStatus, readonly EnrollmentRequestStatus[]> = {
	pending: ['approved', 'rejected', 'cancelled'],
	approved: ['cancelled'],
	rejected: [],
	cancelled: [],
};

export interface StatusHistoryEntry {
	fromStatus: EnrollmentRequestStatus | null;
	toStatus: EnrollmentRequestStatus;
	changedAt: string;
	changedBy: string;
	reason: string | null;
}

export interface EnrollmentRequest {
	id: string;
	courseId: string;
	learnerEmail: string;
	justification: string;
	status: EnrollmentRequestStatus;
	createdAt: string;
	updatedAt: string;
	statusHistory: StatusHistoryEntry[];
}

export function isEnrollmentRequestStatus(value: string): value is EnrollmentRequestStatus {
	return (ENROLLMENT_REQUEST_STATUSES as readonly string[]).includes(value);
}

export function isActiveEnrollmentRequestStatus(value: EnrollmentRequestStatus): value is ActiveEnrollmentRequestStatus {
	return (ACTIVE_ENROLLMENT_REQUEST_STATUSES as readonly string[]).includes(value);
}

export function canTransitionEnrollmentStatus(fromStatus: EnrollmentRequestStatus, toStatus: EnrollmentRequestStatus): boolean {
	return ENROLLMENT_STATUS_TRANSITIONS[fromStatus].includes(toStatus);
}
