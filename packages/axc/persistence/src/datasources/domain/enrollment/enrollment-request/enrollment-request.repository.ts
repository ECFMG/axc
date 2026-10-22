import { Domain } from '@axc/domain';
import type { Models } from '@axc/service-mongoose';
import { MongooseSeedwork } from '@cellix/mongoose-seedwork';
import type { EnrollmentRequestDomainAdapter } from './enrollment-request.domain-adapter.ts';

type EnrollmentRequestAggregate = Domain.Contexts.Enrollment.EnrollmentRequest.EnrollmentRequest<EnrollmentRequestDomainAdapter>;

export class EnrollmentRequestRepository
	extends MongooseSeedwork.MongoRepositoryBase<Models.EnrollmentRequest.EnrollmentRequest, EnrollmentRequestDomainAdapter, Domain.Contexts.Passport, EnrollmentRequestAggregate>
	implements Domain.Contexts.Enrollment.EnrollmentRequest.EnrollmentRequestRepository<EnrollmentRequestDomainAdapter>
{
	getNewInstance(input: Domain.Contexts.Enrollment.EnrollmentRequest.EnrollmentRequestNewInput): Promise<EnrollmentRequestAggregate> {
		const adapter = this.typeConverter.toAdapter(new this.model());
		return Promise.resolve(Domain.Contexts.Enrollment.EnrollmentRequest.EnrollmentRequest.getNewInstance(adapter, this.passport, input));
	}
}
