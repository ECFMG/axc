import type { Course } from '../course/course.ts';
import { CourseNotActiveError, CourseNotFoundError, DuplicateActiveRequestError, InvalidStatusTransitionError } from './enrollment-request.errors.ts';
import {
	canTransitionEnrollmentStatus,
	type EnrollmentRequestStatus,
	isActiveEnrollmentRequestStatus,
	parseChangedBy,
	parseEnrollmentRequestStatus,
	parseJustification,
	parseLearnerEmail,
	parseRejectionReason,
} from './enrollment-request.value-objects.ts';

export interface StatusHistoryEntry {
	fromStatus: EnrollmentRequestStatus | null;
	toStatus: EnrollmentRequestStatus;
	changedAt: string;
	changedBy: string;
	reason: string | null;
}

export interface EnrollmentRequestSnapshot {
	id: string;
	courseId: string;
	learnerEmail: string;
	justification: string;
	status: EnrollmentRequestStatus;
	createdAt: string;
	updatedAt: string;
	statusHistory: StatusHistoryEntry[];
}

export interface CreateEnrollmentRequestInput {
	id: string;
	courseId: string;
	learnerEmail: string;
	justification: string;
	now: string;
	changedBy?: string;
}

export interface ChangeEnrollmentRequestStatusInput {
	status: string;
	changedBy: string | undefined;
	reason: string | undefined;
	now: string;
}

export class EnrollmentRequest {
	private readonly props: EnrollmentRequestSnapshot;

	private constructor(props: EnrollmentRequestSnapshot) {
		this.props = props;
	}

	public static create(input: CreateEnrollmentRequestInput): EnrollmentRequest {
		const learnerEmail = parseLearnerEmail(input.learnerEmail);
		const justification = parseJustification(input.justification);
		const changedBy = input.changedBy ?? 'system';
		const historyEntry: StatusHistoryEntry = {
			fromStatus: null,
			toStatus: 'pending',
			changedAt: input.now,
			changedBy,
			reason: null,
		};

		return new EnrollmentRequest({
			id: input.id,
			courseId: input.courseId,
			learnerEmail,
			justification,
			status: 'pending',
			createdAt: input.now,
			updatedAt: input.now,
			statusHistory: [historyEntry],
		});
	}

	public static rehydrate(snapshot: EnrollmentRequestSnapshot): EnrollmentRequest {
		return new EnrollmentRequest({
			...snapshot,
			statusHistory: [...snapshot.statusHistory],
		});
	}

	public changeStatus(input: ChangeEnrollmentRequestStatusInput): void {
		const toStatus = parseEnrollmentRequestStatus(input.status);
		const changedBy = parseChangedBy(input.changedBy);
		const reason = toStatus === 'rejected' ? parseRejectionReason(input.reason) : (input.reason?.trim() ?? '') === '' ? null : (input.reason ?? '').trim();

		if (!canTransitionEnrollmentStatus(this.props.status, toStatus)) {
			throw new InvalidStatusTransitionError(this.props.status, toStatus);
		}

		const historyEntry: StatusHistoryEntry = {
			fromStatus: this.props.status,
			toStatus,
			changedAt: input.now,
			changedBy,
			reason,
		};

		this.props.status = toStatus;
		this.props.updatedAt = input.now;
		this.props.statusHistory.push(historyEntry);
	}

	public snapshot(): EnrollmentRequestSnapshot {
		return {
			...this.props,
			statusHistory: this.props.statusHistory.map((entry) => ({ ...entry })),
		};
	}
}

export function assertCourseAllowsEnrollment(course: Course | undefined): Course {
	if (course === undefined) {
		throw new CourseNotFoundError();
	}
	if (course.status !== 'active') {
		throw new CourseNotActiveError();
	}
	return course;
}

export function assertNoDuplicateActiveRequest(existing: EnrollmentRequestSnapshot | undefined): void {
	if (existing !== undefined && isActiveEnrollmentRequestStatus(existing.status)) {
		throw new DuplicateActiveRequestError();
	}
}

export function sameLearnerEmail(left: string, right: string): boolean {
	return left.toLowerCase() === right.toLowerCase();
}
