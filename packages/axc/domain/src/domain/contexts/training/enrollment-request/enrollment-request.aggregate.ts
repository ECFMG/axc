import { AggregateRoot } from '@cellix/domain-seedwork/aggregate-root';
import type { DomainEntityProps } from '@cellix/domain-seedwork/domain-entity';
import type { EnrollmentStatus, EnrollmentStatusValue, Justification, LearnerEmail } from './enrollment-request.value-objects.ts';

// History entries have no separate identity or lifecycle; they are immutable values owned by the request.
export interface StatusHistoryEntry {
	readonly fromStatus: EnrollmentStatusValue | null;
	readonly toStatus: EnrollmentStatusValue;
	readonly changedAt: string;
	readonly changedBy: string;
	readonly reason: string | null;
}
export interface EnrollmentRequestProps extends DomainEntityProps {
	courseId: string;
	learnerEmail: string;
	justification: string;
	status: EnrollmentStatusValue;
	createdAt: string;
	updatedAt: string;
	statusHistory: StatusHistoryEntry[];
}
export interface EnrollmentRequestEntityReference extends Readonly<Omit<EnrollmentRequestProps, 'statusHistory'>> {
	readonly statusHistory: ReadonlyArray<StatusHistoryEntry>;
}
export class InvalidStatusTransition extends Error {}
export class RejectionReasonRequired extends Error {}
export class EnrollmentRequest<P extends EnrollmentRequestProps = EnrollmentRequestProps> extends AggregateRoot<P, void> implements EnrollmentRequestEntityReference {
	static getNewInstance<P extends EnrollmentRequestProps>(props: P, courseId: string, email: LearnerEmail, justification: Justification, at: string): EnrollmentRequest<P> {
		if (!courseId.trim()) throw new Error('Invalid course ID');
		props.courseId = courseId;
		props.learnerEmail = email.valueOf();
		props.justification = justification.valueOf();
		props.status = 'pending';
		props.createdAt = at;
		props.updatedAt = at;
		props.statusHistory = [{ fromStatus: null, toStatus: 'pending', changedAt: at, changedBy: 'system', reason: null }];
		return new EnrollmentRequest(props, undefined);
	}
	transition(to: EnrollmentStatus, changedBy: string, reason: string | undefined, at: string): void {
		const valid: Record<EnrollmentStatusValue, readonly EnrollmentStatusValue[]> = {
			pending: ['approved', 'rejected', 'cancelled'],
			approved: ['cancelled'],
			rejected: [],
			cancelled: [],
		};
		if (!valid[this.props.status].includes(to.valueOf())) throw new InvalidStatusTransition('Invalid status transition');
		if (to.valueOf() === 'rejected' && !reason?.trim()) throw new RejectionReasonRequired('Rejection requires a reason');
		if (!changedBy.trim()) throw new Error('changedBy is required');
		const previous = this.props.status;
		this.props.status = to.valueOf();
		this.props.updatedAt = at;
		this.props.statusHistory.push({ fromStatus: previous, toStatus: to.valueOf(), changedAt: at, changedBy: changedBy.trim(), reason: reason?.trim() || null });
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
	get statusHistory(): ReadonlyArray<StatusHistoryEntry> {
		return this.props.statusHistory.map((entry) => ({ ...entry }));
	}
}
