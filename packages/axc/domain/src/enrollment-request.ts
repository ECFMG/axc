/** Enrollment request model, lifecycle rules, and state transition behaviour. */

import { invalidStatusTransition } from './errors.ts';

/** Lifecycle states an enrollment request can be in. */
export const ENROLLMENT_REQUEST_STATUSES = ['pending', 'approved', 'rejected', 'cancelled'] as const;

/** Lifecycle state of an enrollment request. */
export type EnrollmentRequestStatus = (typeof ENROLLMENT_REQUEST_STATUSES)[number];

/** States that block a learner from opening another request for the same course. */
export const ACTIVE_ENROLLMENT_REQUEST_STATUSES: readonly EnrollmentRequestStatus[] = ['pending', 'approved'];

/** Status an enrollment request is created in. */
export const INITIAL_ENROLLMENT_REQUEST_STATUS: EnrollmentRequestStatus = 'pending';

/** Identifier recorded against the audit entry written when a request is created. */
export const SYSTEM_ACTOR = 'system';

/** Allowed status transitions, keyed by the current status. */
const ALLOWED_TRANSITIONS: Readonly<Record<EnrollmentRequestStatus, readonly EnrollmentRequestStatus[]>> = {
	pending: ['approved', 'rejected', 'cancelled'],
	approved: ['cancelled'],
	rejected: [],
	cancelled: [],
};

/** A single audit entry describing one enrollment request status change. */
export interface StatusHistoryEntry {
	readonly fromStatus: EnrollmentRequestStatus | null;
	readonly toStatus: EnrollmentRequestStatus;
	readonly changedAt: string;
	readonly changedBy: string;
	readonly reason: string | null;
}

/** A learner's request to enroll in a course, with its full audit trail. */
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

/** Validated payload for creating an enrollment request. */
export interface CreateEnrollmentRequestCommand {
	readonly courseId: string;
	readonly learnerEmail: string;
	readonly justification: string;
}

/** Validated payload for changing an enrollment request status. */
export interface ChangeEnrollmentRequestStatusCommand {
	readonly status: EnrollmentRequestStatus;
	readonly changedBy: string;
	readonly reason: string | null;
}

/** Whether a learner holding a request in this status is blocked from opening another. */
export function isActiveEnrollmentStatus(status: EnrollmentRequestStatus): boolean {
	return ACTIVE_ENROLLMENT_REQUEST_STATUSES.includes(status);
}

/** Whether the enrollment request lifecycle permits moving between two statuses. */
export function isValidStatusTransition(fromStatus: EnrollmentRequestStatus, toStatus: EnrollmentRequestStatus): boolean {
	return ALLOWED_TRANSITIONS[fromStatus].includes(toStatus);
}

/** Builds a new pending enrollment request carrying its first audit entry. */
export function createEnrollmentRequest(id: string, command: CreateEnrollmentRequestCommand, now: string): EnrollmentRequest {
	return {
		id,
		courseId: command.courseId,
		learnerEmail: command.learnerEmail,
		justification: command.justification,
		status: INITIAL_ENROLLMENT_REQUEST_STATUS,
		createdAt: now,
		updatedAt: now,
		statusHistory: [
			{
				fromStatus: null,
				toStatus: INITIAL_ENROLLMENT_REQUEST_STATUS,
				changedAt: now,
				changedBy: SYSTEM_ACTOR,
				reason: null,
			},
		],
	};
}

/**
 * Applies a status change, appending the matching audit entry.
 *
 * @throws AxcDomainError `INVALID_STATUS_TRANSITION` when the lifecycle forbids the move.
 */
export function applyStatusChange(request: EnrollmentRequest, command: ChangeEnrollmentRequestStatusCommand, now: string): EnrollmentRequest {
	if (!isValidStatusTransition(request.status, command.status)) {
		throw invalidStatusTransition(request.status, command.status);
	}

	return {
		...request,
		status: command.status,
		updatedAt: now,
		statusHistory: [
			...request.statusHistory,
			{
				fromStatus: request.status,
				toStatus: command.status,
				changedAt: now,
				changedBy: command.changedBy,
				reason: command.reason,
			},
		],
	};
}
