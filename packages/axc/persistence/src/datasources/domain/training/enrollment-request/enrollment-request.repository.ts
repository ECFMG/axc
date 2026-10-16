import { type Domain, Domain as DomainTypes } from '@axc/domain';
import { MongooseSeedwork } from '@cellix/mongoose-seedwork';
import type { EnrollmentRequestDocument } from '../../../../models/training/enrollment-request.model.ts';
import type { EnrollmentRequestDomainAdapter } from './enrollment-request.domain-adapter.ts';
export class EnrollmentRequestRepository
	extends MongooseSeedwork.MongoRepositoryBase<EnrollmentRequestDocument, EnrollmentRequestDomainAdapter, undefined, DomainTypes.Contexts.Training.EnrollmentRequest.EnrollmentRequest<EnrollmentRequestDomainAdapter>>
	implements Domain.Contexts.Training.EnrollmentRequest.EnrollmentRequestRepository
{
	getNewInstance(input: Domain.Contexts.Training.EnrollmentRequest.CreateEnrollmentRequestInput, id: string, now: string) {
		const adapter = this.typeConverter.toAdapter(new this.model());
		const aggregate = DomainTypes.Contexts.Training.EnrollmentRequest.EnrollmentRequest.getNewInstance(adapter, input, id, now, undefined);
		return Promise.resolve(aggregate);
	}
	async findById(id: string) {
		const document = await this.model.findOne({ 'record.id': id }).session(this.session).exec();
		return document === null ? undefined : this.typeConverter.toDomain(document, undefined);
	}
}
