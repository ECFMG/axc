import type { EnrollmentRequest, EnrollmentRequestModelType } from '@axc/data-sources-mongoose-models';
import type { Domain } from '@axc/domain';
import type { FilterQuery } from 'mongoose';
import { EnrollmentRequestConverter } from '../../../domain/enrollment/enrollment-request/enrollment-request.domain-adapter.ts';
import type { FindOneOptions, FindOptions } from '../../mongo-data-source.ts';
import { type EnrollmentRequestDataSource, EnrollmentRequestDataSourceImpl } from './enrollment-request.data.ts';

export interface EnrollmentRequestReadRepository {
	getAll: (options?: FindOptions) => Promise<Domain.Contexts.Enrollment.EnrollmentRequest.EnrollmentRequestEntityReference[]>;
	getById: (id: string, options?: FindOneOptions) => Promise<Domain.Contexts.Enrollment.EnrollmentRequest.EnrollmentRequestEntityReference | null>;
	findMatching: (criteria: { status?: string; courseId?: string; learnerEmail?: string }) => Promise<Domain.Contexts.Enrollment.EnrollmentRequest.EnrollmentRequestEntityReference[]>;
	findActive: (courseId: string, learnerEmail: string) => Promise<Domain.Contexts.Enrollment.EnrollmentRequest.EnrollmentRequestEntityReference | null>;
}

export class EnrollmentRequestReadRepositoryImpl implements EnrollmentRequestReadRepository {
	private readonly mongoDataSource: EnrollmentRequestDataSource;
	private readonly converter: EnrollmentRequestConverter;
	private readonly passport: Domain.Passport;

	constructor(models: { EnrollmentRequest: EnrollmentRequestModelType }, passport: Domain.Passport) {
		this.mongoDataSource = new EnrollmentRequestDataSourceImpl(models.EnrollmentRequest);
		this.converter = new EnrollmentRequestConverter();
		this.passport = passport;
	}

	async getAll(options?: FindOptions): Promise<Domain.Contexts.Enrollment.EnrollmentRequest.EnrollmentRequestEntityReference[]> {
		const result = await this.mongoDataSource.find({}, options);
		return result.map((doc) => this.converter.toDomain(doc, this.passport));
	}

	async findMatching(criteria: { status?: string; courseId?: string; learnerEmail?: string }): Promise<Domain.Contexts.Enrollment.EnrollmentRequest.EnrollmentRequestEntityReference[]> {
		const filter: FilterQuery<EnrollmentRequest> = {};
		if (criteria.status !== undefined) {
			filter.status = criteria.status;
		}
		if (criteria.courseId !== undefined) {
			filter.courseId = criteria.courseId;
		}
		if (criteria.learnerEmail !== undefined) {
			filter.learnerEmail = criteria.learnerEmail;
		}
		const docs = await this.mongoDataSource.find(filter, { sort: { createdAt: 1 } });
		return docs.map((doc) => this.converter.toDomain(doc, this.passport));
	}

	async findActive(courseId: string, learnerEmail: string): Promise<Domain.Contexts.Enrollment.EnrollmentRequest.EnrollmentRequestEntityReference | null> {
		const filter: FilterQuery<EnrollmentRequest> = {
			courseId,
			learnerEmail,
			status: { $in: ['pending', 'approved'] },
		};
		const docs = await this.mongoDataSource.find(filter, { limit: 1 });
		const found = docs[0];
		if (!found) {
			return null;
		}
		return this.converter.toDomain(found, this.passport);
	}

	async getById(id: string, options?: FindOneOptions): Promise<Domain.Contexts.Enrollment.EnrollmentRequest.EnrollmentRequestEntityReference | null> {
		const result = await this.mongoDataSource.findById(id, options);
		if (!result) {
			return null;
		}
		return this.converter.toDomain(result, this.passport);
	}
}

export const getEnrollmentRequestReadRepository = (models: { EnrollmentRequest: EnrollmentRequestModelType }, passport: Domain.Passport): EnrollmentRequestReadRepository => {
	return new EnrollmentRequestReadRepositoryImpl(models, passport);
};
