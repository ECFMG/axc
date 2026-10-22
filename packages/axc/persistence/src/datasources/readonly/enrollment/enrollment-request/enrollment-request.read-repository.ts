import type { Models } from '@axc/service-mongoose';
import type { FilterQuery } from 'mongoose';
import { isObjectIdString } from '../../mongo-data-source.ts';
import type { EnrollmentRequestDataSource } from './enrollment-request.data.ts';

type EnrollmentRequestDoc = Models.EnrollmentRequest.EnrollmentRequest;
type EnrollmentRequestStatus = EnrollmentRequestDoc['status'];

export interface EnrollmentRequestSearchCriteria {
	status?: EnrollmentRequestStatus;
	courseId?: string;
	learnerEmail?: string;
	page: number;
	pageSize: number;
}

export interface EnrollmentRequestReadModel {
	id: string;
	courseId: string;
	learnerEmail: string;
	justification: string;
	status: EnrollmentRequestStatus;
	createdAt: Date;
	updatedAt: Date;
	statusHistory: Array<{ fromStatus: EnrollmentRequestStatus | null; toStatus: EnrollmentRequestStatus; changedAt: Date; changedBy: string; reason: string | null }>;
}

interface EnrollmentRequestReadRepository {
	search(criteria: EnrollmentRequestSearchCriteria): Promise<{ items: EnrollmentRequestReadModel[]; totalItems: number }>;
	getById(id: string): Promise<EnrollmentRequestReadModel | null>;
	hasActiveRequest(courseId: string, learnerEmail: string): Promise<boolean>;
}

const toReadModel = (doc: EnrollmentRequestDoc): EnrollmentRequestReadModel => ({
	id: String(doc._id),
	courseId: doc.courseId,
	learnerEmail: doc.learnerEmail,
	justification: doc.justification,
	status: doc.status,
	createdAt: doc.createdAt,
	updatedAt: doc.updatedAt,
	statusHistory: doc.statusHistory.map((entry) => ({ fromStatus: entry.fromStatus ?? null, toStatus: entry.toStatus, changedAt: entry.changedAt, changedBy: entry.changedBy, reason: entry.reason ?? null })),
});

export class EnrollmentRequestReadRepositoryImpl implements EnrollmentRequestReadRepository {
	private readonly dataSource: EnrollmentRequestDataSource;

	constructor(dataSource: EnrollmentRequestDataSource) {
		this.dataSource = dataSource;
	}

	async search(criteria: EnrollmentRequestSearchCriteria): Promise<{ items: EnrollmentRequestReadModel[]; totalItems: number }> {
		const filter: FilterQuery<EnrollmentRequestDoc> = {};
		if (criteria.status !== undefined) {
			filter.status = criteria.status;
		}
		if (criteria.courseId !== undefined) {
			filter.courseId = criteria.courseId;
		}
		if (criteria.learnerEmail !== undefined) {
			// Emails are stored lowercase.
			filter.learnerEmail = criteria.learnerEmail.toLowerCase();
		}
		const [docs, totalItems] = await Promise.all([this.dataSource.find(filter, { sort: { createdAt: 1, _id: 1 }, skip: (criteria.page - 1) * criteria.pageSize, limit: criteria.pageSize }), this.dataSource.count(filter)]);
		return { items: docs.map(toReadModel), totalItems };
	}

	async getById(id: string): Promise<EnrollmentRequestReadModel | null> {
		if (!isObjectIdString(id)) {
			return null;
		}
		const [doc] = await this.dataSource.find({ _id: id }, { limit: 1 });
		return doc ? toReadModel(doc) : null;
	}

	/** A learner may hold at most one pending or approved request per course. */
	async hasActiveRequest(courseId: string, learnerEmail: string): Promise<boolean> {
		return (await this.dataSource.count({ courseId, learnerEmail: learnerEmail.toLowerCase(), status: { $in: ['pending', 'approved'] } })) > 0;
	}
}
