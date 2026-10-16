import type { EnrollmentRequest } from '@axc/data-sources-mongoose-models';
import { Domain } from '@axc/domain';
import { MongooseSeedwork } from '@cellix/mongoose-seedwork';
import { isValidObjectId } from 'mongoose';
import type { EnrollmentRequestDomainAdapter } from './enrollment-request.domain-adapter.ts';

export class EnrollmentRequestRepository
	extends MongooseSeedwork.MongoRepositoryBase<EnrollmentRequest, EnrollmentRequestDomainAdapter, Domain.Passport, Domain.Contexts.Enrollment.EnrollmentRequest.EnrollmentRequest<EnrollmentRequestDomainAdapter>>
	implements Domain.Contexts.Enrollment.EnrollmentRequest.EnrollmentRequestRepository<EnrollmentRequestDomainAdapter>
{
	async getById(id: string): Promise<Domain.Contexts.Enrollment.EnrollmentRequest.EnrollmentRequest<EnrollmentRequestDomainAdapter>> {
		if (!isValidObjectId(id)) {
			throw new Error('ENROLLMENT_REQUEST_NOT_FOUND');
		}
		const document = await this.model.findById(id).exec();
		if (!document) {
			throw new Error('ENROLLMENT_REQUEST_NOT_FOUND');
		}
		return this.typeConverter.toDomain(document, this.passport);
	}

	getNewInstance(input: { courseId: string; learnerEmail: string; justification: string }): Promise<Domain.Contexts.Enrollment.EnrollmentRequest.EnrollmentRequest<EnrollmentRequestDomainAdapter>> {
		const adapter = this.typeConverter.toAdapter(new this.model());
		return Promise.resolve(Domain.Contexts.Enrollment.EnrollmentRequest.EnrollmentRequest.getNewInstance(adapter, input, this.passport));
	}
}
