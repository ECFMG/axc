import { Catalog } from '@axc/domain';

type EnrollmentRecord = Catalog.EnrollmentRequest.EnrollmentRequestProps;
class EnrollmentRequestDomainAdapter implements Catalog.EnrollmentRequest.EnrollmentRequestProps {
	readonly doc: EnrollmentRecord;
	constructor(doc: EnrollmentRecord) {
		this.doc = doc;
	}
	get id() {
		return this.doc.id;
	}
	get courseId() {
		return this.doc.courseId;
	}
	set courseId(v: string) {
		this.doc.courseId = v;
	}
	get learnerEmail() {
		return this.doc.learnerEmail;
	}
	set learnerEmail(v: string) {
		this.doc.learnerEmail = v;
	}
	get justification() {
		return this.doc.justification;
	}
	set justification(v: string) {
		this.doc.justification = v;
	}
	get status() {
		return this.doc.status;
	}
	set status(v: Catalog.EnrollmentRequest.EnrollmentStatus) {
		this.doc.status = v;
	}
	get createdAt() {
		return this.doc.createdAt;
	}
	set createdAt(v: string) {
		this.doc.createdAt = v;
	}
	get updatedAt() {
		return this.doc.updatedAt;
	}
	set updatedAt(v: string) {
		this.doc.updatedAt = v;
	}
	get statusHistory() {
		return this.doc.statusHistory;
	}
	set statusHistory(v: Catalog.EnrollmentRequest.StatusHistoryProps[]) {
		this.doc.statusHistory = v;
	}
}
export class EnrollmentRequestConverter {
	toAdapter(record: EnrollmentRecord): EnrollmentRequestDomainAdapter {
		return new EnrollmentRequestDomainAdapter(record);
	}
	toDomain(record: EnrollmentRecord): Catalog.EnrollmentRequest.EnrollmentRequest {
		return new Catalog.EnrollmentRequest.EnrollmentRequest(this.toAdapter(structuredClone(record)), undefined);
	}
	toPersistence(aggregate: Catalog.EnrollmentRequest.EnrollmentRequest): EnrollmentRecord {
		return structuredClone({
			id: aggregate.id,
			courseId: aggregate.courseId,
			learnerEmail: aggregate.learnerEmail,
			justification: aggregate.justification,
			status: aggregate.status,
			createdAt: aggregate.createdAt,
			updatedAt: aggregate.updatedAt,
			statusHistory: aggregate.statusHistory.map((item, i) => ({ id: `${aggregate.id}:${i + 1}`, fromStatus: item.fromStatus, toStatus: item.toStatus, changedAt: item.changedAt, changedBy: item.changedBy, reason: item.reason })),
		});
	}
}
