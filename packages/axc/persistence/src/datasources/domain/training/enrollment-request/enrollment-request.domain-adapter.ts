import { Domain } from '@axc/domain';
import { MongooseSeedwork } from '@cellix/mongoose-seedwork';
import type { EnrollmentRequestDocument } from '../../../../models/training/enrollment-request.model.ts';
export class EnrollmentRequestDomainAdapter extends MongooseSeedwork.MongooseDomainAdapter<EnrollmentRequestDocument> implements Domain.Contexts.Training.EnrollmentRequest.EnrollmentRequestProps {
	get courseId() {
		return this.doc.courseId;
	}
	set courseId(value) {
		this.doc.courseId = value;
	}
	get learnerEmail() {
		return this.doc.learnerEmail;
	}
	set learnerEmail(value) {
		this.doc.learnerEmail = value;
	}
	get justification() {
		return this.doc.justification;
	}
	set justification(value) {
		this.doc.justification = value;
	}
	get status() {
		return this.doc.status;
	}
	set status(value) {
		this.doc.status = value;
	}
	override get createdAt() {
		return this.doc.createdAt;
	}
	override set createdAt(value) {
		this.doc.createdAt = value;
	}
	override get updatedAt() {
		return this.doc.updatedAt;
	}
	override set updatedAt(value) {
		this.doc.updatedAt = value;
	}
	get statusHistory() {
		return this.doc.statusHistory;
	}
	set statusHistory(value) {
		this.doc.statusHistory = value;
	}
}
export class EnrollmentRequestConverter extends MongooseSeedwork.MongoTypeConverter<
	EnrollmentRequestDocument,
	EnrollmentRequestDomainAdapter,
	Domain.Contexts.Passport,
	Domain.Contexts.Training.EnrollmentRequest.EnrollmentRequestAggregate<EnrollmentRequestDomainAdapter>
> {
	constructor() {
		super(EnrollmentRequestDomainAdapter, Domain.Contexts.Training.EnrollmentRequest.EnrollmentRequestAggregate);
	}
}
