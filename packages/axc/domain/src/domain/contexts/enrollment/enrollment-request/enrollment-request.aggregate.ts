import { AggregateRoot } from '@cellix/domain-seedwork/aggregate-root';
import type { DomainEntityProps } from '@cellix/domain-seedwork/domain-entity';
import { DomainError, invalidRequest } from '../../../domain-error.ts';
import { AllowedTransitions, type EnrollmentStatus, EnrollmentStatuses, isEnrollmentStatus, Justification, LearnerEmail } from './enrollment-request.value-objects.ts';

export interface StatusHistoryEntry {
	fromStatus: EnrollmentStatus | null;
	toStatus: EnrollmentStatus;
	changedAt: string;
	changedBy: string;
	reason: string | null;
}

export interface EnrollmentRequestProps extends DomainEntityProps {
	courseId: string;
	learnerEmail: string;
	justification: string;
	status: EnrollmentStatus;
	createdAt: string;
	updatedAt: string;
	statusHistory: StatusHistoryEntry[];
}

export type EnrollmentRequestEntityReference = Readonly<Omit<EnrollmentRequestProps, 'statusHistory'>> & { readonly statusHistory: readonly Readonly<StatusHistoryEntry>[] };

const nonEmpty = (raw: unknown): string | undefined => (typeof raw === 'string' && raw.trim() !== '' ? raw.trim() : undefined);

export class EnrollmentRequest extends AggregateRoot<EnrollmentRequestProps, undefined> {
	/** Validates input and starts the request as pending with its first audit entry. */
	static create(id: string, input: { courseId: string; learnerEmail: unknown; justification: unknown }, now: string): EnrollmentRequest {
		const learnerEmail = new LearnerEmail(input.learnerEmail).value;
		const justification = new Justification(input.justification).value;
		return new EnrollmentRequest(
			{
				id,
				courseId: input.courseId,
				learnerEmail,
				justification,
				status: EnrollmentStatuses.Pending,
				createdAt: now,
				updatedAt: now,
				statusHistory: [{ fromStatus: null, toStatus: EnrollmentStatuses.Pending, changedAt: now, changedBy: 'system', reason: null }],
			},
			undefined,
		);
	}

	/** Pending and approved requests block a duplicate for the same learner and course. */
	get isActive(): boolean {
		return this.props.status === EnrollmentStatuses.Pending || this.props.status === EnrollmentStatuses.Approved;
	}

	changeStatus(input: { status: unknown; changedBy: unknown; reason?: unknown }, now: string): void {
		const { status } = input;
		if (!isEnrollmentStatus(status)) {
			throw invalidRequest([{ field: 'status', message: `status must be one of ${Object.values(EnrollmentStatuses).join(', ')}.` }]);
		}
		const changedBy = nonEmpty(input.changedBy);
		if (changedBy === undefined) {
			throw invalidRequest([{ field: 'changedBy', message: 'changedBy is required.' }]);
		}
		const reason = nonEmpty(input.reason) ?? null;
		if (status === EnrollmentStatuses.Rejected && reason === null) {
			throw invalidRequest([{ field: 'reason', message: 'reason is required when rejecting a request.' }]);
		}
		const from = this.props.status;
		if (!AllowedTransitions[from].includes(status)) {
			throw new DomainError('INVALID_STATUS_TRANSITION', `Cannot change status from ${from} to ${status}.`);
		}
		this.props.status = status;
		this.props.updatedAt = now;
		this.props.statusHistory.push({ fromStatus: from, toStatus: status, changedAt: now, changedBy, reason });
	}

	toReference(): EnrollmentRequestEntityReference {
		return { ...this.props, statusHistory: this.props.statusHistory.map((entry) => ({ ...entry })) };
	}
}
