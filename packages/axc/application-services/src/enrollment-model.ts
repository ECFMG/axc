export const enrollmentStatuses = ['pending', 'approved', 'rejected', 'cancelled'] as const;
export type EnrollmentStatus = (typeof enrollmentStatuses)[number];
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
export interface EnrollmentFilters {
	status?: EnrollmentStatus;
	courseId?: string;
	learnerEmail?: string;
}
export class EnrollmentError extends Error {
	readonly code: string;
	readonly status: 400 | 404 | 409;
	readonly details: { field: string; message: string }[];
	constructor(code: string, status: 400 | 404 | 409, message: string, details: { field: string; message: string }[] = []) {
		super(message);
		this.code = code;
		this.status = status;
		this.details = details;
	}
}
export function invalid(field: string, message: string): never {
	throw new EnrollmentError('INVALID_REQUEST', 400, 'The request could not be completed.', [{ field, message }]);
}
export function text(value: unknown, field: string): string {
	if (typeof value !== 'string' || !value.trim()) invalid(field, `${field} must be a non-empty string.`);
	return value.trim();
}
export function email(value: unknown): string {
	const result = text(value, 'learnerEmail').toLowerCase();
	if (
		result.length > 254 ||
		(result.split('@')[0]?.length ?? 0) > 64 ||
		!/^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(result)
	)
		invalid('learnerEmail', 'learnerEmail must be a valid email address.');
	return result;
}
export function status(value: unknown): EnrollmentStatus {
	if (!enrollmentStatuses.includes(value as EnrollmentStatus)) invalid('status', `status must be one of: ${enrollmentStatuses.join(', ')}.`);
	return value as EnrollmentStatus;
}
export function transition(request: EnrollmentRequest, toStatus: EnrollmentStatus, changedBy: string, reason: string | null, changedAt: string): EnrollmentRequest {
	changedBy = text(changedBy, 'changedBy');
	if (reason !== null) reason = text(reason, 'reason');
	if (toStatus === 'rejected' && !reason) invalid('reason', 'reason is required for rejection.');
	const allowed: Record<EnrollmentStatus, readonly EnrollmentStatus[]> = { pending: ['approved', 'rejected', 'cancelled'], approved: ['cancelled'], rejected: [], cancelled: [] };
	if (!allowed[request.status].includes(toStatus)) throw new EnrollmentError('INVALID_STATUS_TRANSITION', 409, `Cannot change ${request.status} to ${toStatus}.`);
	return { ...request, status: toStatus, updatedAt: changedAt, statusHistory: [...request.statusHistory, { fromStatus: request.status, toStatus, changedAt, changedBy, reason }] };
}
