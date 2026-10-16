import { AggregateRoot } from '@cellix/domain-seedwork/aggregate-root';
import { type DomainEntityProps, PermissionError } from '@cellix/domain-seedwork/domain-entity';
import type { Passport } from '../../passport.ts';
import type { EnrollmentVisa } from '../enrollment.visa.ts';
import * as ValueObjects from './enrollment-request.value-objects.ts';
import type { StatusHistoryProps } from './status-history.value-objects.ts';
import * as HistoryValues from './status-history.value-objects.ts';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface EnrollmentRequestProps extends DomainEntityProps {
	courseId: string;
	learnerEmail: string;
	justification: string;
	status: string;
	statusHistory: StatusHistoryProps[];
	readonly createdAt: Date;
	readonly updatedAt: Date;
	readonly schemaVersion: string;
}

export interface EnrollmentRequestEntityReference extends Readonly<EnrollmentRequestProps> {}

export interface EnrollmentRequestNewInput {
	courseId: string;
	learnerEmail: string;
	justification: string;
}

export class EnrollmentRequest<props extends EnrollmentRequestProps> extends AggregateRoot<props, Passport> implements EnrollmentRequestEntityReference {
	private isNew: boolean = false;
	private readonly visa: EnrollmentVisa;
	constructor(props: props, passport: Passport) {
		super(props, passport);
		this.visa = passport.enrollment.forEnrollmentRequest(this);
	}

	public static getNewInstance<props extends EnrollmentRequestProps>(newProps: props, input: EnrollmentRequestNewInput, passport: Passport): EnrollmentRequest<props> {
		const newInstance = new EnrollmentRequest(newProps, passport);
		newInstance.markAsNew();
		newInstance.courseId = input.courseId;
		newInstance.learnerEmail = input.learnerEmail;
		newInstance.justification = input.justification;
		newInstance.status = ValueObjects.RequestStatusTypes.Pending;
		newInstance.statusHistory = [
			{
				fromStatus: null,
				toStatus: ValueObjects.RequestStatusTypes.Pending,
				changedAt: new Date(),
				changedBy: 'system',
				reason: null,
			},
		];
		newInstance.isNew = false;
		return newInstance;
	}

	private markAsNew(): void {
		this.isNew = true;
	}

	changeStatus(toStatus: string, changedBy: string, reason: string | null): void {
		if (!this.visa.determineIf((permissions) => permissions.canManageEnrollmentRequest)) {
			throw new PermissionError('You do not have permission to change status');
		}
		if (!this.isRequestStatus(toStatus)) {
			throw new Error('INVALID_REQUEST');
		}
		if (!this.canTransition(this.props.status, toStatus)) {
			throw new Error('INVALID_STATUS_TRANSITION');
		}
		const reviewer = changedBy.trim();
		if (reviewer.length === 0) {
			throw new Error('INVALID_REQUEST');
		}
		const trimmedReason = reason === null ? null : reason.trim();
		if (toStatus === ValueObjects.RequestStatusTypes.Rejected && (trimmedReason === null || trimmedReason.length === 0)) {
			throw new Error('INVALID_REQUEST');
		}
		const fromStatus = this.props.status;
		this.status = toStatus;
		this.statusHistory = [
			...this.statusHistory,
			{
				fromStatus,
				toStatus,
				changedAt: new Date(),
				changedBy: reviewer,
				reason: trimmedReason === null || trimmedReason.length === 0 ? null : trimmedReason,
			},
		];
	}

	private isRequestStatus(status: string): boolean {
		return status === ValueObjects.RequestStatusTypes.Pending || status === ValueObjects.RequestStatusTypes.Approved || status === ValueObjects.RequestStatusTypes.Rejected || status === ValueObjects.RequestStatusTypes.Cancelled;
	}

	private canTransition(fromStatus: string, toStatus: string): boolean {
		if (fromStatus === ValueObjects.RequestStatusTypes.Pending && toStatus === ValueObjects.RequestStatusTypes.Approved) {
			return true;
		}
		if (fromStatus === ValueObjects.RequestStatusTypes.Pending && toStatus === ValueObjects.RequestStatusTypes.Rejected) {
			return true;
		}
		if (fromStatus === ValueObjects.RequestStatusTypes.Pending && toStatus === ValueObjects.RequestStatusTypes.Cancelled) {
			return true;
		}
		return fromStatus === ValueObjects.RequestStatusTypes.Approved && toStatus === ValueObjects.RequestStatusTypes.Cancelled;
	}

	private canChange(field: string): void {
		if (!this.isNew && !this.visa.determineIf((permissions) => permissions.canManageEnrollmentRequest)) {
			throw new PermissionError(`You do not have permission to change ${field}`);
		}
	}

	get courseId(): string {
		return this.props.courseId;
	}
	set courseId(courseId: string) {
		this.canChange('courseId');
		this.props.courseId = new ValueObjects.CourseId(courseId).valueOf();
	}

	get learnerEmail(): string {
		return this.props.learnerEmail;
	}
	set learnerEmail(learnerEmail: string) {
		this.canChange('learnerEmail');
		const normalized = learnerEmail.trim().toLowerCase();
		if (!emailPattern.test(normalized) || normalized.length > 320) {
			throw new Error('INVALID_REQUEST');
		}
		this.props.learnerEmail = new ValueObjects.LearnerEmail(normalized).valueOf();
	}

	get justification(): string {
		return this.props.justification;
	}
	set justification(justification: string) {
		this.canChange('justification');
		const trimmed = justification.trim();
		if (trimmed.length < 20 || trimmed.length > 500) {
			throw new Error('INVALID_REQUEST');
		}
		this.props.justification = new ValueObjects.Justification(trimmed).valueOf();
	}

	get status(): string {
		return this.props.status;
	}
	set status(status: string) {
		this.canChange('status');
		if (!this.isRequestStatus(status)) {
			throw new Error('INVALID_REQUEST');
		}
		this.props.status = new ValueObjects.Status(status).valueOf();
	}

	get statusHistory(): StatusHistoryProps[] {
		return this.props.statusHistory;
	}
	set statusHistory(statusHistory: StatusHistoryProps[]) {
		this.canChange('statusHistory');
		this.props.statusHistory = statusHistory.map((entry) => ({
			fromStatus: entry.fromStatus,
			toStatus: new HistoryValues.HistoryToStatus(entry.toStatus).valueOf(),
			changedAt: entry.changedAt,
			changedBy: new HistoryValues.ChangedBy(entry.changedBy).valueOf(),
			reason: entry.reason === null ? null : entry.reason.trim(),
		}));
	}

	get createdAt(): Date {
		return this.props.createdAt;
	}
	get updatedAt(): Date {
		return this.props.updatedAt;
	}
	get schemaVersion(): string {
		return this.props.schemaVersion;
	}
}
