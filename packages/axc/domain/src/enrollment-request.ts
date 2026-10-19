import type { Course } from './course.ts';

export const ENROLLMENT_REQUEST_STATUSES = ['pending', 'approved', 'rejected', 'cancelled'] as const;
export type EnrollmentRequestStatus = (typeof ENROLLMENT_REQUEST_STATUSES)[number];

export const JUSTIFICATION_MIN_LENGTH = 20;
export const JUSTIFICATION_MAX_LENGTH = 500;

const MAX_LEARNER_EMAIL_LENGTH = 254;
const LEARNER_EMAIL_PATTERN = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
const ACTIVE_REQUEST_STATUSES = new Set<EnrollmentRequestStatus>(['pending', 'approved']);
const ALLOWED_TRANSITIONS: Readonly<Record<EnrollmentRequestStatus, readonly EnrollmentRequestStatus[]>> = {
	pending: ['approved', 'rejected', 'cancelled'],
	approved: ['cancelled'],
	rejected: [],
	cancelled: [],
};

export interface StatusHistoryEntry {
	readonly fromStatus: EnrollmentRequestStatus | null;
	readonly toStatus: EnrollmentRequestStatus;
	readonly changedAt: string;
	readonly changedBy: string;
	readonly reason: string | null;
}

export interface EnrollmentRequest {
	readonly id: string;
	readonly courseId: string;
	readonly learnerEmail: string;
	readonly justification: string;
	readonly status: EnrollmentRequestStatus;
	readonly createdAt: string;
	readonly updatedAt: string;
	readonly statusHistory: readonly StatusHistoryEntry[];
}

export interface EnrollmentRequestFilter {
	readonly status?: EnrollmentRequestStatus;
	readonly courseId?: string;
	readonly learnerEmail?: string;
}

export interface EnrollmentStatusChange {
	readonly status: EnrollmentRequestStatus;
	readonly changedBy: string;
	readonly reason: string | null;
	readonly changedAt: string;
}

export interface NewEnrollmentRequest {
	readonly id: string;
	readonly courseId: string;
	readonly learnerEmail: string;
	readonly justification: string;
	readonly changedAt: string;
}

/** In-memory enrollment request store. Callers own lifecycle; the domain does not persist. */
export interface EnrollmentRequestRepository {
	list(): readonly EnrollmentRequest[];
	findById(id: string): EnrollmentRequest | undefined;
	insert(request: EnrollmentRequest): void;
	replace(request: EnrollmentRequest): void;
	nextId(): string;
}

export function courseAcceptsEnrollment(course: Course): boolean {
	return course.status === 'active';
}

export function isEnrollmentRequestStatus(value: string): value is EnrollmentRequestStatus {
	for (const status of ENROLLMENT_REQUEST_STATUSES) {
		if (status === value) {
			return true;
		}
	}
	return false;
}

export function normalizeLearnerEmail(value: string): string | undefined {
	const email = value.trim();
	if (email.length === 0 || email.length > MAX_LEARNER_EMAIL_LENGTH || !LEARNER_EMAIL_PATTERN.test(email)) {
		return undefined;
	}
	return email;
}

export function normalizeJustification(value: string): string | undefined {
	const justification = value.trim();
	const length = Array.from(justification).length;
	if (length < JUSTIFICATION_MIN_LENGTH || length > JUSTIFICATION_MAX_LENGTH) {
		return undefined;
	}
	return justification;
}

export function findActiveEnrollmentRequest(requests: readonly EnrollmentRequest[], courseId: string, learnerEmail: string): EnrollmentRequest | undefined {
	const email = learnerEmail.trim().toLocaleLowerCase('en');
	return requests.find((request) => ACTIVE_REQUEST_STATUSES.has(request.status) && request.courseId === courseId && sameLearner(request.learnerEmail, email));
}

export function filterEnrollmentRequests(requests: readonly EnrollmentRequest[], filter: EnrollmentRequestFilter): readonly EnrollmentRequest[] {
	const email = filter.learnerEmail?.trim().toLocaleLowerCase('en');
	return requests.filter((request) => {
		if (filter.status !== undefined && request.status !== filter.status) {
			return false;
		}
		if (filter.courseId !== undefined && request.courseId !== filter.courseId) {
			return false;
		}
		if (email !== undefined && !sameLearner(request.learnerEmail, email)) {
			return false;
		}
		return true;
	});
}

export function createPendingEnrollmentRequest(input: NewEnrollmentRequest): EnrollmentRequest {
	const entry: StatusHistoryEntry = {
		fromStatus: null,
		toStatus: 'pending',
		changedAt: input.changedAt,
		changedBy: 'system',
		reason: null,
	};
	return {
		id: input.id,
		courseId: input.courseId,
		learnerEmail: input.learnerEmail,
		justification: input.justification,
		status: 'pending',
		createdAt: input.changedAt,
		updatedAt: input.changedAt,
		statusHistory: [entry],
	};
}

export function transitionEnrollmentRequest(request: EnrollmentRequest, change: EnrollmentStatusChange): EnrollmentRequest | undefined {
	const allowed = ALLOWED_TRANSITIONS[request.status];
	if (!allowed.includes(change.status)) {
		return undefined;
	}
	const entry: StatusHistoryEntry = {
		fromStatus: request.status,
		toStatus: change.status,
		changedAt: change.changedAt,
		changedBy: change.changedBy,
		reason: change.reason,
	};
	return {
		id: request.id,
		courseId: request.courseId,
		learnerEmail: request.learnerEmail,
		justification: request.justification,
		status: change.status,
		createdAt: request.createdAt,
		updatedAt: change.changedAt,
		statusHistory: [...request.statusHistory, entry],
	};
}

function sameLearner(storedEmail: string, normalizedFilterEmail: string): boolean {
	return storedEmail.trim().toLocaleLowerCase('en') === normalizedFilterEmail;
}
