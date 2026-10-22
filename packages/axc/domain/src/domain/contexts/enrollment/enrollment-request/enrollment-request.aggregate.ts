import { DomainSeedwork } from '../../../seedwork/index.ts';
import type { Passport } from '../../passport.ts';
import type { EnrollmentVisa } from '../enrollment.visa.ts';
import type { EnrollmentRequestEntityReference, EnrollmentRequestProps, EnrollmentRequestStatus, StatusHistoryEntry } from './enrollment-request.entity.ts';
import * as ValueObjects from './enrollment-request.value-objects.ts';

/** The course a request targets, as looked up by the caller. Only active courses accept requests. */
export interface EnrollmentCourseReference {
	id: string;
	status: string;
}

export interface EnrollmentRequestNewInput {
	course: EnrollmentCourseReference;
	learnerEmail: string;
	justification: string;
}

interface EnrollmentRequestStatusChange {
	status: EnrollmentRequestStatus;
	changedBy: string;
	reason?: string;
}

/** Identifier recorded on the creation history entry; the API has no end-user authentication. */
const SYSTEM_ACTOR = 'system';

export class EnrollmentRequest<props extends EnrollmentRequestProps> extends DomainSeedwork.AggregateRoot<props, Passport> implements EnrollmentRequestEntityReference {
	private readonly visa: EnrollmentVisa;

	constructor(props: props, passport: Passport) {
		super(props, passport);
		this.visa = passport.enrollment.forEnrollmentRequest(this);
	}

	/** Creates a pending request for an active course and writes the first status history entry. */
	public static getNewInstance<props extends EnrollmentRequestProps>(newProps: props, passport: Passport, input: EnrollmentRequestNewInput): EnrollmentRequest<props> {
		if (input.course.status !== 'active') {
			throw new ValueObjects.CourseNotActiveError(input.course.id);
		}
		const request = new EnrollmentRequest(newProps, passport);
		request.props.courseId = input.course.id;
		request.props.learnerEmail = new ValueObjects.LearnerEmail(input.learnerEmail).value;
		request.props.justification = new ValueObjects.Justification(input.justification).value;
		request.props.status = 'pending';
		request.props.statusHistory = [{ fromStatus: null, toStatus: 'pending', changedAt: new Date(), changedBy: SYSTEM_ACTOR, reason: null }];
		return request;
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
	get status(): EnrollmentRequestStatus {
		return this.props.status;
	}
	get statusHistory(): StatusHistoryEntry[] {
		return [...this.props.statusHistory];
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

	/** Moves the request along the review workflow and appends the change to the audit trail. */
	public changeStatus(change: EnrollmentRequestStatusChange): void {
		if (!this.visa.determineIf((permissions) => permissions.canReviewEnrollmentRequests)) {
			throw new DomainSeedwork.PermissionError('You do not have permission to review enrollment requests');
		}
		const changedBy = new ValueObjects.ChangedBy(change.changedBy).value;
		const reason = new ValueObjects.StatusChangeReason(change.reason, change.status).value;
		const fromStatus = this.props.status;
		if (!ValueObjects.isAllowedTransition(fromStatus, change.status)) {
			throw new ValueObjects.InvalidStatusTransitionError(fromStatus, change.status);
		}
		this.props.status = change.status;
		this.props.statusHistory = [...this.props.statusHistory, { fromStatus, toStatus: change.status, changedAt: new Date(), changedBy, reason }];
	}
}
