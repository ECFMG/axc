const ENROLLMENT_STATUSES = ['pending', 'approved', 'rejected', 'cancelled'] as const;

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
	statusHistory: readonly StatusHistoryEntry[];
}

const ALLOWED_TRANSITIONS: Readonly<Record<EnrollmentStatus, readonly EnrollmentStatus[]>> = {
	pending: ['approved', 'rejected', 'cancelled'],
	approved: ['cancelled'],
	rejected: [],
	cancelled: [],
};

export function isEnrollmentStatus(value: string): value is EnrollmentStatus {
	return (ENROLLMENT_STATUSES as readonly string[]).includes(value);
}

export function isActiveEnrollmentStatus(status: EnrollmentStatus): boolean {
	return status === 'pending' || status === 'approved';
}

export function canTransition(from: EnrollmentStatus, to: EnrollmentStatus): boolean {
	return ALLOWED_TRANSITIONS[from].includes(to);
}

export class EntityNotFoundError extends Error {
	readonly entity: 'course' | 'enrollment-request';
	readonly entityId: string;

	constructor(entity: 'course' | 'enrollment-request', entityId: string) {
		super(`${entity} ${entityId} was not found`);
		this.name = 'EntityNotFoundError';
		this.entity = entity;
		this.entityId = entityId;
	}
}
