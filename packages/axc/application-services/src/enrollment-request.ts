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

export interface EnrollmentFilter {
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
		this.name = 'EnrollmentError';
		this.code = code;
		this.status = status;
		this.details = details;
	}
}

export function invalid(field: string, message: string): never {
	throw new EnrollmentError('INVALID_REQUEST', 400, 'The request could not be completed.', [{ field, message }]);
}

function object(value: unknown): Record<string, unknown> {
	if (value === null || typeof value !== 'object' || Array.isArray(value)) invalid('body', 'A JSON object is required.');
	return value as Record<string, unknown>;
}

function text(value: unknown, field: string): string {
	if (typeof value !== 'string' || !value.trim()) invalid(field, `${field} must be a non-empty string.`);
	return value.trim();
}

function email(value: unknown): string {
	const normalized = text(value, 'learnerEmail').toLowerCase();
	const [local = '', domain = '', ...extra] = normalized.split('@');
	const validLocal = local.length > 0 && local.length <= 64 && /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/.test(local) && !local.startsWith('.') && !local.endsWith('.') && !local.includes('..');
	const labels = domain.split('.');
	const validDomain = labels.length >= 2 && labels.every((label) => label.length <= 63 && /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label));
	if (normalized.length > 254 || extra.length || !validLocal || !validDomain) invalid('learnerEmail', 'learnerEmail must be a valid email address.');
	return normalized;
}

function status(value: unknown): EnrollmentStatus {
	if (!enrollmentStatuses.includes(value as EnrollmentStatus)) invalid('status', `status must be one of: ${enrollmentStatuses.join(', ')}.`);
	return value as EnrollmentStatus;
}

export function parseEnrollmentCreation(value: unknown): Pick<EnrollmentRequest, 'courseId' | 'learnerEmail' | 'justification'> {
	const body = object(value);
	const courseId = text(body['courseId'], 'courseId');
	const learnerEmail = email(body['learnerEmail']);
	const justification = text(body['justification'], 'justification');
	if (justification.length < 20 || justification.length > 500) invalid('justification', 'justification must be between 20 and 500 characters.');
	return { courseId, learnerEmail, justification };
}

export function parseEnrollmentFilter(value: unknown): EnrollmentFilter {
	const body = object(value);
	const filter: EnrollmentFilter = {};
	if (body['status'] !== undefined) filter.status = status(body['status']);
	if (body['courseId'] !== undefined) filter.courseId = text(body['courseId'], 'courseId');
	if (body['learnerEmail'] !== undefined) filter.learnerEmail = email(body['learnerEmail']);
	return filter;
}

export function parseEnrollmentChange(value: unknown): { status: EnrollmentStatus; changedBy: string; reason: string | null } {
	const body = object(value);
	const nextStatus = status(body['status']);
	const changedBy = text(body['changedBy'], 'changedBy');
	const reason = body['reason'] === undefined || body['reason'] === null ? null : text(body['reason'], 'reason');
	if (nextStatus === 'rejected' && !reason) invalid('reason', 'reason is required for rejection.');
	return { status: nextStatus, changedBy, reason };
}

const transitions: Record<EnrollmentStatus, readonly EnrollmentStatus[]> = {
	pending: ['approved', 'rejected', 'cancelled'],
	approved: ['cancelled'],
	rejected: [],
	cancelled: [],
};

export function changeEnrollmentStatus(request: EnrollmentRequest, change: ReturnType<typeof parseEnrollmentChange>, changedAt: string): EnrollmentRequest {
	if (!transitions[request.status].includes(change.status)) throw new EnrollmentError('INVALID_STATUS_TRANSITION', 409, `Cannot change ${request.status} to ${change.status}.`);
	return {
		...request,
		status: change.status,
		updatedAt: changedAt,
		statusHistory: [
			...request.statusHistory,
			{
				fromStatus: request.status,
				toStatus: change.status,
				changedAt,
				changedBy: change.changedBy,
				reason: change.reason,
			},
		],
	};
}
