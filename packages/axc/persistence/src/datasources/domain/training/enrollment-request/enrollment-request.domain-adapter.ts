import { Domain } from '@axc/domain';
import { MongooseSeedwork } from '@cellix/mongoose-seedwork';
import type { EnrollmentRequestDocument } from '../../../../models/training/enrollment-request.model.ts';
export class EnrollmentRequestDomainAdapter extends MongooseSeedwork.MongooseDomainAdapter<EnrollmentRequestDocument> implements Domain.Contexts.Training.EnrollmentRequest.EnrollmentRequestProps {
	get record() {
		return this.doc.record;
	}
	set record(value: Domain.Contexts.Training.EnrollmentRequest.EnrollmentRequestRecord) {
		this.doc.record = value;
		this.doc.markModified('record');
	}
}
export class EnrollmentRequestConverter extends MongooseSeedwork.MongoTypeConverter<
	EnrollmentRequestDocument,
	EnrollmentRequestDomainAdapter,
	undefined,
	Domain.Contexts.Training.EnrollmentRequest.EnrollmentRequest<EnrollmentRequestDomainAdapter>
> {
	constructor() {
		super(EnrollmentRequestDomainAdapter, Domain.Contexts.Training.EnrollmentRequest.EnrollmentRequest);
	}
}
