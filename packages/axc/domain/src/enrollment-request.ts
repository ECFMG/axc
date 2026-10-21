export const enrollmentRequestStatuses = ['pending', 'approved', 'rejected', 'cancelled'] as const;
export type EnrollmentRequestStatus = (typeof enrollmentRequestStatuses)[number];

/** Status values a reviewer can send to the status endpoint. */
export const enrollmentStatusUpdateTargets = ['approved', 'rejected', 'cancelled'] as const;
export type EnrollmentStatusUpdateTarget = (typeof enrollmentStatusUpdateTargets)[number];

export const JUSTIFICATION_MIN_LENGTH = 20;
export const JUSTIFICATION_MAX_LENGTH = 500;

const ACTIVE_REQUEST_STATUSES = ['pending', 'approved'] as const;
const LEARNER_EMAIL_PATTERN = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

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
	statusHistory: readonly StatusHistoryEntry[];
}

/** Domain port for enrollment request storage. Persistence supplies the in-memory implementation. */
export interface EnrollmentRequestStore {
	list(): readonly EnrollmentRequest[];
	findById(id: string): EnrollmentRequest | undefined;
	nextId(): string;
	insert(request: EnrollmentRequest): EnrollmentRequest;
	update(request: EnrollmentRequest): EnrollmentRequest;
}

const allowedTransitions: Readonly<Record<EnrollmentRequestStatus, readonly EnrollmentStatusUpdateTarget[]>> = {
	pending: ['approved', 'rejected', 'cancelled'],
	approved: ['cancelled'],
	rejected: [],
	cancelled: [],
};

export function isEnrollmentRequestStatus(value: string): value is EnrollmentRequestStatus {
	return enrollmentRequestStatuses.some((status) => status === value);
}

export function isEnrollmentStatusUpdateTarget(value: string): value is EnrollmentStatusUpdateTarget {
	return enrollmentStatusUpdateTargets.some((status) => status === value);
}

export function isValidLearnerEmail(value: string): boolean {
	return LEARNER_EMAIL_PATTERN.test(value);
}

export function hasActiveEnrollmentRequest(requests: readonly EnrollmentRequest[], courseId: string, learnerEmail: string): boolean {
	const email = normalizeEmail(learnerEmail);
	return requests.some((request) => request.courseId === courseId && normalizeEmail(request.learnerEmail) === email && isActiveStatus(request.status));
}

export function canTransitionEnrollmentRequest(fromStatus: EnrollmentRequestStatus, toStatus: EnrollmentStatusUpdateTarget): boolean {
	return allowedTransitions[fromStatus].some((status) => status === toStatus);
}

export function createPendingEnrollmentRequest(input: { id: string; courseId: string; learnerEmail: string; justification: string; changedAt: string }): EnrollmentRequest {
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
				changedBy: 'system',
				reason: null,
			},
		],
	};
}

export function transitionEnrollmentRequest(request: EnrollmentRequest, change: { toStatus: EnrollmentStatusUpdateTarget; changedBy: string; reason: string | null; changedAt: string }): EnrollmentRequest {
	return {
		id: request.id,
		courseId: request.courseId,
		learnerEmail: request.learnerEmail,
		justification: request.justification,
		status: change.toStatus,
		createdAt: request.createdAt,
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

function isActiveStatus(status: EnrollmentRequestStatus): boolean {
	return ACTIVE_REQUEST_STATUSES.some((active) => active === status);
}

function normalizeEmail(email: string): string {
	return email.trim().toLocaleLowerCase('en-US');
}
