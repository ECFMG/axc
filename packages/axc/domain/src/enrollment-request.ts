export const ENROLLMENT_STATUSES = ['pending', 'approved', 'rejected', 'cancelled'] as const;
export type EnrollmentStatus = (typeof ENROLLMENT_STATUSES)[number];

export const ENROLLMENT_CREATED_BY = 'system';
export const JUSTIFICATION_MIN_LENGTH = 20;
export const JUSTIFICATION_MAX_LENGTH = 500;

const ACTIVE_REQUEST_STATUSES = ['pending', 'approved'] as const satisfies readonly EnrollmentStatus[];

const ALLOWED_TRANSITIONS: Record<EnrollmentStatus, readonly EnrollmentStatus[]> = {
	pending: ['approved', 'rejected', 'cancelled'],
	approved: ['cancelled'],
	rejected: [],
	cancelled: [],
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;

export interface StatusHistoryEntry {
	readonly fromStatus: EnrollmentStatus | null;
	readonly toStatus: EnrollmentStatus;
	readonly changedAt: string;
	readonly changedBy: string;
	readonly reason: string | null;
}

export interface EnrollmentRequest {
	readonly id: string;
	readonly courseId: string;
	readonly learnerEmail: string;
	readonly justification: string;
	readonly status: EnrollmentStatus;
	readonly createdAt: string;
	readonly updatedAt: string;
	readonly statusHistory: readonly StatusHistoryEntry[];
}

export function isEnrollmentStatus(value: string): value is EnrollmentStatus {
	return (ENROLLMENT_STATUSES as readonly string[]).includes(value);
}

export function isActiveEnrollmentStatus(status: EnrollmentStatus): boolean {
	return (ACTIVE_REQUEST_STATUSES as readonly string[]).includes(status);
}

export function canTransitionEnrollmentStatus(fromStatus: EnrollmentStatus, toStatus: EnrollmentStatus): boolean {
	return ALLOWED_TRANSITIONS[fromStatus].includes(toStatus);
}

/** Trims and lowercases a learner email. Returns null when the format is invalid. */
export function normalizeLearnerEmail(value: string): string | null {
	const normalized = value.trim().toLowerCase();
	if (!EMAIL_PATTERN.test(normalized)) {
		return null;
	}
	return normalized;
}

export function isValidJustification(value: string): boolean {
	return value.length >= JUSTIFICATION_MIN_LENGTH && value.length <= JUSTIFICATION_MAX_LENGTH;
}

export function copyEnrollmentRequest(request: EnrollmentRequest): EnrollmentRequest {
	return {
		id: request.id,
		courseId: request.courseId,
		learnerEmail: request.learnerEmail,
		justification: request.justification,
		status: request.status,
		createdAt: request.createdAt,
		updatedAt: request.updatedAt,
		statusHistory: request.statusHistory.map((entry) => ({
			fromStatus: entry.fromStatus,
			toStatus: entry.toStatus,
			changedAt: entry.changedAt,
			changedBy: entry.changedBy,
			reason: entry.reason,
		})),
	};
}
