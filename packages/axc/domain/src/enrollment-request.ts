export const ENROLLMENT_STATUSES = ['pending', 'approved', 'rejected', 'cancelled'] as const;
export const ENROLLMENT_CREATED_BY = 'system';
export const JUSTIFICATION_MIN_LENGTH = 20;
export const JUSTIFICATION_MAX_LENGTH = 500;

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

export interface EnrollmentRequestRepository {
	getById(id: string): Promise<EnrollmentRequest | undefined>;
	list(): Promise<EnrollmentRequest[]>;
	save(request: EnrollmentRequest): Promise<EnrollmentRequest>;
}

const ENROLLMENT_TRANSITIONS: Record<EnrollmentStatus, readonly EnrollmentStatus[]> = {
	pending: ['approved', 'rejected', 'cancelled'],
	approved: ['cancelled'],
	rejected: [],
	cancelled: [],
};

export function isEnrollmentStatus(value: string): value is EnrollmentStatus {
	return ENROLLMENT_STATUSES.some((candidate) => candidate === value);
}

export function isLearnerEmail(value: string): boolean {
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function isJustificationLength(value: string): boolean {
	return value.length >= JUSTIFICATION_MIN_LENGTH && value.length <= JUSTIFICATION_MAX_LENGTH;
}

export function learnerEmailsMatch(left: string, right: string): boolean {
	return left.toLowerCase() === right.toLowerCase();
}

export function hasActiveEnrollment(requests: readonly EnrollmentRequest[], courseId: string, learnerEmail: string): boolean {
	return requests.some((request) => request.courseId === courseId && learnerEmailsMatch(request.learnerEmail, learnerEmail) && (request.status === 'pending' || request.status === 'approved'));
}

export function canTransitionEnrollmentStatus(from: EnrollmentStatus, to: EnrollmentStatus): boolean {
	return ENROLLMENT_TRANSITIONS[from].includes(to);
}
