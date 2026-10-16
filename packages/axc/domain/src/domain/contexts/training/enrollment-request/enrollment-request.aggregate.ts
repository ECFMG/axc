import * as DomainSeedwork from '@cellix/domain-seedwork/aggregate-root';
import type { Passport } from '../../../passport.ts';
import type { EnrollmentRequestProps } from './enrollment-request.entity.ts';
import type { EnrollmentRequestDomainPermissions } from './enrollment-request.permissions.ts';
import type { ChangeEnrollmentRequestStatusInput, CreateEnrollmentRequestInput } from './enrollment-request.value-objects.ts';
import { EnrollmentWorkflowError, isEnrollmentJustification, isLearnerEmail } from './enrollment-request.value-objects.ts';
import type { EnrollmentRequestVisa } from './enrollment-request.visa.ts';
export class EnrollmentRequest<PropType extends EnrollmentRequestProps> extends DomainSeedwork.AggregateRoot<PropType, Passport> implements EnrollmentRequestVisa {
	static getNewInstance<P extends EnrollmentRequestProps>(props: P, input: CreateEnrollmentRequestInput, id: string, now: string, passport: Passport): EnrollmentRequest<P> {
		const aggregate = new EnrollmentRequest(props, passport);
		aggregate.initialize(input, id, now);
		return aggregate;
	}
	determineIf(predicate: (permissions: Readonly<EnrollmentRequestDomainPermissions>) => boolean): boolean {
		const current = this.props.record.status;
		return predicate({ pending: false, approved: current === 'pending', rejected: current === 'pending', cancelled: current === 'pending' || current === 'approved' });
	}

	initialize(input: CreateEnrollmentRequestInput, id: string, now: string): void {
		if (!isLearnerEmail(input.learnerEmail.trim())) {
			throw new EnrollmentWorkflowError('INVALID_REQUEST', 'learnerEmail', 'learnerEmail must be a valid email address.');
		}
		if (!isEnrollmentJustification(input.justification)) {
			throw new EnrollmentWorkflowError('INVALID_REQUEST', 'justification', 'justification must be between 20 and 500 characters.');
		}

		this.props.record = {
			...input,
			learnerEmail: input.learnerEmail.trim().toLowerCase(),
			id,
			status: 'pending',
			createdAt: now,
			updatedAt: now,
			statusHistory: [{ fromStatus: null, toStatus: 'pending', changedAt: now, changedBy: 'system', reason: null }],
		};
	}
	changeStatus(input: ChangeEnrollmentRequestStatusInput, now: string): void {
		const allowed = this.determineIf((permissions) => permissions[input.status]);
		if (input.changedBy.trim() === '') {
			throw new EnrollmentWorkflowError('INVALID_REQUEST', 'changedBy', 'changedBy must identify the operator.');
		}
		if (input.status === 'rejected' && (input.reason === undefined || input.reason.trim() === '')) {
			throw new EnrollmentWorkflowError('INVALID_REQUEST', 'reason', 'reason is required when rejecting a request.');
		}
		if (!allowed) {
			throw new EnrollmentWorkflowError('INVALID_STATUS_TRANSITION', 'status', 'The requested status transition is not allowed.');
		}

		const previous = this.props.record;
		this.props.record = {
			...previous,
			status: input.status,
			updatedAt: now,
			statusHistory: [...previous.statusHistory, { fromStatus: previous.status, toStatus: input.status, changedAt: now, changedBy: input.changedBy, reason: input.reason ?? null }],
		};
	}
}
