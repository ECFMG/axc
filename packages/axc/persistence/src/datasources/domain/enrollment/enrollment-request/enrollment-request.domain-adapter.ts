import { Domain } from '@axc/domain';
import type { Models } from '@axc/service-mongoose';
import { MongooseSeedwork } from '@cellix/mongoose-seedwork';

type EnrollmentRequestStatus = Domain.Contexts.Enrollment.EnrollmentRequest.EnrollmentRequestStatus;
type StatusHistoryEntry = Domain.Contexts.Enrollment.EnrollmentRequest.StatusHistoryEntry;

export class EnrollmentRequestDomainAdapter extends MongooseSeedwork.MongooseDomainAdapter<Models.EnrollmentRequest.EnrollmentRequest> implements Domain.Contexts.Enrollment.EnrollmentRequest.EnrollmentRequestProps {
	get courseId(): string {
		return this.doc.courseId;
	}
	set courseId(courseId: string) {
		this.doc.courseId = courseId;
	}

	get learnerEmail(): string {
		return this.doc.learnerEmail;
	}
	set learnerEmail(learnerEmail: string) {
		this.doc.learnerEmail = learnerEmail;
	}

	get justification(): string {
		return this.doc.justification;
	}
	set justification(justification: string) {
		this.doc.justification = justification;
	}

	get status(): EnrollmentRequestStatus {
		return this.doc.status;
	}
	set status(status: EnrollmentRequestStatus) {
		this.doc.status = status;
	}

	get statusHistory(): StatusHistoryEntry[] {
		return this.doc.statusHistory.map((entry) => ({ fromStatus: entry.fromStatus ?? null, toStatus: entry.toStatus, changedAt: entry.changedAt, changedBy: entry.changedBy, reason: entry.reason ?? null }));
	}
	set statusHistory(entries: StatusHistoryEntry[]) {
		this.doc.statusHistory = entries.map((entry) => ({ ...entry }));
	}
}

export class EnrollmentRequestConverter extends MongooseSeedwork.MongoTypeConverter<
	Models.EnrollmentRequest.EnrollmentRequest,
	EnrollmentRequestDomainAdapter,
	Domain.Contexts.Passport,
	Domain.Contexts.Enrollment.EnrollmentRequest.EnrollmentRequest<EnrollmentRequestDomainAdapter>
> {
	constructor() {
		super(EnrollmentRequestDomainAdapter, Domain.Contexts.Enrollment.EnrollmentRequest.EnrollmentRequest);
	}
}
