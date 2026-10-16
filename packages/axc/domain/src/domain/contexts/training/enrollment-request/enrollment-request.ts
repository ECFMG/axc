import { AggregateRoot } from '@cellix/domain-seedwork/aggregate-root';
import type { Course } from '../course/course.ts';

import { EnrollmentError, EnrollmentJustification, type EnrollmentStatus, invalidEnrollmentField, LearnerEmail } from './enrollment-request.value-objects.ts';

export type { EnrollmentStatus } from './enrollment-request.value-objects.ts';
export interface StatusHistoryEntry {
	fromStatus: EnrollmentStatus | null;
	toStatus: EnrollmentStatus;
	changedAt: string;
	changedBy: string;
	reason: string | null;
}
export interface EnrollmentRequestProps {
	id: string;
	courseId: string;
	learnerEmail: string;
	justification: string;
	status: EnrollmentStatus;
	createdAt: string;
	updatedAt: string;
	statusHistory: StatusHistoryEntry[];
}
export interface CreateEnrollmentInput {
	courseId: string;
	learnerEmail: string;
	justification: string;
}
export interface ChangeEnrollmentStatusInput {
	status: EnrollmentStatus;
	changedBy: string;
	reason?: string;
}

export class EnrollmentRequest extends AggregateRoot<EnrollmentRequestProps, undefined> {
	static create(id: string, input: CreateEnrollmentInput, course: Pick<Course, 'status'> | null, now: string): EnrollmentRequest {
		const learnerEmail = new LearnerEmail(input.learnerEmail).value;
		const justification = new EnrollmentJustification(input.justification).value;
		if (course === null) {
			throw new EnrollmentError('COURSE_NOT_FOUND');
		}
		if (course.status !== 'active') {
			throw new EnrollmentError('COURSE_NOT_ACTIVE');
		}
		return new EnrollmentRequest(
			{ id, courseId: input.courseId, learnerEmail, justification, status: 'pending', createdAt: now, updatedAt: now, statusHistory: [{ fromStatus: null, toStatus: 'pending', changedAt: now, changedBy: 'system', reason: null }] },
			undefined,
		);
	}
	changeStatus(input: ChangeEnrollmentStatusInput, now: string): void {
		const changedBy = input.changedBy.trim();
		const reason = input.reason?.trim();
		if (changedBy.length === 0) {
			invalidEnrollmentField('changedBy', 'changedBy must be a non-empty identifier.');
		}
		if (input.status === 'rejected' && (reason === undefined || reason.length === 0)) {
			invalidEnrollmentField('reason', 'reason is required when rejecting a request.');
		}
		const fromStatus = this.props.status;
		const allowed = (fromStatus === 'pending' && ['approved', 'rejected', 'cancelled'].includes(input.status)) || (fromStatus === 'approved' && input.status === 'cancelled');
		if (!allowed) {
			throw new EnrollmentError('INVALID_STATUS_TRANSITION');
		}
		this.props.statusHistory.push({ fromStatus, toStatus: input.status, changedAt: now, changedBy, reason: reason === undefined || reason.length === 0 ? null : reason });
		this.props.status = input.status;
		this.props.updatedAt = now;
	}
	toSnapshot(): EnrollmentRequestProps {
		return { ...this.props, statusHistory: this.props.statusHistory.map((entry) => ({ ...entry })) };
	}
}
