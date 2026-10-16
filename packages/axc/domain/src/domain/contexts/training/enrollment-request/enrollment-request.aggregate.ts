import * as DomainSeedwork from '@cellix/domain-seedwork/aggregate-root';
import type { Passport, Visa } from '../../passport.ts';
import type { CreateEnrollmentRequest, EnrollmentRequest, EnrollmentRequestProps } from './enrollment-request.entity.ts';
import { canTransitionEnrollmentRequest, EnrollmentRequestError, type EnrollmentRequestStatus, validateEnrollmentInput, validateStatusChange } from './enrollment-request.value-objects.ts';
export class EnrollmentRequestAggregate<P extends EnrollmentRequestProps> extends DomainSeedwork.AggregateRoot<P, Passport> {
	static getNewInstance<P extends EnrollmentRequestProps>(props: P, input: CreateEnrollmentRequest, passport: Passport): EnrollmentRequestAggregate<P> {
		const details = validateEnrollmentInput(input.learnerEmail, input.justification);
		if (details.length > 0) {
			throw new EnrollmentRequestError('INVALID_REQUEST', details);
		}
		const now = passport.now();
		props.courseId = input.courseId;
		props.learnerEmail = input.learnerEmail.toLowerCase();
		props.justification = input.justification;
		props.status = 'pending';
		props.createdAt = now;
		props.updatedAt = now;
		props.statusHistory = [{ fromStatus: null, toStatus: 'pending', changedAt: now.toISOString(), changedBy: 'system', reason: null }];
		return new EnrollmentRequestAggregate(props, passport);
	}
	changeStatus(status: EnrollmentRequestStatus, operator: Visa, reason?: string | null): void {
		const details = validateStatusChange(status, operator.changedBy, reason);
		if (details.length > 0) {
			throw new EnrollmentRequestError('INVALID_REQUEST', details);
		}
		if (!canTransitionEnrollmentRequest(this.props.status, status)) {
			throw new EnrollmentRequestError('INVALID_STATUS_TRANSITION');
		}
		const now = this.passport.now();
		this.props.statusHistory = [...this.props.statusHistory, { fromStatus: this.props.status, toStatus: status, changedAt: now.toISOString(), changedBy: operator.changedBy, reason: reason ?? null }];
		this.props.status = status;
		this.props.updatedAt = now;
	}
	toRecord(): EnrollmentRequest {
		const p = this.props;
		return {
			id: this.id,
			courseId: p.courseId,
			learnerEmail: p.learnerEmail,
			justification: p.justification,
			status: p.status,
			createdAt: p.createdAt.toISOString(),
			updatedAt: p.updatedAt.toISOString(),
			statusHistory: p.statusHistory.map((entry) => ({ fromStatus: entry.fromStatus, toStatus: entry.toStatus, changedAt: entry.changedAt, changedBy: entry.changedBy, reason: entry.reason })),
		};
	}
}
