import { AggregateRoot } from '@cellix/domain-seedwork/aggregate-root';
import type { Passport } from '../../passport.ts';
export const requestStatuses = ['pending', 'approved', 'rejected', 'cancelled'] as const;
export type RequestStatus = (typeof requestStatuses)[number];
export interface StatusHistoryEntry {
	fromStatus: RequestStatus | null;
	toStatus: RequestStatus;
	changedAt: string;
	changedBy: string;
	reason: string | null;
}
export interface EnrollmentRequestProps {
	id: string;
	courseId: string;
	learnerEmail: string;
	justification: string;
	status: RequestStatus;
	createdAt: string;
	updatedAt: string;
	statusHistory: StatusHistoryEntry[];
}
export interface CreateRequest {
	courseId: string;
	learnerEmail: string;
	justification: string;
}
export interface StatusChange {
	status: RequestStatus;
	changedBy: string;
	reason?: string;
}
export interface RequestFilters {
	status?: RequestStatus;
	courseId?: string;
	learnerEmail?: string;
}
export interface ValidationDetail {
	field: string;
	message: string;
}
export class WorkflowError extends Error {
	readonly code: string;
	readonly details: ValidationDetail[];
	constructor(code: string, message: string, details: ValidationDetail[] = []) {
		super(message);
		this.code = code;
		this.details = details;
	}
}
export const validEmail = (value: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
export function validateCreation(input: CreateRequest): ValidationDetail[] {
	const details: ValidationDetail[] = [];
	if (typeof input.courseId !== 'string' || !input.courseId.trim()) details.push({ field: 'courseId', message: 'courseId is required.' });
	if (typeof input.learnerEmail !== 'string' || !validEmail(input.learnerEmail)) details.push({ field: 'learnerEmail', message: 'learnerEmail must be a valid email address.' });
	if (typeof input.justification !== 'string' || input.justification.trim().length < 20 || input.justification.trim().length > 500)
		details.push({ field: 'justification', message: 'justification must be between 20 and 500 characters.' });
	return details;
}
export function validateChange(input: StatusChange): ValidationDetail[] {
	const details: ValidationDetail[] = [];
	if (!requestStatuses.includes(input.status)) details.push({ field: 'status', message: 'status must be pending, approved, rejected, or cancelled.' });
	if (typeof input.changedBy !== 'string' || !input.changedBy.trim()) details.push({ field: 'changedBy', message: 'changedBy is required.' });
	if (input.reason !== undefined && typeof input.reason !== 'string') details.push({ field: 'reason', message: 'reason must be a string.' });
	else if (input.status === 'rejected' && !input.reason?.trim()) details.push({ field: 'reason', message: 'Rejection requires a non-empty reason.' });
	return details;
}
export class EnrollmentRequest extends AggregateRoot<EnrollmentRequestProps, Passport> {
	static getNewInstance(id: string, input: CreateRequest, passport: Passport): EnrollmentRequest {
		const details = validateCreation(input);
		if (details.length) throw new WorkflowError('INVALID_REQUEST', 'The request could not be completed.', details);
		const now = new Date().toISOString();
		return new EnrollmentRequest(
			{
				id,
				courseId: input.courseId.trim(),
				learnerEmail: input.learnerEmail.toLowerCase(),
				justification: input.justification.trim(),
				status: 'pending',
				createdAt: now,
				updatedAt: now,
				statusHistory: [{ fromStatus: null, toStatus: 'pending', changedAt: now, changedBy: 'system', reason: null }],
			},
			passport,
		);
	}
	changeStatus(input: StatusChange): void {
		const details = validateChange(input);
		if (details.length) throw new WorkflowError('INVALID_REQUEST', 'The request could not be completed.', details);
		const from = this.props.status;
		if (!((from === 'pending' && ['approved', 'rejected', 'cancelled'].includes(input.status)) || (from === 'approved' && input.status === 'cancelled')))
			throw new WorkflowError('INVALID_STATUS_TRANSITION', 'The requested status transition is not allowed.');
		const now = new Date().toISOString();
		this.props.status = input.status;
		this.props.updatedAt = now;
		this.props.statusHistory.push({ fromStatus: from, toStatus: input.status, changedAt: now, changedBy: input.changedBy.trim(), reason: input.reason?.trim() || null });
	}
}
