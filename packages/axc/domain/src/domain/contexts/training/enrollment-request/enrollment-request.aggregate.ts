import { AggregateRoot } from '@cellix/domain-seedwork/aggregate-root';
import type { DomainEntityProps } from '@cellix/domain-seedwork/domain-entity';
import { type EnrollmentStatus, InvalidEnrollmentValueError, type Justification, type LearnerEmail, type Status, StatusHistoryEntry, type StatusHistoryProps } from './enrollment-request.value-objects.ts';

export class InvalidStatusTransitionError extends Error {}
export interface EnrollmentRequestProps extends DomainEntityProps {
	courseId: string;
	learnerEmail: string;
	justification: string;
	status: EnrollmentStatus;
	createdAt: string;
	updatedAt: string;
	statusHistory: StatusHistoryProps[];
}
export interface EnrollmentRequestEntityReference extends Readonly<Omit<EnrollmentRequestProps, 'statusHistory'>> {
	readonly statusHistory: ReadonlyArray<StatusHistoryProps>;
}
export class EnrollmentRequest extends AggregateRoot<EnrollmentRequestProps, null> implements EnrollmentRequestEntityReference {
	static getNewInstance(id: string, courseId: string, email: LearnerEmail, justification: Justification, now: string): EnrollmentRequest {
		if (!courseId.trim()) throw new InvalidEnrollmentValueError('courseId is required.');
		const entry = new StatusHistoryEntry({ fromStatus: null, toStatus: 'pending', changedAt: now, changedBy: 'system', reason: null });
		return new EnrollmentRequest({ id, courseId, learnerEmail: email.valueOf(), justification: justification.valueOf(), status: 'pending', createdAt: now, updatedAt: now, statusHistory: [entry.toJSON()] }, null);
	}
	transition(status: Status, changedBy: string, reason: string | undefined, now: string): void {
		const target = status.valueOf();
		const allowed: Record<EnrollmentStatus, readonly EnrollmentStatus[]> = { pending: ['approved', 'rejected', 'cancelled'], approved: ['cancelled'], rejected: [], cancelled: [] };
		if (!allowed[this.props.status].includes(target)) throw new InvalidStatusTransitionError(`Cannot transition from ${this.props.status} to ${target}.`);
		if (!changedBy.trim()) throw new InvalidEnrollmentValueError('changedBy is required.');
		if (target === 'rejected' && !reason?.trim()) throw new InvalidEnrollmentValueError('reason is required for rejection.');
		const entry = new StatusHistoryEntry({ fromStatus: this.props.status, toStatus: target, changedAt: now, changedBy: changedBy.trim(), reason: reason?.trim() || null });
		this.props.status = target;
		this.props.updatedAt = now;
		this.props.statusHistory.push(entry.toJSON());
	}
	get courseId(): string {
		return this.props.courseId;
	}
	get learnerEmail(): string {
		return this.props.learnerEmail;
	}
	get justification(): string {
		return this.props.justification;
	}
	get status(): EnrollmentStatus {
		return this.props.status;
	}
	get createdAt(): string {
		return this.props.createdAt;
	}
	get updatedAt(): string {
		return this.props.updatedAt;
	}
	get statusHistory(): ReadonlyArray<StatusHistoryProps> {
		return this.props.statusHistory.map((entry) => ({ ...entry }));
	}
	toReference(): EnrollmentRequestEntityReference {
		return { id: this.id, courseId: this.courseId, learnerEmail: this.learnerEmail, justification: this.justification, status: this.status, createdAt: this.createdAt, updatedAt: this.updatedAt, statusHistory: this.statusHistory };
	}
}
