import { Training } from '@axc/domain';

type EnrollmentRecord = Training.EnrollmentRequest.EnrollmentRequestProps;
export class EnrollmentRequestDomainAdapter implements Training.EnrollmentRequest.EnrollmentRequestProps {
	public readonly doc: EnrollmentRecord;
	constructor(doc: EnrollmentRecord) {
		this.doc = doc;
	}
	get id() {
		return this.doc.id;
	}
	get courseId() {
		return this.doc.courseId;
	}
	set courseId(value: string) {
		this.doc.courseId = value;
	}
	get learnerEmail() {
		return this.doc.learnerEmail;
	}
	set learnerEmail(value: string) {
		this.doc.learnerEmail = value;
	}
	get justification() {
		return this.doc.justification;
	}
	set justification(value: string) {
		this.doc.justification = value;
	}
	get status() {
		return this.doc.status;
	}
	set status(value: EnrollmentRecord['status']) {
		this.doc.status = value;
	}
	get createdAt() {
		return this.doc.createdAt;
	}
	set createdAt(value: string) {
		this.doc.createdAt = value;
	}
	get updatedAt() {
		return this.doc.updatedAt;
	}
	set updatedAt(value: string) {
		this.doc.updatedAt = value;
	}
	get statusHistory() {
		return this.doc.statusHistory;
	}
	set statusHistory(value: EnrollmentRecord['statusHistory']) {
		this.doc.statusHistory = value;
	}
}
export class EnrollmentRequestConverter {
	toAdapter(record: EnrollmentRecord): EnrollmentRequestDomainAdapter {
		return new EnrollmentRequestDomainAdapter(structuredClone(record));
	}
	toDomain(record: EnrollmentRecord): Training.EnrollmentRequest.EnrollmentRequest<EnrollmentRequestDomainAdapter> {
		return new Training.EnrollmentRequest.EnrollmentRequest(this.toAdapter(record), undefined);
	}
	toRecord(aggregate: Training.EnrollmentRequest.EnrollmentRequest<EnrollmentRequestDomainAdapter>): EnrollmentRecord {
		return structuredClone(aggregate.props.doc);
	}
}
