import { AggregateRoot } from '@cellix/domain-seedwork/aggregate-root';
import type { Passport } from '../../passport.ts';
export const enrollmentStatuses = ['pending', 'approved', 'rejected', 'cancelled'] as const;
export type EnrollmentStatus = (typeof enrollmentStatuses)[number];
export interface HistoryEntry {
	fromStatus: EnrollmentStatus | null;
	toStatus: EnrollmentStatus;
	changedAt: string;
	changedBy: string;
	reason: string | null;
}
export interface EnrollmentProps {
	id: string;
	courseId: string;
	learnerEmail: string;
	justification: string;
	status: EnrollmentStatus;
	createdAt: string;
	updatedAt: string;
	statusHistory: HistoryEntry[];
}
export interface CreateEnrollment {
	courseId: string;
	learnerEmail: string;
	justification: string;
}
export interface ChangeStatus {
	status: EnrollmentStatus;
	changedBy: string;
	reason?: string;
}
export interface EnrollmentFilter {
	status?: EnrollmentStatus;
	courseId?: string;
	learnerEmail?: string;
}
export interface Problem {
	field: string;
	message: string;
}
export class WorkflowError extends Error {
	readonly code: string;
	readonly details: Problem[];
	constructor(code: string, message: string, details: Problem[] = []) {
		super(message);
		this.code = code;
		this.details = details;
	}
}
export const validEmail = (email: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
export function validateCreate(input: CreateEnrollment): void {
	const details: Problem[] = [];
	if (typeof input.courseId !== 'string' || !input.courseId.trim()) details.push({ field: 'courseId', message: 'courseId is required.' });
	if (typeof input.learnerEmail !== 'string' || !validEmail(input.learnerEmail)) details.push({ field: 'learnerEmail', message: 'learnerEmail must be a valid email address.' });
	if (typeof input.justification !== 'string' || input.justification.trim().length < 20 || input.justification.trim().length > 500)
		details.push({ field: 'justification', message: 'justification must be between 20 and 500 characters.' });
	if (details.length) throw new WorkflowError('INVALID_REQUEST', 'The request could not be completed.', details);
}
export function validateChange(input: ChangeStatus): void {
	const details: Problem[] = [];
	if (!enrollmentStatuses.includes(input.status)) details.push({ field: 'status', message: 'Invalid status value.' });
	if (typeof input.changedBy !== 'string' || !input.changedBy.trim()) details.push({ field: 'changedBy', message: 'changedBy is required.' });
	if (input.reason !== undefined && (typeof input.reason !== 'string' || !input.reason.trim())) details.push({ field: 'reason', message: 'reason must be non-empty text.' });
	if (input.status === 'rejected' && (typeof input.reason !== 'string' || !input.reason.trim())) details.push({ field: 'reason', message: 'Rejection requires a reason.' });
	if (details.length) throw new WorkflowError('INVALID_REQUEST', 'The request could not be completed.', details);
}
export class EnrollmentRequest extends AggregateRoot<EnrollmentProps, Passport> {
	static getNewInstance(id: string, input: CreateEnrollment, passport: Passport): EnrollmentRequest {
		validateCreate(input);
		const now = new Date().toISOString();
		return new EnrollmentRequest(
			{
				...input,
				courseId: input.courseId.trim(),
				learnerEmail: input.learnerEmail.toLowerCase(),
				justification: input.justification.trim(),
				id,
				status: 'pending',
				createdAt: now,
				updatedAt: now,
				statusHistory: [{ fromStatus: null, toStatus: 'pending', changedAt: now, changedBy: 'system', reason: null }],
			},
			passport,
		);
	}
	changeStatus(input: ChangeStatus): void {
		validateChange(input);
		const fromStatus = this.props.status;
		if (!(fromStatus === 'pending' && ['approved', 'rejected', 'cancelled'].includes(input.status)) && !(fromStatus === 'approved' && input.status === 'cancelled'))
			throw new WorkflowError('INVALID_STATUS_TRANSITION', `Cannot change ${fromStatus} to ${input.status}.`);
		const now = new Date().toISOString();
		this.props.statusHistory.push({ fromStatus, toStatus: input.status, changedAt: now, changedBy: input.changedBy.trim(), reason: input.reason?.trim() ?? null });
		this.props.status = input.status;
		this.props.updatedAt = now;
	}
}
