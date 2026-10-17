import { DomainEntity, type DomainEntityProps } from '@cellix/domain-seedwork/domain-entity';
import type { EnrollmentStatus } from './enrollment-request.value-objects.ts';
export interface StatusHistoryProps extends DomainEntityProps {
	fromStatus: EnrollmentStatus | null;
	toStatus: EnrollmentStatus;
	changedAt: string;
	changedBy: string;
	reason: string | null;
}
export interface StatusHistoryEntityReference extends Omit<Readonly<StatusHistoryProps>, 'id'> {}
export class StatusHistory extends DomainEntity<StatusHistoryProps> implements StatusHistoryEntityReference {
	get fromStatus() {
		return this.props.fromStatus;
	}
	get toStatus() {
		return this.props.toStatus;
	}
	get changedAt() {
		return this.props.changedAt;
	}
	get changedBy() {
		return this.props.changedBy;
	}
	get reason() {
		return this.props.reason;
	}
}
