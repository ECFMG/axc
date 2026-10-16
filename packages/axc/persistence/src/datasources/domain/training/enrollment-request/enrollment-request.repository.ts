import { type Domain, Domain as Training } from '@axc/domain';
import { MongooseSeedwork } from '@cellix/mongoose-seedwork';
import { isObjectIdOrHexString } from 'mongoose';
import type { EnrollmentRequestDocument } from '../../../../models/training/enrollment-request.model.ts';
import type { EnrollmentRequestDomainAdapter } from './enrollment-request.domain-adapter.ts';
export class EnrollmentRequestRepository
	extends MongooseSeedwork.MongoRepositoryBase<
		EnrollmentRequestDocument,
		EnrollmentRequestDomainAdapter,
		Training.Contexts.Passport,
		Training.Contexts.Training.EnrollmentRequest.EnrollmentRequestAggregate<EnrollmentRequestDomainAdapter>
	>
	implements Domain.Contexts.Training.EnrollmentRequest.EnrollmentRequestRepository<EnrollmentRequestDomainAdapter>
{
	getNewInstance(input: Training.Contexts.Training.EnrollmentRequest.CreateEnrollmentRequest) {
		return Promise.resolve(Training.Contexts.Training.EnrollmentRequest.EnrollmentRequestAggregate.getNewInstance(this.typeConverter.toAdapter(new this.model()), input, this.passport));
	}
	async queryById(id: string) {
		if (!isObjectIdOrHexString(id)) {
			return undefined;
		}
		const doc = await this.model.findById(id).session(this.session).exec();
		return doc === null ? undefined : this.typeConverter.toDomain(doc, this.passport);
	}
	async hasActiveRequest(courseId: string, learnerEmail: string) {
		return (await this.model.exists({ courseId, learnerEmail: learnerEmail.toLowerCase(), status: { $in: Training.Contexts.Training.EnrollmentRequest.ACTIVE_ENROLLMENT_REQUEST_STATUSES } }).session(this.session)) !== null;
	}
	override async save(item: Training.Contexts.Training.EnrollmentRequest.EnrollmentRequestAggregate<EnrollmentRequestDomainAdapter>) {
		try {
			return await super.save(item);
		} catch (error) {
			if (typeof error === 'object' && error !== null && 'code' in error && error.code === 11000) {
				throw new Training.Contexts.Training.EnrollmentRequest.EnrollmentRequestError('DUPLICATE_ACTIVE_REQUEST');
			}
			throw error;
		}
	}
}
