import { AggregateRoot } from '@cellix/domain-seedwork/aggregate-root';
import type { DomainEntityProps } from '@cellix/domain-seedwork/domain-entity';
import { DomainError, invalidRequest } from '../../../domain-error.ts';
import { ActiveEnrollmentStatuses, EnrollmentStatus, EnrollmentTransitions, isEnrollmentStatus, Justification, LearnerEmail } from './enrollment-request.value-objects.ts';

export interface StatusHistoryEntry {
	readonly fromStatus: EnrollmentStatus | null;
	readonly toStatus: EnrollmentStatus;
	readonly changedAt: Date;
	readonly changedBy: string;
	readonly reason: string | null;
}

export interface EnrollmentRequestProps extends DomainEntityProps {
	readonly courseId: string;
	readonly learnerEmail: string;
	readonly justification: string;
	status: EnrollmentStatus;
	readonly createdAt: Date;
	updatedAt: Date;
	readonly statusHistory: StatusHistoryEntry[];
}

export type EnrollmentRequestEntityReference = Readonly<EnrollmentRequestProps>;

export interface NewEnrollmentRequest {
	courseId: string;
	learnerEmail: unknown;
	justification: unknown;
}

export class EnrollmentRequest extends AggregateRoot<EnrollmentRequestProps, undefined> {
	/** Validates input and opens a pending request with its first audit entry. */
	static getNewInstance(id: string, input: NewEnrollmentRequest, now = new Date()): EnrollmentRequest {
		const details = [];
		let learnerEmail = '';
		let justification = '';
		try {
			learnerEmail = new LearnerEmail(input.learnerEmail).value;
		} catch (e) {
			details.push(...(e as DomainError).details);
		}
		try {
			justification = new Justification(input.justification).value;
		} catch (e) {
			details.push(...(e as DomainError).details);
		}
		if (details.length > 0) throw invalidRequest(details);
		return new EnrollmentRequest(
			{
				id,
				courseId: input.courseId,
				learnerEmail,
				justification,
				status: EnrollmentStatus.Pending,
				createdAt: now,
				updatedAt: now,
				statusHistory: [{ fromStatus: null, toStatus: EnrollmentStatus.Pending, changedAt: now, changedBy: 'system', reason: null }],
			},
			undefined,
		);
	}

	get isActive(): boolean {
		return ActiveEnrollmentStatuses.includes(this.props.status);
	}

	changeStatus(toStatus: unknown, changedBy: unknown, reason: unknown, now = new Date()): void {
		if (!isEnrollmentStatus(toStatus)) {
			throw invalidRequest([{ field: 'status', message: `status must be one of ${Object.values(EnrollmentStatus).join(', ')}.` }]);
		}
		if (typeof changedBy !== 'string' || changedBy.trim() === '') {
			throw invalidRequest([{ field: 'changedBy', message: 'changedBy is required.' }]);
		}
		if (reason !== undefined && reason !== null && typeof reason !== 'string') {
			throw invalidRequest([{ field: 'reason', message: 'reason must be a string.' }]);
		}
		const trimmedReason = reason?.trim() || null;
		if (toStatus === EnrollmentStatus.Rejected && trimmedReason === null) {
			throw invalidRequest([{ field: 'reason', message: 'reason is required when rejecting a request.' }]);
		}
		const fromStatus = this.props.status;
		if (!EnrollmentTransitions[fromStatus].includes(toStatus)) {
			throw new DomainError('INVALID_STATUS_TRANSITION', `Cannot change status from ${fromStatus} to ${toStatus}.`);
		}
		this.props.status = toStatus;
		this.props.updatedAt = now;
		this.props.statusHistory.push({ fromStatus, toStatus, changedAt: now, changedBy: changedBy.trim(), reason: trimmedReason });
	}
}
