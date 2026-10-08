export type EnrollmentStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

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

export class EnrollmentError extends Error {
	readonly code: string;
	constructor(code: string, message: string) {
		super(message);
		this.code = code;
	}
}

export function createEnrollmentRequest(id: string, courseId: string, learnerEmail: string, justification: string, now: string): EnrollmentRequest {
	if (!/^[^\s@.]+(?:\.[^\s@.]+)*@[^\s@.]+(?:\.[^\s@.]+)+$/.test(learnerEmail)) throw new EnrollmentError('INVALID_REQUEST', 'learnerEmail must be a valid email address.');
	if (justification.trim().length < 20 || justification.trim().length > 500) throw new EnrollmentError('INVALID_REQUEST', 'justification must be between 20 and 500 characters.');
	return { id, courseId, learnerEmail, justification, status: 'pending', createdAt: now, updatedAt: now, statusHistory: [{ fromStatus: null, toStatus: 'pending', changedAt: now, changedBy: 'system', reason: null }] };
}

export function transitionEnrollmentRequest(request: EnrollmentRequest, status: EnrollmentStatus, changedBy: string, reason: string | null, now: string): EnrollmentRequest {
	const allowed: Record<EnrollmentStatus, EnrollmentStatus[]> = {
		pending: ['approved', 'rejected', 'cancelled'],
		approved: ['cancelled'],
		rejected: [],
		cancelled: [],
	};
	if (!allowed[request.status].includes(status)) throw new EnrollmentError('INVALID_STATUS_TRANSITION', `Cannot change ${request.status} to ${status}.`);
	if (status === 'rejected' && !reason?.trim()) throw new EnrollmentError('INVALID_REQUEST', 'reason is required for rejection.');
	return { ...request, status, updatedAt: now, statusHistory: [...request.statusHistory, { fromStatus: request.status, toStatus: status, changedAt: now, changedBy, reason: reason?.trim() || null }] };
}
