import type { EnrollmentRequest } from '@axc/data-sources-mongoose-models';
import { Domain } from '@axc/domain';
import { MongooseSeedwork } from '@cellix/mongoose-seedwork';

// biome-ignore format: Cellix matches MongoTypeConverter<EnrollmentRequest, on one line
export class EnrollmentRequestConverter extends MongooseSeedwork.MongoTypeConverter<EnrollmentRequest, EnrollmentRequestDomainAdapter, Domain.Passport, Domain.Contexts.Enrollment.EnrollmentRequest.EnrollmentRequest<EnrollmentRequestDomainAdapter>> {
	constructor() {
		super(EnrollmentRequestDomainAdapter, Domain.Contexts.Enrollment.EnrollmentRequest.EnrollmentRequest);
	}
}

export class EnrollmentRequestDomainAdapter extends MongooseSeedwork.MongooseDomainAdapter<EnrollmentRequest> implements Domain.Contexts.Enrollment.EnrollmentRequest.EnrollmentRequestProps {
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
	get status(): string {
		return this.doc.status;
	}
	set status(status: string) {
		this.doc.status = status;
	}
	get statusHistory(): Domain.Contexts.Enrollment.EnrollmentRequest.EnrollmentRequestProps['statusHistory'] {
		return (this.doc.statusHistory ?? []).map((entry) => ({
			fromStatus: entry.fromStatus ?? null,
			toStatus: entry.toStatus,
			changedAt: entry.changedAt,
			changedBy: entry.changedBy,
			reason: entry.reason ?? null,
		}));
	}
	set statusHistory(statusHistory: Domain.Contexts.Enrollment.EnrollmentRequest.EnrollmentRequestProps['statusHistory']) {
		this.doc.statusHistory = statusHistory.map((entry) => ({
			fromStatus: entry.fromStatus,
			toStatus: entry.toStatus,
			changedAt: entry.changedAt,
			changedBy: entry.changedBy,
			reason: entry.reason,
		}));
	}
}
