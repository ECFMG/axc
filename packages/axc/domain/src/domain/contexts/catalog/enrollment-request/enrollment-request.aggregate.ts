import { AggregateRoot } from '@cellix/domain-seedwork/aggregate-root';
import type { DomainEntityProps } from '@cellix/domain-seedwork/domain-entity';
import type { EnrollmentStatus, Justification, LearnerEmail } from './enrollment-request.value-objects.ts';
import { StatusHistory, type StatusHistoryEntityReference, type StatusHistoryProps } from './enrollment-request-status-history.entity.ts';
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
	readonly statusHistory: readonly StatusHistoryEntityReference[];
}
export class InvalidStatusTransitionError extends Error {}
export class EnrollmentRequest<P extends EnrollmentRequestProps = EnrollmentRequestProps> extends AggregateRoot<P, void> implements EnrollmentRequestEntityReference {
	static getNewInstance<P extends EnrollmentRequestProps>(props: P, courseId: string, email: LearnerEmail, justification: Justification, at: string): EnrollmentRequest<P> {
		props.courseId = courseId;
		props.learnerEmail = email.value;
		props.justification = justification.value;
		props.status = 'pending';
		props.createdAt = at;
		props.updatedAt = at;
		props.statusHistory = [{ id: `${props.id}:1`, fromStatus: null, toStatus: 'pending', changedAt: at, changedBy: 'system', reason: null }];
		return new EnrollmentRequest(props, undefined);
	}
	transition(status: EnrollmentStatus, changedBy: string, reason: string | undefined, at: string): void {
		const allowed: Record<EnrollmentStatus, readonly EnrollmentStatus[]> = { pending: ['approved', 'rejected', 'cancelled'], approved: ['cancelled'], rejected: [], cancelled: [] };
		if (!allowed[this.props.status].includes(status)) throw new InvalidStatusTransitionError('Invalid status transition.');
		if (!changedBy.trim()) throw new Error('changedBy is required.');
		if (status === 'rejected' && !reason?.trim()) throw new Error('reason is required for rejection.');
		const fromStatus = this.props.status;
		this.props.status = status;
		this.props.updatedAt = at;
		this.props.statusHistory.push({ id: `${this.id}:${this.props.statusHistory.length + 1}`, fromStatus, toStatus: status, changedAt: at, changedBy: changedBy.trim(), reason: reason?.trim() || null });
	}
	toReference(): EnrollmentRequestEntityReference {
		return {
			id: this.id,
			courseId: this.courseId,
			learnerEmail: this.learnerEmail,
			justification: this.justification,
			status: this.status,
			createdAt: this.createdAt,
			updatedAt: this.updatedAt,
			statusHistory: this.statusHistory.map((entry) => ({ fromStatus: entry.fromStatus, toStatus: entry.toStatus, changedAt: entry.changedAt, changedBy: entry.changedBy, reason: entry.reason })),
		};
	}
	get courseId() {
		return this.props.courseId;
	}
	get learnerEmail() {
		return this.props.learnerEmail;
	}
	get justification() {
		return this.props.justification;
	}
	get status() {
		return this.props.status;
	}
	get createdAt() {
		return this.props.createdAt;
	}
	get updatedAt() {
		return this.props.updatedAt;
	}
	get statusHistory(): readonly StatusHistoryEntityReference[] {
		return this.props.statusHistory.map((entry) => new StatusHistory(entry));
	}
}
